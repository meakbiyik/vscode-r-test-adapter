import * as util from "util";
import * as path from "path";
import * as tmp from "tmp-promise";
import * as vscode from "vscode";
import { EntryPointSourceProvider } from "../util";
import { DebugChannel, ProcessChannel } from "../streams"; // Adjust the path as needed
import { getDevtoolsVersion, getRscriptCommand, ItemType, TestingTools } from "../util";
import { appendFile as _appendFile } from "fs";
import { v4 as uuid } from "uuid";

const appendFile = util.promisify(_appendFile);
const testReporterPath = path
    .join(__dirname, "..", "..", "..", "src", "testthat", "reporter")
    .replace(/\\/g, "/");
const workspaceFolder = vscode.workspace.workspaceFolders![0].uri.fsPath
    .replace(/\\/g, "/");

async function runTest(
    testingTools: TestingTools,
    run: vscode.TestRun,
    test: vscode.TestItem,
    isDebugMode: boolean = false,
    shouldHighlightOutput: boolean = false,
    getEntryPointSource: EntryPointSourceProvider = testthatEntryPoint
): Promise<string> {
    const getType = (testItem: vscode.TestItem) =>
        testingTools.testItemData.get(testItem)!.itemType;

    let isWholeFile = getType(test) === ItemType.File;
    const source = await getEntryPointSource(testingTools, test, isDebugMode, isWholeFile);

    const testRunId = uuid();
    let tmpFileName = `test-${testRunId}.loader`;
    let tmpFilePath = path.normalize(path.join(path.dirname(test.uri!.fsPath), tmpFileName));
    // Do not clean up tempFilePaths, not possible to get around the race condition
    testingTools.tempFilePaths.push(tmpFilePath);
    // cleanup is not guaranteed to unlink the file immediately
    let tmpFileResult = await tmp.file({
        name: tmpFileName,
        tmpdir: path.dirname(test.uri!.fsPath),
    });

    await appendFile(tmpFilePath, source);

    return executeTest(testingTools, run, test, tmpFilePath, isDebugMode, shouldHighlightOutput)
        .catch(async (err) => {
            await tmpFileResult.cleanup();
            throw err;
        })
        .then(async (value) => {
            await tmpFileResult.cleanup();
            return value;
        });
}

export async function executeTest(
    testingTools: TestingTools,
    run: vscode.TestRun,
    test: vscode.TestItem,
    filePath: string,
    isDebugMode: boolean,
    shouldHighlightOutput: boolean = false
): Promise<string> {
    let cleanFilePath = filePath.replace(/\\/g, "/");
    let RscriptCommand = await getRscriptCommand(testingTools);
    let command = `${RscriptCommand} ${filePath}`;
    let cwd = vscode.workspace.workspaceFolders![0];

    // Use DebugChannel for debug mode to capture detailed debugging information,
    // and ProcessChannel for normal mode to execute the test script as a subprocess.
    let eventStream = isDebugMode ? new DebugChannel(testingTools, cwd, cleanFilePath) : new ProcessChannel(command, cwd);
    return eventStream.start(run, test, isDebugMode, shouldHighlightOutput);

}

// This function returns the 'entry point' for the R test.
// The entry point hacks the testthat package to disable any other test.
// This way the user has a seamless experience when running the test
// both in the normal and debug mode.
export async function testthatEntryPoint(
    testingTools: TestingTools,
    test: vscode.TestItem,
    isDebug: boolean = false,
    isWholeFile: boolean) {

    let RscriptCommand = await getRscriptCommand(testingTools);
    let { major, minor, patch } = await getDevtoolsVersion(testingTools, RscriptCommand);
    if (major < 2 || (major == 2 && minor < 3) || (major == 2 && minor == 3 && patch < 2)) {
        return Promise.reject(
            Error(
                "Devtools version too old. RTestAdapter requires devtools>=2.3.2" +
                "to be installed in the Rscript environment"
            )
        );
    };
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
# NOTE! This file has been generated automatically by the VSCode R Test Adapter. Modification has no effect.

# This file modifies the original behavior of the testthat::test_that and testthat::describe methods
# such that they trigger only the tests specified by the 'desc' argument.
# Please report any unwanted effects at https://github.com/meakbiyik/vscode-r-test-adapter/issues.

# Entry point for the '${test.id}' test follows...

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


export default runTest;

