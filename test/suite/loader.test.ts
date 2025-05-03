import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import { expect } from "chai";
import * as path from "path";
import * as loader from "../../src/loader";
import { ItemFramework, ItemType, TestingTools } from "../../src/util";
import { encodeNodeId } from "../../src/testthat/util";

const testRepoPath = path.join(__dirname, "..", "..", "..", "test", "testRepo");

suite("loader", () => {
    const controller = vscode.tests.createTestController("loader-controller", "Fake Controller");
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

    test("Can discover test files and create watchers", async () => {
        let watcherLists = await loader.discoverTestFiles(testingTools);
        // Register watcher
        expect(watcherLists[0]).to.have.lengthOf(1);
        // Parse all tests
        expect(testingTools.controller.items.size).to.be.equal(5);
    });

    test("Can load tests from a file", async () => {
        let testUri = vscode.Uri.file(path.join(testRepoPath, "tests", "testthat", "test-email.R"));
        let fileItem = testingTools.controller.createTestItem(
            testUri.path,
            testUri.path.split("/").pop()!,
            testUri
        );
        testingTools.controller.items.add(fileItem);
        testingTools.testItemData.set(fileItem, {
            itemType: ItemType.File,
            itemFramework: ItemFramework.Testthat,
        });
        await loader.loadTestsFromFile(testingTools, fileItem);
        // Check generic load
        expect(testingTools.controller.items.get(testUri.path)!.children.size).to.be.equal(3);
        // Check BDD test load
        expect(
            testingTools.controller.items
                .get(testUri.path)!
                .children.get(encodeNodeId(testUri.fsPath, "Email address"))!.children.size
        ).to.be.equal(2);
    });

    controller.dispose();
});
