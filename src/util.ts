import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import { lookpath } from "lookpath";
import { appendFile as _appendFile } from "fs";
import * as fs from "fs";
import * as path from "path";
import * as winreg from "winreg";
import { spawn } from "child_process";

export const R_DEBUGGER_EXTENSION_ID = "rdebugger.r-debugger";

export const ANSI = {
    reset: '\x1b[0m',
    yellow: '\x1b[0;33m',
    green: '\x1b[0;32m	',
    red: '\x1b[31m',
};

let RscriptPath: string | undefined;

export type EntryPointSourceProvider = (
    testingTools: TestingTools,
    test: vscode.TestItem,
    isDebug: boolean,
    isWholeFile: boolean
) => Promise<string>;

export enum ItemType {
    File = "file",
    TestCase = "test",
}

export enum ItemFramework {
    Testthat = "testthat",
    Tinytest = "tinytest",
}

export interface TestingTools {
    controller: vscode.TestController;
    log: Log;
    testItemData: WeakMap<
        vscode.TestItem,
        {
            itemType: ItemType;
            itemFramework: ItemFramework;
        }
    >;
    tempFilePaths: String[];
    context: vscode.ExtensionContext;
}

export interface TestParser {
    (testingTools: TestingTools, file: vscode.TestItem): Promise<void>;
}

export interface TestRunner {
    (testingTools: TestingTools, run: vscode.TestRun, test: vscode.TestItem, isDebugMode: boolean): Promise<string>;
}

export function isExtensionEnabled(
    extensionId: string
): boolean {
    return vscode.extensions.getExtension(extensionId) != undefined;
}

export function getOrCreateFile(framework: ItemFramework, testingTools: TestingTools, uri: vscode.Uri, canResolveChildren: boolean) {
    const existing = testingTools.controller.items.get(uri.toString());
    if (existing) {
        testingTools.log.info(`Found a file node for ${uri}`);
        return existing;
    }

    testingTools.log.info(`Creating a file node for ${uri}`);
    const label = framework + "/" + uri.path.split("/").pop()!;
    const file = testingTools.controller.createTestItem(uri.path, label, uri);
    testingTools.testItemData.set(file, {
        itemType: ItemType.File,
        itemFramework: framework,
    });
    file.canResolveChildren = canResolveChildren;
    testingTools.controller.items.add(file);

    return file;
}

export async function getRscriptCommand(testingTools: TestingTools) {
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

export async function getDevtoolsVersion(
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

export function findTestRecursively(testIdToFind: string, testToSearch: vscode.TestItem) {
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

export function encodeNodeId(
    filePath: string,
    testLabel: string,
    testSuperLabel: string | undefined = undefined
) {
    let normalizedFilePath = path.normalize(filePath);
    normalizedFilePath = normalizedFilePath.replace(/^[\\\/]+|[\\\/]+$/g, "");
    return testSuperLabel
        ? `${normalizedFilePath}&${testSuperLabel}: ${testLabel}`
        : `${normalizedFilePath}&${testLabel}`;
}


const _unittestable = {
    getOrCreateFile,
    getRscriptCommand,
    getDevtoolsVersion,
};

export { _unittestable };
