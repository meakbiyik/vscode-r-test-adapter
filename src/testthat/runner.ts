import * as util from "util";
import * as path from "path";
import * as winreg from "winreg";
import * as fs from "fs";
import * as tmp from "tmp-promise";
import { spawn } from "child_process";
import * as vscode from "vscode";
import { encodeNodeId } from "./util";
import { DebugChannel, ProcessChannel } from "../streams"; // Adjust the path as needed
import { ItemType, TestingTools } from "../util";
import { appendFile as _appendFile } from "fs";
import { lookpath } from "lookpath";
import { TestResult } from "./reporter";
import { v4 as uuid } from "uuid";

const appendFile = util.promisify(_appendFile);
const testReporterPath = path
    .join(__dirname, "..", "..", "..", "src", "testthat", "reporter")
    .replace(/\\/g, "/");
const workspaceFolder = vscode.workspace.workspaceFolders![0].uri.fsPath
    .replace(/\\/g, "/");
let RscriptPath: string | undefined;

async function runTest(
    testingTools: TestingTools,
    run: vscode.TestRun,
    test: vscode.TestItem,
    isDebugMode: boolean = false
): Promise<string> {
    const getType = (testItem: vscode.TestItem) =>
        testingTools.testItemData.get(testItem)!.itemType;

    let isWholeFile = getType(test) === ItemType.File;

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
    const source = await getEntryPointSource(testingTools, test, isDebugMode, isWholeFile);

    await appendFile(tmpFilePath, source);

    return executeTest(testingTools, run, test, tmpFilePath, isDebugMode)
        .catch(async (err) => {
            await tmpFileResult.cleanup();
            throw err;
        })
        .then(async (value) => {
            await tmpFileResult.cleanup();
            return value;
        });
}

async function executeTest(
    testingTools: TestingTools,
    run: vscode.TestRun,
    test: vscode.TestItem,
    filePath: string,
    isDebugMode: boolean
): Promise<string> {
    let cleanFilePath = filePath.replace(/\\/g, "/");
    let RscriptCommand = await getRscriptCommand(testingTools);
    let command = `${RscriptCommand} ${filePath}`;
    let cwd = vscode.workspace.workspaceFolders![0];

    // Use DebugChannel for debug mode to capture detailed debugging information,
    // and ProcessChannel for normal mode to execute the test script as a subprocess.
    let eventStream = isDebugMode ? new DebugChannel(testingTools, cwd, cleanFilePath) : new ProcessChannel(command, cwd);

    let testStartDates = new WeakMap<vscode.TestItem, number>();
    return new Promise<string>((resolve, reject) => {
        let runOutput = "";

        eventStream
            .on("test_result", function (data: TestResult) {
                runOutput += JSON.stringify(data) + "\n";
                switch (data.type) {
                    case "start_test":
                        if (data.test !== undefined) {
                            let testItem: undefined | vscode.TestItem = findTestRecursively(
                                encodeNodeId(test.uri!.fsPath, data.test),
                                test
                            ) ?? test;
                            if (testItem === undefined) {
                                reject(
                                    `Test with id ${encodeNodeId(
                                        test.uri!.fsPath,
                                        data.test
                                    )} could not be found. Please report this.`
                                );
                                break;
                            }
                            if (!testItem.id.includes(data.test)) {
                                break;
                            }
                            testStartDates.set(testItem!, Date.now());
                            run.started(testItem!);
                        }
                        break;
                    case "add_result":
                        if (data.result !== undefined && data.test !== undefined) {
                            let testItem: undefined | vscode.TestItem = findTestRecursively(
                                encodeNodeId(test.uri!.fsPath, data.test),
                                test
                            ) ?? test;
                            if (testItem === undefined) {
                                reject(
                                    `Test with id ${encodeNodeId(
                                        test.uri!.fsPath,
                                        data.test
                                    )} could not be found. Please report this.`
                                );
                                break;
                            }
                            if (vscode.debug.activeDebugSession != undefined && !isDebugMode) {
                                vscode.window.showWarningMessage("Got a debugging session while not in debug mode. " +
                                    "Please report this.");
                                break;
                            }
                            if (!testItem.id.includes(data.test)) {
                                // Silently ignore the test result if the test item id does not match
                                break;
                            }
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
            })
            .on("end", () => {
                if (runOutput.includes("Execution halted")) {
                    reject(Error(runOutput));
                }
                run.end();
                resolve(runOutput);
            })
            .on("error", () => {
                run.end();
                reject(Error(runOutput));
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

// This function returns the 'entry point' for the R test.
// The entry point hacks the testthat package to disable any other test.
// This way the user has a seamless experience when running the test
// both in the normal and debug mode.
async function getEntryPointSource(
    testingTools: TestingTools,
    test: vscode.TestItem,
    isDebug: boolean = false,
    isWholeFile: boolean) {

    let RscriptCommand = await getRscriptCommand(testingTools);
    let { major, minor } = await getDevtoolsVersion(testingTools, RscriptCommand);
    let devtoolsMethod = major == 2 && minor < 4 ? "test_file" : "test_active_file";

    let isDescribe = false;
    // This if statement sanitizes the 'test' argument.
    // 1) for describe(...) tests: retrieve the describe() expression, if the original test is an it(...) expression
    // 2) for test_that(...) tests:  does nothing
    if (test.parent != undefined && test.parent.parent != undefined) {
        test = test.parent;
        isDescribe = true;
    }
    const testLabel = test?.label;
    const testPath = test?.uri!.fsPath
        .replace(/\\/g, "/");

    return `
# NOTE! This file has been generated automatically. Modification has no effect.
# Entry point for the '${test.id}' test...

TEST_THAT <- "test_that"
DESCRIBE <- "describe"
IS_DESCRIBE <- ${Number(isDescribe)}
IS_DEBUG <- ${Number(isDebug)}
IS_WHOLE_FILE_TEST <- ${Number(isWholeFile)}

testthat <- loadNamespace('testthat')
new_describe <- function(...) { }
new_test_that <- function(...) { }

if (!IS_WHOLE_FILE_TEST) {
    if (IS_DESCRIBE) {
        orig_describe <- testthat::describe
        new_describe <- function(desc, ...) {
            if ('${testLabel}' == desc) {
                orig_describe(desc, ...)
            }
        }

    } else {
        orig_test_that <- testthat::test_that
        new_test_that <- function(desc, ...) {
            if ('${testLabel}' == desc) {
                orig_test_that(desc, ...)
            }
        }
    }

    unlockBinding(DESCRIBE, testthat)
    assignInNamespace(DESCRIBE, new_describe, ns = 'testthat')
    assign(DESCRIBE, new_describe, envir = .GlobalEnv)
    lockBinding(DESCRIBE, testthat)

    unlockBinding(TEST_THAT, testthat)
    assignInNamespace(TEST_THAT, new_test_that, ns = 'testthat')
    assign(TEST_THAT, new_test_that, envir = .GlobalEnv)
    lockBinding(TEST_THAT, testthat)

}

library(devtools)
devtools::load_all('${testReporterPath}')
if (IS_DEBUG) {
    .vsc.load_all('${workspaceFolder}')
    with_reporter(VSCodeReporter, {
        .vsc.debugSource('${testPath}')
    })
} else {
    devtools::load_all('${workspaceFolder}')
    devtools::${devtoolsMethod}('${testPath}', reporter=VSCodeReporter)
}
`;
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
        } catch (e) { }
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
        vscode
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
