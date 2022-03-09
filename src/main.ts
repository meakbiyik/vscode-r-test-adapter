import * as vscode from "vscode";
import { discoverTestFiles, loadTestsFromFile } from "./loader";
import { Log } from "vscode-test-adapter-util";
import { runHandler } from "./runner";

export enum ItemType {
    File,
    TestCase,
}
export enum ItemFramework {
    Testthat,
}
export interface TestingTools {
    controller: vscode.TestController;
    log: Log;
    testItemData: WeakMap<vscode.TestItem, {
        itemType: ItemType;
        itemFramework: ItemFramework;
    }>;
}

export async function activate(context: vscode.ExtensionContext) {
    const workspaceFolder = (vscode.workspace.workspaceFolders || [])[0];

    const controller = vscode.tests.createTestController("r-test-adapter", "R Test Adapter");
    const log = new Log("RTestAdapter", workspaceFolder, "R Test Adapter Log");
    const testItemData = new WeakMap<vscode.TestItem, { itemType: ItemType; itemFramework: ItemFramework }>();

    context.subscriptions.push(controller);
    context.subscriptions.push(log);

    const testingTools: TestingTools = {
        controller,
        log,
        testItemData
    }

    // Custom handler for loading tests. The "test" argument here is undefined,
    // but if we supported lazy-loading child test then this could be called with
    // the test whose children VS Code wanted to load.
    controller.resolveHandler = async (test) => {
        if (!test) {
            log.info("Discovering test files started.");
            let watcherLists = await discoverTestFiles(testingTools);
            for (const watchers of watcherLists) {
                context.subscriptions.push(...watchers);
            }
            log.info("Discovering test files finished.");
        } else {
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
}
