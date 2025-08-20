import * as vscode from "vscode";
import { ItemFramework, ItemType, rediscover, TestingTools } from "./util";
import { loadTestsFromFile } from "./loader";
import { Log } from "vscode-test-adapter-util";
import { runHandler } from "./runner";

let _testingTools: TestingTools;
export function getTestingTools() { return _testingTools; }

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
    _testingTools = testingTools;

    // Custom handler for loading tests. The "test" argument here is undefined,
    // but if we supported lazy-loading child test then this could be called with
    // the test whose children VS Code wanted to load.
    controller.resolveHandler = async (test) => {
        if (!test) {
            await rediscover(testingTools);
        } else {
            await loadTestsFromFile(testingTools, test);
        }
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('RTestAdapter.rediscover', () => rediscover(testingTools))
    );

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
