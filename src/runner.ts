import * as vscode from "vscode";
import runTestthatTest from "./testthat/runner";
import { ItemFramework, TestingTools, TestRunner } from "./util";

const testRunners: Record<ItemFramework, TestRunner> = {
    testthat: runTestthatTest,
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
    testingTools.log.info("Test run started.");
    const isDebugMode = request.profile?.kind === vscode.TestRunProfileKind.Debug;
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

export { runHandler };
