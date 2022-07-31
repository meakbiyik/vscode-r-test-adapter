import * as util from "util";
import * as path from "path";
import * as winreg from "winreg";
import * as fs from "fs";
import * as tmp from "tmp-promise";
import { spawn } from "child_process";
import * as vscode from "vscode";
import * as split2 from "split2";
import { encodeNodeId } from "./util";
import { ItemType, TestingTools } from "../util";
import { appendFile as _appendFile } from "fs";
import { lookpath } from "lookpath";
import { TestResult } from "./reporter";
import testthatParser from "./parser";
import { v4 as uuid } from "uuid";

const appendFile = util.promisify(_appendFile);
const testReporterPath = path
    .join(__dirname, "..", "..", "..", "src", "testthat", "reporter")
    .replace(/\\/g, "/");
let RscriptPath: string | undefined;

async function runTest(
    testingTools: TestingTools,
    run: vscode.TestRun,
    test: vscode.TestItem
): Promise<string> {
    const getType = (testItem: vscode.TestItem) =>
        testingTools.testItemData.get(testItem)!.itemType;

    switch (getType(test)) {
        case ItemType.File:
            testingTools.log.info("Test type is file");
            // If we're running a file and don't know what it contains yet, parse it now
            if (test.children.size === 0) {
                testingTools.log.info("Children are not yet available. Parsing children.");
                await testthatParser(testingTools, test);
            }
            // Run the file - it is faster than running tests one by one
            testingTools.log.info("Run test file as a whole.");
            return runSingleTestFile(testingTools, run, test, test.uri!.fsPath, false);
        case ItemType.TestCase:
            if (test.children.size === 0) {
                testingTools.log.info("Test type is test case and a single test");
                return runSingleTest(testingTools, run, test);
            } else {
                testingTools.log.info("Test type is test case and a describe suite");
                return runDescribeTestSuite(testingTools, run, test);
            }
    }
}

async function runSingleTestFile(
    testingTools: TestingTools,
    run: vscode.TestRun,
    test: vscode.TestItem,
    filePath: string,
    isSingleTest: boolean
): Promise<string> {
    testingTools.log.info(
        `Started running${isSingleTest ? " single" : ""} test file in path ${filePath}`
    );
    let cleanFilePath = filePath.replace(/\\/g, "/");
    let projectDirMatch = cleanFilePath.match(/(.+?)\/tests\/testthat.+?/i);
    let RscriptCommand = await getRscriptCommand(testingTools);
    let { major, minor, patch } = await getDevtoolsVersion(testingTools, RscriptCommand);
    if (major < 2 || (major == 2 && minor < 3) || (major == 2 && minor == 3 && patch < 2)) {
        return Promise.reject(
            Error(
                "Devtools version too old. RTestAdapter requires devtools>=2.3.2" +
                    "to be installed in the Rscript environment"
            )
        );
    }
    let devtoolsMethod = major == 2 && minor < 4 ? "test_file" : "test_active_file";
    let devtoolsCall =
        `devtools::load_all('${testReporterPath}');` +
        `devtools::${devtoolsMethod}('${cleanFilePath}',reporter=VSCodeReporter)`;
    let command = `${RscriptCommand} -e "${devtoolsCall}"`;
    let cwd = projectDirMatch
        ? projectDirMatch[1]
        : vscode.workspace.workspaceFolders![0].uri.fsPath;
    testingTools.log.info(`Running test file in path ${filePath} in working directory ${cwd}`);
    return new Promise<string>(async (resolve, reject) => {
        let childProcess = spawn(command, { cwd, shell: true });
        let stdout = "";
        let testStartDates = new WeakMap<vscode.TestItem, number>();
        childProcess.stdout!.pipe(split2(JSON.parse)).on("data", (data: TestResult) => {
            stdout += JSON.stringify(data);
            switch (data.type) {
                case "start_test":
                    if (data.test !== undefined) {
                        let testItem = isSingleTest
                            ? test
                            : findTestRecursively(encodeNodeId(test.uri!.fsPath, data.test), test);
                        if (testItem === undefined)
                            reject(
                                `Test with id ${encodeNodeId(
                                    test.uri!.fsPath,
                                    data.test
                                )} could not be found. Please report this.`
                            );
                        testStartDates.set(testItem!, Date.now());
                        run.started(testItem!);
                    }
                    break;
                case "add_result":
                    if (data.result !== undefined && data.test !== undefined) {
                        let testItem = isSingleTest
                            ? test
                            : findTestRecursively(encodeNodeId(test.uri!.fsPath, data.test), test);
                        if (testItem === undefined)
                            reject(
                                `Test with id ${encodeNodeId(
                                    test.uri!.fsPath,
                                    data.test
                                )} could not be found. Please report this.`
                            );
                        let duration = Date.now() - testStartDates.get(testItem!)!;
                        switch (data.result) {
                            case "success":
                            case "warning":
                                run.passed(testItem!, duration);
                                if (data.message) {
                                    run.appendOutput(data.message, undefined, testItem);
                                }
                                break;
                            case "failure":
                                run.failed(
                                    testItem!,
                                    new vscode.TestMessage(data.message!),
                                    duration
                                );
                                break;
                            case "skip":
                                run.skipped(testItem!);
                                if (data.message) {
                                    run.appendOutput(data.message, undefined, testItem);
                                }
                                break;
                            case "error":
                                run.errored(
                                    testItem!,
                                    new vscode.TestMessage(data.message!),
                                    duration
                                );
                                break;
                        }
                    }
                    break;
            }
        });
        childProcess.once("exit", () => {
            stdout += childProcess.stderr.read();
            if (stdout.includes("Execution halted")) {
                reject(Error(stdout));
            }
            resolve(stdout);
        });
        childProcess.once("error", (err) => {
            reject(err);
        });
    });
}

