import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import * as path from "path";
import * as runner from "../../src/runner";
import { ItemFramework, ItemType, TestingTools } from "../../src/util";
import * as loader from "../../src/loader";

const testRepoPath = path.join(__dirname, "..", "..", "..", "test", "testRepo");

suite("runner", () => {
    const controller = vscode.tests.createTestController("runner-controller", "Fake Controller");
    const workspaceFolder = <vscode.WorkspaceFolder>{
        uri: vscode.Uri.file(testRepoPath),
        name: "testRepo",
        index: 0,
    };
    const log = new Log("FakeExplorer", workspaceFolder, "Fake Explorer Log");

    const testItemData = new WeakMap<
        vscode.TestItem,
        { itemType: ItemType; itemFramework: ItemFramework }
    >();
    const tempFilePaths: String[] = [];

    const testingTools: TestingTools = {
        controller,
        log,
        testItemData,
        tempFilePaths,
    };

    test("Can run all tests", async () => {
        await loader.discoverTestFiles(testingTools);
        await runner.runHandler(testingTools, new vscode.TestRunRequest(), {
            isCancellationRequested: false,
        } as vscode.CancellationToken);
    });

    controller.dispose();
});
