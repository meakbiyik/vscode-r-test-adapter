import * as runner from "../../../src/testthat/runner";
import * as core from "../../../src/testthat/adapter";
import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import * as path from "path";
import { TestInfo, TestSuiteInfo } from "vscode-test-adapter-api";
import * as chai from "chai";
import * as deepEqualInAnyOrder from "deep-equal-in-any-order";
import * as chaiAsPromised from "chai-as-promised";
import { encodeNodeId } from "../../../src/testthat/parser";

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

    test("Single test file run for pass", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);

        let stdout = await runner.runSingleTestFile(
            testAdapter,
            path.join(testRepoTestsPath, "test-memoize.R"),
            memoize_node,
            "placeholder"
        );

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        expect(fail_count).to.be.equal(0);
        expect(pass_count).to.be.equal(5);
        expect(skip_count).to.be.equal(0);
        testAdapter.dispose();
    });

    test("Single test file run for fail", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);

        let stdout = await runner.runSingleTestFile(
            testAdapter,
            path.join(testRepoTestsPath, "test-fallbacks.R"),
            fallbacks_node,
            "placeholder"
        );

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        expect(fail_count).to.be.equal(1);
        expect(pass_count).to.be.equal(4);
        testAdapter.dispose();
    });

    test("Single test file run for skip", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);

        let stdout = await runner.runSingleTestFile(
            testAdapter,
            path.join(testRepoTestsPath, "test-email.R"),
            email_node,
            "placeholder"
        );

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        expect(fail_count).to.be.equal(0);
        expect(pass_count).to.be.equal(2);
        expect(skip_count).to.be.equal(2);
        testAdapter.dispose();
    });

    test("Single test run for pass", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);

        let stdout = await runner.runSingleTest(
            testAdapter,
            <TestInfo>{
                type: "test",
                id: "test-memoize.R&can memoize",
                label: "can memoize",
                file: path.join(testRepoTestsPath, "test-memoize.R"),
                line: 3,
            },
            "placeholder"
        );

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        expect(fail_count).to.be.equal(0);
        expect(pass_count).to.be.equal(2);
        expect(skip_count).to.be.equal(0);
        testAdapter.dispose();
    });

    test("Single test run for fail", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);

        let stdout = await runner.runSingleTest(
            testAdapter,
            <TestInfo>{
                type: "test",
                id: "test-fallbacks.R&username() falls back",
                label: "username() falls back",
                file: path.join(testRepoTestsPath, "test-fallbacks.R"),
                line: 3,
            },
            "placeholder"
        );

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        expect(fail_count).to.be.equal(1);
        expect(pass_count).to.be.equal(0);
        expect(skip_count).to.be.equal(0);
        testAdapter.dispose();
    });

    test("Single test run for skip", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);

        let stdout = await runner.runSingleTest(
            testAdapter,
            <TestInfo>{
                type: "test",
                id: "test-email.R&Email address works",
                label: "Email address works",
                file: path.join(testRepoTestsPath, "test-email.R"),
                line: 3,
            },
            "placeholder"
        );

        let fail_count = (stdout.match(/"result":"failure"/g) || []).length;
        let pass_count = (stdout.match(/"result":"success"/g) || []).length;
        let skip_count = (stdout.match(/"result":"skip"/g) || []).length;
        expect(fail_count).to.be.equal(0);
        expect(pass_count).to.be.equal(0);
        expect(skip_count).to.be.equal(1);
        testAdapter.dispose();
    });

    test("RScript command can be found", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);
        expect(runner._unittestable.getRscriptCommand(testAdapter)).to.eventually.be.fulfilled;
        testAdapter.dispose();
    });
});

const memoize_node = <TestSuiteInfo>{
    type: "suite",
    id: "test-memoize.R",
    label: "test-memoize.R",
    file: path.join(testRepoTestsPath, "test-memoize.R"),
    children: [
        <TestInfo>{
            type: "test",
            id: "test-memoize.R&can memoize",
            label: "can memoize",
            file: path.join(testRepoTestsPath, "test-memoize.R"),
            line: 3,
        },
        <TestInfo>{
            type: "test",
            id: "test-memoize.R&non-string argument",
            label: "non-string argument",
            file: path.join(testRepoTestsPath, "test-memoize.R"),
            line: 18,
        },
    ],
};

const fallbacks_node = <TestSuiteInfo>{
    type: "suite",
    id: "test-fallbacks.R",
    label: "test-fallbacks.R",
    file: path.join(testRepoTestsPath, "test-fallbacks.R"),
    children: [
        <TestInfo>{
            type: "test",
            id: "test-fallbacks.R&username() falls back",
            label: "username() falls back",
            file: path.join(testRepoTestsPath, "test-fallbacks.R"),
            line: 3,
        },
        <TestInfo>{
            type: "test",
            id: "test-fallbacks.R&fullname() falls back",
            label: "fullname() falls back",
            file: path.join(testRepoTestsPath, "test-fallbacks.R"),
            line: 10,
        },
        <TestInfo>{
            type: "test",
            id: "test-fallbacks.R&email_address() falls back",
            label: "email_address() falls back",
            file: path.join(testRepoTestsPath, "test-fallbacks.R"),
            line: 16,
        },
        <TestInfo>{
            type: "test",
            id: "test-fallbacks.R&gh_username() falls back",
            label: "gh_username() falls back",
            file: path.join(testRepoTestsPath, "test-fallbacks.R"),
            line: 22,
        },
    ],
};

const email_node = <TestSuiteInfo>{
    type: "suite",
    id: "test-email.R",
    label: "test-email.R",
    file: path.join(testRepoTestsPath, "test-email.R"),
    children: [
        <TestInfo>{
            type: "test",
            id: encodeNodeId(path.join(testRepoTestsPath, "test-email.R"), "Email address works"),
            label: "Email address works",
            file: path.join(testRepoTestsPath, "test-email.R"),
            line: 3,
        },
        <TestInfo>{
            type: "test",
            id: encodeNodeId(path.join(testRepoTestsPath, "test-email.R"), "EMAIL env var"),
            label: "EMAIL env var",
            file: path.join(testRepoTestsPath, "test-email.R"),
            line: 9,
        },
        <TestSuiteInfo>{
            type: "suite",
            id: encodeNodeId(path.join(testRepoTestsPath, "test-email.R"), "Email address"),
            label: "Email address",
            file: path.join(testRepoTestsPath, "test-email.R"),
            line: 15,
            children: [
                <TestInfo>{
                    type: "test",
                    id: encodeNodeId(path.join(testRepoTestsPath, "test-email.R"), "works", "Email address"),
                    label: "works",
                    file: path.join(testRepoTestsPath, "test-email.R"),
                    line: 16,
                },
                <TestInfo>{
                    type: "test",
                    id: "test-email.R&Email address: got EMAIL env var",
                    label: "got EMAIL env var",
                    file: path.join(testRepoTestsPath, "test-email.R"),
                    line: 22,
                },
            ],
        },
    ],
};
