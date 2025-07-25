import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import { expect } from "chai";
import * as path from "path";
import * as watcher from "../../../src/tinytest/watcher";
import * as utils from "../../../src/util";
import { ItemFramework, ItemType, TestingTools } from "../../../src/util";

const testRepoPath = path.join(__dirname, "..", "..", "..", "..", "test", "testRepo");

suite("tinytest/watcher", () => {
    const controller = vscode.tests.createTestController("fake-controller", "Fake Controller");
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

    test("Can create watchers and detect tests", async () => {
        let w = await watcher.tinytestWatcherFactory(testingTools, workspaceFolder);
        // Check if object is a vscode.FileSystemWatcher
        expect(w).to.have.property("dispose");
        // Check if the files are detected
        expect(testingTools.controller.items.size).to.be.equal(6);
    });

    test("Can get or create test file items", async () => {
        let testUri = vscode.Uri.file(path.join(testRepoPath, "inst", "tinytest", "test-check-keywords.R"));
        let newTestUri = vscode.Uri.file(
            path.join(testRepoPath, "inst", "tinytest", "test-check-keywords.R")
        );
        let existingTest = testingTools.controller.items.get(testUri.path)!;
        // can get existing test
        expect(utils._unittestable.getOrCreateFile(ItemFramework.Tinytest, testingTools, testUri, true).id).to.be.equal(
            existingTest.id
        );
        expect(testingTools.testItemData.has(existingTest)).to.be.true;
        // can create non-existing test
        let newTest = utils._unittestable.getOrCreateFile(ItemFramework.Tinytest, testingTools, newTestUri, true);
        expect(newTest).to.have.property("id");
        expect(testingTools.testItemData.has(newTest)).to.be.true;
    });

    controller.dispose();
});
