import * as runner from "../../../src/testthat/runner";
import * as core from "../../../src/testthat/adapter";
import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import * as path from "path";
import { TestInfo } from "vscode-test-adapter-api";
import * as chai from "chai";
import * as deepEqualInAnyOrder from "deep-equal-in-any-order";
import * as chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
chai.use(deepEqualInAnyOrder);
const expect = chai.expect;

const testRepoPath = path.join(__dirname, "..", "..", "..", "..", "test", "testRepo");
const testRepoTestsPath = path.join(testRepoPath, "tests", "testthat");

suite("TestthatRunner", () => {
    const workspaceFolder = <vscode.WorkspaceFolder>{
        uri: vscode.Uri.file(testRepoPath),
        name: "testRepo",
        index: 0,
    };
    const log = new Log("RExplorer", workspaceFolder, "R Explorer Log");

    test("All tests (root suite) run", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);

        let stdout = await runner.runAllTests(testAdapter);

        expect(stdout).to.contain("FAIL 1 | WARN 0 | SKIP 2 | PASS 15");
        testAdapter.dispose();
    });

    test("Single test file run for pass", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);

        let stdout = await runner.runSingleTestFile(
            testAdapter,
            path.join(testRepoTestsPath, "test-memoize.R")
        );

        expect(stdout).to.contain("FAIL 0 | WARN 0 | SKIP 0 | PASS 5");
        testAdapter.dispose();
    });

    test("Single test file run for fail", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);

        let stdout = await runner.runSingleTestFile(
            testAdapter,
            path.join(testRepoTestsPath, "test-fallbacks.R")
        );

        expect(stdout).to.contain("FAIL 1 | WARN 0 | SKIP 0 | PASS 4");
        testAdapter.dispose();
    });

    test("Single test file run for skip", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);

        let stdout = await runner.runSingleTestFile(
            testAdapter,
            path.join(testRepoTestsPath, "test-email.R")
        );

        expect(stdout).to.contain("FAIL 0 | WARN 0 | SKIP 2 | PASS 2");
        testAdapter.dispose();
    });

    test("Single test run for pass", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);

        let stdout = await runner.runSingleTest(testAdapter, <TestInfo>{
            type: "test",
            id: "test-memoize.R&can memoize",
            label: "can memoize",
            file: path.join(testRepoTestsPath, "test-memoize.R"),
            line: 3,
        });

        expect(stdout).to.contain("FAIL 0 | WARN 0 | SKIP 0 | PASS 2");
        testAdapter.dispose();
    });

    test("Single test run for fail", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);

        let stdout = await runner.runSingleTest(testAdapter, <TestInfo>{
            type: "test",
            id: "test-fallbacks.R&username() falls back",
            label: "username() falls back",
            file: path.join(testRepoTestsPath, "test-fallbacks.R"),
            line: 3,
        });

        expect(stdout).to.contain("FAIL 1 | WARN 0 | SKIP 0 | PASS 0");
        testAdapter.dispose();
    });

    test("Single test run for skip", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);

        let stdout = await runner.runSingleTest(testAdapter, <TestInfo>{
            type: "test",
            id: "test-email.R&Email address works",
            label: "Email address works",
            file: path.join(testRepoTestsPath, "test-email.R"),
            line: 3,
        });

        expect(stdout).to.contain("FAIL 0 | WARN 0 | SKIP 1 | PASS 0");
        testAdapter.dispose();
    });

    test("RScript command can be found", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);
        expect(runner._unittestable.getRscriptCommand(testAdapter)).to.eventually.be.fulfilled;
        testAdapter.dispose();
    });
});
