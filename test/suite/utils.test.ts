import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import * as path from "path";
import { ItemFramework, ItemType, TestingTools } from "../../src/util";
import { expect } from "chai";
import * as utils from "../../src/util";

const testRepoPath = path.join(__dirname, "..", "..", "..", "test", "testRepo");

suite("utils", () => {
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
        context: <vscode.ExtensionContext>{},
    };

    test("RScript command can be found", async () => {
        expect(utils._unittestable.getRscriptCommand(testingTools)).to.eventually.be.fulfilled;
    });

    test("devtools version can be found", async () => {
        let RscriptCommand = await utils._unittestable.getRscriptCommand(testingTools);
        expect(utils._unittestable.getDevtoolsVersion(testingTools, RscriptCommand)).to.eventually
            .be.fulfilled;
    });

    controller.dispose();
});
