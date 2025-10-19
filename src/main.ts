import * as vscode from "vscode";
import { ItemFramework, ItemType, TestingTools } from "./util";
import { discoverTestFiles, loadTestsFromFile } from "./loader";
import { Log } from "vscode-test-adapter-util";
import { runHandler } from "./runner";

export async function activate(context: vscode.ExtensionContext) {
    const workspaceFolder = (vscode.workspace.workspaceFolders || [])[0];

    const controller = vscode.tests.createTestController("r-test-adapter", "R Test Adapter");
    const log = new Log("RTestAdapter", workspaceFolder, "R Test Adapter Log");
    const testItemData = new WeakMap<
        vscode.TestItem,
        { itemType: ItemType; itemFramework: ItemFramework }
    >();
    const tempFilePaths: String[] = [];

    context.subscriptions.push(controller);
    context.subscriptions.push(log);

    const testingTools: TestingTools = {
        controller,
        log,
        testItemData,
        tempFilePaths,
        context
    };

    // Custom handler for loading tests. The "test" argument here is undefined,
    // but if we supported lazy-loading child test then this could be called with
    // the test whose children VS Code wanted to load.

    controller.refreshHandler = async (token) => {
        log.info("Refresh: discovering test files started.");
        // optional: clear/replace existing items before rediscovering
        controller.items.replace([]);
        const watcherLists = await discoverTestFiles(testingTools);
        for (const watchers of watcherLists) {
            context.subscriptions.push(...watchers);
        }
        log.info("Refresh: discovering test files finished.");
    };

    controller.resolveHandler = async (test) => {
        if (!test) {
            await controller.refreshHandler!(new vscode.CancellationTokenSource().token);
            return;
        }
        else {
            // Populate the file’s tests
            await loadTestsFromFile(testingTools, test);
        }
    };

    // We'll create the "run" type profile here, and give it the function to call.
    // You can also create debug and coverage profile types. The last `true` argument
    // indicates that this should by the default "run" profile, in case there were
    // multiple run profiles.
    controller.createRunProfile(
        "Run",
        vscode.TestRunProfileKind.Run,
        (request, token) => runHandler(testingTools, request, token),
        true
    );

    controller.createRunProfile(
        "Debug",
        vscode.TestRunProfileKind.Debug,
        (request, token) => {
            for (const test of request.include!) {
                if (test.parent != undefined && test.parent.parent != undefined) {
                    // FIXME: Implement running a single it(...) test when https://github.com/r-lib/testthat/pull/2077 is merged.
                    vscode.window.showWarningMessage("Running a single it(...) test is not supported. Running the parent describe(...) suite. See documentation.");
                }
            };
            runHandler(testingTools, request, token);
        },
        true
    );
}