function findTestRecursively(testIdToFind: string, testToSearch: vscode.TestItem) {
    let testFound: vscode.TestItem | undefined = undefined;
    testToSearch.children.forEach((childTest: vscode.TestItem) => {
        if (testFound === undefined) {
            testFound =
                testIdToFind == childTest.id
                    ? childTest
                    : findTestRecursively(testIdToFind, childTest);
        }
    });
    return testFound;
}

async function runDescribeTestSuite(
    testingTools: TestingTools,
    run: vscode.TestRun,
    test: vscode.TestItem
) {
    let documentUri = test.uri!;
    let document = await vscode.workspace.openTextDocument(documentUri);
    let source = document.getText();

    let testFileItem = testingTools.controller.items.get(test.uri!.path)!;
    testFileItem.children.forEach((siblingTest: vscode.TestItem) => {
        let testRange = siblingTest.range!;
        let testStartIndex = document.offsetAt(testRange.start);
        let testEndIndex = document.offsetAt(testRange.end);
        if (siblingTest.id != test.id) {
            source =
                source.slice(0, testStartIndex) +
                " ".repeat(testEndIndex - testStartIndex) +
                source.slice(testEndIndex);
        }
    });
    source = source.slice(0, document.offsetAt(test.range!.end));

    const testRunId = uuid();
    let tmpFileName = `test-${testRunId}.R`;
    let tmpFilePath = path.normalize(path.join(path.dirname(test.uri!.fsPath), tmpFileName));
    // Do not clean up tempFilePaths, not possible to get around the race condition
    testingTools.tempFilePaths.push(tmpFilePath);
    // cleanup is not guaranteed to unlink the file immediately
    let tmpFileResult = await tmp.file({
        name: tmpFileName,
        tmpdir: path.dirname(test.uri!.fsPath),
    });
    await appendFile(tmpFilePath, source);
    return runSingleTestFile(testingTools, run, test, tmpFilePath, true)
        .catch(async (err) => {
            await tmpFileResult.cleanup();
            throw err;
        })
        .then(async (value) => {
            await tmpFileResult.cleanup();
            return value;
        });
}

async function runSingleTest(
    testingTools: TestingTools,
    run: vscode.TestRun,
    test: vscode.TestItem
) {
    let documentUri = test.uri!;
    let document = await vscode.workspace.openTextDocument(documentUri);
    let source = document.getText();

    let parentTest: vscode.TestItem | undefined;
    let testFileItem = testingTools.controller.items.get(test.uri!.path)!;
    testFileItem.children.forEach((siblingTest: vscode.TestItem) => {
        let testRange = siblingTest.range!;
        let testStartIndex = document.offsetAt(testRange.start);
        let testEndIndex = document.offsetAt(testRange.end);
        if (siblingTest.id != test.id) {
            if (siblingTest.children.get(test.id) !== undefined) {
                // Handle tests inside describe test suites
                parentTest = siblingTest;
                siblingTest.children.forEach((closeSiblingTest: vscode.TestItem) => {
                    if (closeSiblingTest.id != test.id) {
                        testRange = closeSiblingTest.range!;
                        testStartIndex = document.offsetAt(testRange.start);
                        testEndIndex = document.offsetAt(testRange.end);
                        source =
                            source.slice(0, testStartIndex) +
                            " ".repeat(testEndIndex - testStartIndex) +
                            source.slice(testEndIndex!);
                    }
                });
            } else {
                source =
                    source.slice(0, testStartIndex) +
                    " ".repeat(testEndIndex - testStartIndex) +
                    source.slice(testEndIndex!);
            }
        }
    });
    let lastIndex;
    if (parentTest !== undefined) {
        lastIndex = document.offsetAt(parentTest.range!.end);
    } else {
        lastIndex = document.offsetAt(test.range!.end);
    }
    source = source.slice(0, lastIndex);

    const testRunId = uuid();
    let tmpFileName = `test-${testRunId}.R`;
    let tmpFilePath = path.normalize(path.join(path.dirname(test.uri!.fsPath), tmpFileName));
    // Do not clean up tempFilePaths, not possible to get around the race condition
    testingTools.tempFilePaths.push(tmpFilePath);
    // cleanup is not guaranteed to unlink the file immediately
    let tmpFileResult = await tmp.file({
        name: tmpFileName,
        tmpdir: path.dirname(test.uri!.fsPath),
    });
    await appendFile(tmpFilePath, source);
    return runSingleTestFile(testingTools, run, test, tmpFilePath, true)
        .catch(async (err) => {
            await tmpFileResult.cleanup();
            throw err;
        })
        .then(async (value) => {
            await tmpFileResult.cleanup();
            return value;
        });
}

