import runTest from "../../../src/testthat/runner";
import * as utils from "../../../src/util";
import parseTestsFromFile from "../../../src/testthat/parser";
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
const testRepoTestsPath = path.join(testRepoPath, "tests", "testthat");

suite("testthat/runner", () => {
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

    test("Single test file run for pass", async () => {
        const TestItem = utils._unittestable.getOrCreateFile(
            ItemFramework.Testthat,
            testingTools,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-memoize.R")),
            true
        );
        const run = testingTools.controller.createTestRun(new vscode.TestRunRequest([TestItem]));
        let stdout = await runTest(testingTools, run, TestItem);

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        expect(fail_count).to.be.equal(0);
        expect(pass_count).to.be.equal(5);
        expect(skip_count).to.be.equal(0);
    });

    test("Single test file run for fail", async () => {
        const TestItem = utils._unittestable.getOrCreateFile(
            ItemFramework.Testthat,
            testingTools,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-fallbacks.R")),
            true
        );
        const run = testingTools.controller.createTestRun(new vscode.TestRunRequest([TestItem]));
        let stdout = await runTest(testingTools, run, TestItem);

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        expect(fail_count).to.be.equal(1);
        expect(pass_count).to.be.equal(4);
    });

    test("Single test file run for skip", async () => {
        const TestItem = utils._unittestable.getOrCreateFile(
            ItemFramework.Testthat,
            testingTools,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-email.R")),
            true
        );
        const run = testingTools.controller.createTestRun(new vscode.TestRunRequest([TestItem]));
        let stdout = await runTest(testingTools, run, TestItem);

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        expect(fail_count).to.be.equal(0);
        expect(pass_count).to.be.equal(2);
        expect(skip_count).to.be.equal(2);
    });

    test("Single test run for pass", async () => {
        const TestItem = utils._unittestable.getOrCreateFile(
            ItemFramework.Testthat,
            testingTools,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-memoize.R")),
            true
        );
        await parseTestsFromFile(testingTools, TestItem);
        const childrens: string[] = [];
        TestItem.children.forEach((test, collection) => {
            childrens.push(test.id);
        });
        const ChildTestItem = TestItem.children.get(childrens[0])!;
        const run = testingTools.controller.createTestRun(
            new vscode.TestRunRequest([ChildTestItem])
        );
        let stdout = await runTest(testingTools, run, ChildTestItem);

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        expect(fail_count).to.be.equal(0);
        expect(pass_count).to.be.equal(2);
        expect(skip_count).to.be.equal(0);
    });

    test("Single test run for fail", async () => {
        const TestItem = utils._unittestable.getOrCreateFile(
            ItemFramework.Testthat,
            testingTools,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-fallbacks.R")),
            true
        );
        await parseTestsFromFile(testingTools, TestItem);
        const childrens: string[] = [];
        TestItem.children.forEach((test, collection) => {
            childrens.push(test.id);
        });
        const ChildTestItem = TestItem.children.get(childrens[0])!;
        const run = testingTools.controller.createTestRun(
            new vscode.TestRunRequest([ChildTestItem])
        );
        let stdout = await runTest(testingTools, run, ChildTestItem);

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        expect(fail_count).to.be.equal(1);
        expect(pass_count).to.be.equal(0);
        expect(skip_count).to.be.equal(0);
    });

    test("Single test run for skip", async () => {
        const TestItem = utils._unittestable.getOrCreateFile(
            ItemFramework.Testthat,
            testingTools,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-email.R")),
            true
        );
        await parseTestsFromFile(testingTools, TestItem);
        const childrens: string[] = [];
        TestItem.children.forEach((test, collection) => {
            childrens.push(test.id);
        });
        const ChildTestItem = TestItem.children.get(childrens[0])!;
        const run = testingTools.controller.createTestRun(
            new vscode.TestRunRequest([ChildTestItem])
        );
        let stdout = await runTest(testingTools, run, ChildTestItem);

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        expect(fail_count).to.be.equal(0);
        expect(pass_count).to.be.equal(0);
        expect(skip_count).to.be.equal(1);
    });

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
