import * as vscode from "vscode";
import { isExtensionEnabled, EntryPointSourceProvider, ItemFramework, TestingTools, TestRunner, R_DEBUGGER_EXTENSION_ID, ItemType, getRscriptCommand } from "./util";
import { testthatEntryPoint } from './testthat/runner';
import { tinytestEntryPoint } from './tinytest/runner';
import * as util from "util";
import * as path from "path";
import * as tmp from "tmp-promise";
import { DebugChannel, ProcessChannel } from "./streams"; // Adjust the path as needed
import { appendFile as _appendFile } from "fs";
import { v4 as uuid } from "uuid";
const appendFile = util.promisify(_appendFile);

function buildTestRunner(
    entryPoint: EntryPointSourceProvider,
    shouldHighlightOutput: boolean
): TestRunner {
    return (
        tools: TestingTools,
        run: vscode.TestRun,
        item: vscode.TestItem,
        isDebug: boolean
    ) => runTest(tools, run, item, entryPoint, isDebug, shouldHighlightOutput);
}

export const runTestthatTest = buildTestRunner(testthatEntryPoint, false);
export const runTinytestTest = buildTestRunner(tinytestEntryPoint, true);

const testRunners: Record<ItemFramework, TestRunner> = {
    testthat: runTestthatTest,
    tinytest: runTinytestTest
};

function setRecursively(
    test: vscode.TestItem,
    callback: (test: vscode.TestItem) => any,
    excludeSet: readonly vscode.TestItem[] | undefined
) {
    if (!excludeSet?.includes(test)) {
        callback(test);
        test.children.forEach((childTest) => {
            setRecursively(childTest, callback, excludeSet);
        });
    }
}

async function runHandler(
    testingTools: TestingTools,
    request: vscode.TestRunRequest,
    token: vscode.CancellationToken
) {
    // Check if the R Debugger extension is enabled when running in debug mode.
    const isDebugMode = request.profile?.kind === vscode.TestRunProfileKind.Debug;
    const isDebuggerEnabled = isExtensionEnabled(R_DEBUGGER_EXTENSION_ID);
    if (isDebugMode && !isDebuggerEnabled) {
        vscode.window.showErrorMessage("R Debugger extension is not enabled. Please install and enable it to use the R test debug mode.");
        return;
    }

    testingTools.log.info("Test run started.");
    const run = testingTools.controller.createTestRun(request);
    const queue: vscode.TestItem[] = [];
    const getFramework = (testItem: vscode.TestItem) =>
        testingTools.testItemData.get(testItem)!.itemFramework;

    // Loop through all included tests, or all known tests, and add them to our queue
    if (request.include) {
        request.include.forEach((test) => {
            queue.push(test);
            setRecursively(test, (test) => run.enqueued(test), request.exclude);
        });
    } else {
        testingTools.controller.items.forEach((test) => {
            queue.push(test);
            setRecursively(test, (test) => run.enqueued(test), request.exclude);
        });
    }
    testingTools.log.info("Tests are enqueued.");

    // For every test that was queued, try to run it. Call run.passed() or run.failed().
    // The `TestMessage` can contain extra information, like a failing location or
    // a diff output. But here we'll just give it a textual message.
    while (queue.length > 0 && !token.isCancellationRequested) {
        const test = queue.pop()!;

        // Skip tests the user asked to exclude
        if (request.exclude?.includes(test)) {
            testingTools.log.info(`Excluded test skipped: ${test.label}`);
            continue;
        }

        let startDate = Date.now();
        let runTest = testRunners[getFramework(test)];
        try {
            testingTools.log.info(`Running test with label ${test.label}`);
            test.busy = true;
            let stdout = await runTest(testingTools, run, test, isDebugMode);
            test.busy = false;
            testingTools.log.debug(`Test output: ${stdout}`);
        } catch (error) {
            testingTools.log.error(`Run errored with reason ${error}`);
            setRecursively(
                test,
                (test) => {
                    if (test.busy) {
                        run.errored(
                            test,
                            new vscode.TestMessage(String(error)),
                            test.range === undefined ? Date.now() - startDate : undefined
                        );
                    }
                },
                request.exclude
            );
            test.busy = false;
        }
    }

    // Make sure to end the run after all tests have been executed:
    run.end();
}

async function runTest(
    testingTools: TestingTools,
    run: vscode.TestRun,
    test: vscode.TestItem,
    getEntryPointSource: EntryPointSourceProvider,
    isDebugMode: boolean = false,
    shouldHighlightOutput: boolean = false
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
    let cleanFilePath = tmpFilePath.replace(/\\/g, "/");
    let RscriptCommand = await getRscriptCommand(testingTools);
    let command = `${RscriptCommand} ${tmpFilePath}`;
    let cwd = vscode.workspace.getWorkspaceFolder(test.uri!)!;

    // Use DebugChannel for debug mode to capture detailed debugging information,
    // and ProcessChannel for normal mode to execute the test script as a subprocess.
    let eventStream = isDebugMode ? new DebugChannel(testingTools, cwd, cleanFilePath) : new ProcessChannel(command, cwd);
    return eventStream.start(run, test, isDebugMode, shouldHighlightOutput)
        .catch(async (err) => {
            await tmpFileResult.cleanup();
            throw err;
        })
        .then(async (value) => {
            await tmpFileResult.cleanup();
            return value;
        });
}

export { runHandler, runTest };
