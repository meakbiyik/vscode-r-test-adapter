import parseTestsFromFile from "../../../src/tinytest/parser";
import { expect } from "chai";
import * as chai from "chai";
import * as deepEqualInAnyOrder from "deep-equal-in-any-order";
import * as chaiAsPromised from "chai-as-promised";
import * as utils from "../../../src/util";
import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import * as path from "path";
import { ItemFramework, ItemType, TestingTools } from "../../../src/util";

chai.use(chaiAsPromised);
chai.use(deepEqualInAnyOrder);

const testRepoPath = path.join(__dirname, "..", "..", "..", "..", "test", "testRepo");
const testRepoTestsPath = path.join(testRepoPath, "inst", "tinytest");

suite("tinytest/parser", () => {
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

    test("File constitutes a test", async () => {
        const TestItem = utils._unittestable.getOrCreateFile(
            ItemFramework.Testthat,
            testingTools,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-airthmetic.R")),
            false
        );
        await parseTestsFromFile(testingTools, TestItem);
        let tests = TestItem.children;
        expect(tests.size).to.be.equal(0);
        expect(TestItem.uri?.fsPath).includes("test-airthmetic.R")
    });

    controller.dispose();
});
