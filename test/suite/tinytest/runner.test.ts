import { runTinytestTest } from "../../../src/runner";
import * as utils from "../../../src/util";
import * as chai from "chai";
import * as deepEqualInAnyOrder from "deep-equal-in-any-order";
import * as chaiAsPromised from "chai-as-promised";
import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import { expect } from "chai";
import * as path from "path";
import { ItemFramework, ItemType, TestingTools } from "../../../src/util";

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

    test("Single test file run test-email.R", async () => {
        const TestItem = utils._unittestable.getOrCreateFile(
            ItemFramework.Tinytest,
            testingTools,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-email.R")),
            false
        );
        const run = testingTools.controller.createTestRun(new vscode.TestRunRequest([TestItem]));
        let stdout = await runTinytestTest(testingTools, run, TestItem, false);

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        expect(fail_count).to.be.equal(0);
        expect(pass_count).to.be.equal(4);
        expect(skip_count).to.be.equal(0);
    });

    test("Single test file run test-fallbacks.R", async () => {
        const TestItem = utils._unittestable.getOrCreateFile(
            ItemFramework.Tinytest,
            testingTools,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-fallbacks.R")),
            false
        );
        const run = testingTools.controller.createTestRun(new vscode.TestRunRequest([TestItem]));
        let stdout = await runTinytestTest(testingTools, run, TestItem, false);

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        expect(fail_count).to.be.equal(1);
        expect(pass_count).to.be.equal(4);
        expect(skip_count).to.be.equal(0);
    });

    test("Single test file run test-fullname.R", async () => {
        const TestItem = utils._unittestable.getOrCreateFile(
            ItemFramework.Tinytest,
            testingTools,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-fullname.R")),
            false
        );
        const run = testingTools.controller.createTestRun(new vscode.TestRunRequest([TestItem]));
        let stdout = await runTinytestTest(testingTools, run, TestItem, false);

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        expect(fail_count).to.be.equal(0);
        expect(pass_count).to.be.equal(2);
        expect(skip_count).to.be.equal(0);
    });

    test("Single test file run test-memoize.R", async () => {
        const TestItem = utils._unittestable.getOrCreateFile(
            ItemFramework.Tinytest,
            testingTools,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-memoize.R")),
            false
        );
        const run = testingTools.controller.createTestRun(new vscode.TestRunRequest([TestItem]));
        let stdout = await runTinytestTest(testingTools, run, TestItem, false);

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        expect(fail_count).to.be.equal(0);
        expect(pass_count).to.be.equal(5);
        expect(skip_count).to.be.equal(0);
    });

    test("Single test file run test-username.R", async () => {
        const TestItem = utils._unittestable.getOrCreateFile(
            ItemFramework.Tinytest,
            testingTools,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-username.R")),
            false
        );
        const run = testingTools.controller.createTestRun(new vscode.TestRunRequest([TestItem]));
        let stdout = await runTinytestTest(testingTools, run, TestItem, false);

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        expect(fail_count).to.be.equal(0);
        expect(pass_count).to.be.equal(1);
        expect(skip_count).to.be.equal(0);
    });

    test("General purpose tinytest keywoard coverage", async () => {
        const TestItem = utils._unittestable.getOrCreateFile(
            ItemFramework.Tinytest,
            testingTools,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-check-keywords.R")),
            false
        );
        const run = testingTools.controller.createTestRun(new vscode.TestRunRequest([TestItem]));
        let stdout = await runTinytestTest(testingTools, run, TestItem, false);

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        let warn_count = (stdout.match(/"result":"warning"/g) || []).length;
        expect(fail_count).to.be.equal(14);
        expect(pass_count).to.be.equal(14);
        expect(skip_count).to.be.equal(0);
        expect(warn_count).to.be.equal(1);  // warning generated by side effects
    });

    controller.dispose();
});