async function getRscriptCommand(testingTools: TestingTools) {
    let config = vscode.workspace.getConfiguration("RTestAdapter");
    let configPath: string | undefined = config.get("RscriptPath");
    if (configPath !== undefined && configPath !== null) {
        if ((<string>configPath).length > 0 && fs.existsSync(configPath)) {
            testingTools.log.info(`Using Rscript in the configuration: ${configPath}`);
            return Promise.resolve(`"${configPath}"`);
        } else {
            testingTools.log.warn(
                `Rscript path given in the configuration ${configPath} is invalid. ` +
                    `Falling back to defaults.`
            );
        }
    }
    if (RscriptPath !== undefined) {
        testingTools.log.info(`Using previously detected Rscript path: ${RscriptPath}`);
        return Promise.resolve(`"${RscriptPath}"`);
    }
    RscriptPath = await lookpath("Rscript");
    if (RscriptPath !== undefined) {
        testingTools.log.info(`Found Rscript in PATH: ${RscriptPath}`);
        return Promise.resolve(`"${RscriptPath}"`);
    }
    if (process.platform != "win32") {
        let candidates = ["/usr/bin", "/usr/local/bin"];
        for (const candidate of candidates) {
            let possibleRscriptPath = path.join(candidate, "Rscript");
            if (fs.existsSync(possibleRscriptPath)) {
                testingTools.log.info(
                    `found Rscript among candidate paths: ${possibleRscriptPath}`
                );
                RscriptPath = possibleRscriptPath;
                return Promise.resolve(`"${RscriptPath}"`);
            }
        }
    } else {
        try {
            const key = new winreg({
                hive: winreg.HKLM,
                key: "\\Software\\R-Core\\R",
            });
            const item: winreg.RegistryItem = await new Promise((resolve, reject) =>
                key.get("InstallPath", (err, result) => (err ? reject(err) : resolve(result)))
            );

            const rhome = item.value;

            let possibleRscriptPath = rhome + "\\bin\\Rscript.exe";
            if (fs.existsSync(possibleRscriptPath)) {
                testingTools.log.info(`found Rscript in registry: ${possibleRscriptPath}`);
                RscriptPath = possibleRscriptPath;
                return Promise.resolve(`"${RscriptPath}"`);
            }
        } catch (e) {}
    }
    throw Error("Rscript could not be found in PATH, cannot run the tests.");
}

async function getDevtoolsVersion(
    testingTools: TestingTools,
    RscriptCommand: string
): Promise<{ major: number; minor: number; patch: number }> {
    return new Promise(async (resolve, reject) => {
        let childProcess = spawn(
            `${RscriptCommand} -e "suppressMessages(library('devtools'));` +
                `packageVersion('devtools')"`,
            {
                shell: true,
            }
        );
        let stdout = "";
        childProcess.once("exit", () => {
            stdout += childProcess.stdout.read() + "\n" + childProcess.stderr.read();
            let version = stdout.match(/(\d*)\.(\d*)\.(\d*)/i);
            if (version !== null) {
                testingTools.log.info(`devtools version: ${version[0]}`);
                const major = parseInt(version[1]);
                const minor = parseInt(version[2]);
                const patch = parseInt(version[3]);
                resolve({ major, minor, patch });
            } else {
                reject(Error("devtools version could not be detected. Output:\n" + stdout));
            }
        });
        childProcess.once("error", (err) => {
            reject(err);
        });
    });
}

export default runTest;

const _unittestable = {
    getRscriptCommand,
    getDevtoolsVersion,
};
export { _unittestable };
