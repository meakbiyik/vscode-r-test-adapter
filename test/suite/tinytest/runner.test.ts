import * as utils from "../../../src/util";
import * as chai from "chai";
import * as deepEqualInAnyOrder from "deep-equal-in-any-order";
import * as chaiAsPromised from "chai-as-promised";
import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import { expect } from "chai";
import * as path from "path";
import { ItemFramework, ItemType, TestingTools } from "../../../src/util";
import { runTinytestTest } from "../../../src/runner";

chai.use(chaiAsPromised);
chai.use(deepEqualInAnyOrder);

const testRepoPath = path.join(__dirname, "..", "..", "..", "..", "test", "testRepo");
const testRepoTestsPath = path.join(testRepoPath, "inst", "tinytest");

suite("tinytest/runner", () => {
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

    test("Single test file run", async () => {
        const TestItem = utils._unittestable.getOrCreateFile(
            ItemFramework.Tinytest,
            testingTools,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-arithmetic.R")),
            false
        );
        const run = testingTools.controller.createTestRun(new vscode.TestRunRequest([TestItem]));
        let stdout = await runTinytestTest(testingTools, run, TestItem, false);

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        expect(fail_count).to.be.equal(1);
        expect(pass_count).to.be.equal(2);
        expect(skip_count).to.be.equal(0);
    });

    controller.dispose();
});
