import * as core from "../../../src/testthat/adapter";
import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import * as path from "path";
import * as crypto from "crypto";
import * as tmp from "tmp-promise";
import * as util from "util";
import * as fs from "fs";
import { TestInfo, TestSuiteInfo } from "vscode-test-adapter-api";
import * as chai from "chai";
import * as deepEqualInAnyOrder from "deep-equal-in-any-order";
import * as chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
chai.use(deepEqualInAnyOrder);
const expect = chai.expect;

const testRepoPath = path.join(__dirname, "..", "..", "..", "..", "test", "testRepo");
const testRepoTestsPath = path.join(testRepoPath, "tests", "testthat");
const sleep = util.promisify(setTimeout);

suite("TestthatAdapter", () => {
    const workspaceFolder = <vscode.WorkspaceFolder>{
        uri: vscode.Uri.file(testRepoPath),
        name: "testRepo",
        index: 0,
    };
    const log = new Log("RExplorer", workspaceFolder, "R Explorer Log");

    test("Is constructed properly", () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);
        expect((<any>testAdapter).watcher).to.exist;
        expect((<any>testAdapter).disposables).to.have.lengthOf(4);
        testAdapter.dispose();
    });

    test("Load is triggered on change", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);
        testAdapter.loadTests = () => <Promise<TestSuiteInfo>>{};
        let tmpFileName = `test-temp${randomChars()}.R`;
        let testLoadStartedFiredFlag = false;
        let testLoadFinishedFiredFlag = false;
        testAdapter.testsEmitter.event((e) => {
            if (e.type == "started") testLoadStartedFiredFlag = true;
        });
        testAdapter.testsEmitter.event((e) => {
            if (e.type == "finished") testLoadFinishedFiredFlag = true;
        });
        let tmpFileResult = await tmp.file({
            name: tmpFileName,
            tmpdir: testRepoTestsPath,
        });
        await sleep(5000);
        expect(testLoadStartedFiredFlag).to.be.true;
        expect(testLoadFinishedFiredFlag).to.be.true;
        testAdapter.dispose();
        await tmpFileResult.cleanup();
        await sleep(2500); //await for cleanup
    });

    test("Tests are loaded correctly", async () => {
        // check for any temp files not yet removed from directory
        let tempTestFiles = await vscode.workspace.findFiles("**/tests/testthat/**/test-temp*.R");
        for (const file of tempTestFiles) {
            try {
                fs.unlinkSync(file.fsPath);
            } catch (e) {}
        }
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);
        (<any>testAdapter).isLoading = true;
        let tests = await testAdapter.loadTests();
        expect(tests).to.be.deep.equalInAnyOrder(testRepoStructure);
        testAdapter.dispose();
    });

    test("Tests are run as expected", async () => {
        // check for any temp files not yet removed from directory
        let tempTestFiles = await vscode.workspace.findFiles("**/tests/testthat/**/test-temp*.R");
        for (const file of tempTestFiles) {
            try {
                fs.unlinkSync(file.fsPath);
            } catch (e) {}
        }
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);
        testAdapter.testSuite = testRepoStructure;
        let testStatesRunningFlag = false;
        let testStatesErroredFlag = false;
        let testStatesFailedFlag = false;
        let testStatesSkippedFlag = false;
        let testStatesPassed = false;
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "running") testStatesRunningFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "errored") testStatesErroredFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "failed") testStatesFailedFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "skipped") testStatesSkippedFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "passed") testStatesPassed = true;
        });
        (<any>testAdapter).isRunning = true;
        expect(testAdapter.runTests(["root"])).to.eventually.be.fulfilled;
        await sleep(10000); // ensure events are fired
        expect(testStatesRunningFlag).to.be.true;
        expect(testStatesErroredFlag).to.be.false;
        expect(testStatesFailedFlag).to.be.true;
        expect(testStatesSkippedFlag).to.be.true;
        expect(testStatesPassed).to.be.true;
        testAdapter.dispose();
    });

    test("Single test run for pass", async () => {
        // check for any temp files not yet removed from directory
        let tempTestFiles = await vscode.workspace.findFiles("**/tests/testthat/**/test-temp*.R");
        for (const file of tempTestFiles) {
            try {
                fs.unlinkSync(file.fsPath);
            } catch (e) {}
        }
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);
        testAdapter.testSuite = testRepoStructure;
        let testStatesRunningFlag = false;
        let testStatesErroredFlag = false;
        let testStatesFailedFlag = false;
        let testStatesSkippedFlag = false;
        let testStatesPassed = false;
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "running") testStatesRunningFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "errored") testStatesErroredFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "failed") testStatesFailedFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "skipped") testStatesSkippedFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "passed") testStatesPassed = true;
        });
        (<any>testAdapter).isRunning = true;
        expect(testAdapter.runTests(["test-memoize.R&can memoize"])).to.eventually.be.fulfilled;
        await sleep(10000); // ensure events are fired
        expect(testStatesRunningFlag).to.be.true;
        expect(testStatesErroredFlag).to.be.false;
        expect(testStatesFailedFlag).to.be.false;
        expect(testStatesSkippedFlag).to.be.false;
        expect(testStatesPassed).to.be.true;
        testAdapter.dispose();
    });

    test("Single test run for fail", async () => {
        // check for any temp files not yet removed from directory
        let tempTestFiles = await vscode.workspace.findFiles("**/tests/testthat/**/test-temp*.R");
        for (const file of tempTestFiles) {
            try {
                fs.unlinkSync(file.fsPath);
            } catch (e) {}
        }
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);
        testAdapter.testSuite = testRepoStructure;
        let testStatesRunningFlag = false;
        let testStatesErroredFlag = false;
        let testStatesFailedFlag = false;
        let testStatesSkippedFlag = false;
        let testStatesPassed = false;
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "running") testStatesRunningFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "errored") testStatesErroredFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "failed") testStatesFailedFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "skipped") testStatesSkippedFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "passed") testStatesPassed = true;
        });
        (<any>testAdapter).isRunning = true;
        expect(testAdapter.runTests(["test-fallbacks.R&username() falls back"])).to.eventually.be.fulfilled;
        await sleep(10000); // ensure events are fired
        expect(testStatesRunningFlag).to.be.true;
        expect(testStatesErroredFlag).to.be.false;
        expect(testStatesFailedFlag).to.be.true;
        expect(testStatesSkippedFlag).to.be.false;
        expect(testStatesPassed).to.be.false;
        testAdapter.dispose();
    });

    test("Single test run for skip", async () => {
        // check for any temp files not yet removed from directory
        let tempTestFiles = await vscode.workspace.findFiles("**/tests/testthat/**/test-temp*.R");
        for (const file of tempTestFiles) {
            try {
                fs.unlinkSync(file.fsPath);
            } catch (e) {}
        }
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);
        testAdapter.testSuite = testRepoStructure;
        let testStatesRunningFlag = false;
        let testStatesErroredFlag = false;
        let testStatesFailedFlag = false;
        let testStatesSkippedFlag = false;
        let testStatesPassed = false;
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "running") testStatesRunningFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "errored") testStatesErroredFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "failed") testStatesFailedFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "skipped") testStatesSkippedFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "test" && e.state == "passed") testStatesPassed = true;
        });
        (<any>testAdapter).isRunning = true;
        expect(testAdapter.runTests(["test-email.R&Email address works"])).to.eventually.be.fulfilled;
        await sleep(10000); // ensure events are fired
        expect(testStatesRunningFlag).to.be.true;
        expect(testStatesErroredFlag).to.be.false;
        expect(testStatesFailedFlag).to.be.false;
        expect(testStatesSkippedFlag).to.be.true;
        expect(testStatesPassed).to.be.false;
        testAdapter.dispose();
    });
});

function randomChars() {
    const RANDOM_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const count = 12;

    let value = [],
        rnd = null;

    try {
        rnd = crypto.randomBytes(count);
    } catch (e) {
        rnd = crypto.pseudoRandomBytes(count);
    }

    for (var i = 0; i < 12; i++) {
        value.push(RANDOM_CHARS[rnd[i] % RANDOM_CHARS.length]);
    }

    return value.join("");
}

const testRepoStructure: TestSuiteInfo = {
    type: "suite",
    id: "root",
    label: "R (testthat)",
    children: [
        <TestSuiteInfo>{
            type: "suite",
            id: "test-username.R",
            label: "test-username.R",
            file: path.join(testRepoTestsPath, "test-username.R"),
            children: [
                <TestInfo>{
                    type: "test",
                    id: "test-username.R&username works",
                    label: "username works",
                    file: path.join(testRepoTestsPath, "test-username.R"),
                    line: 3,
                },
                <TestInfo>{
                    type: "test",
                    id: "test-username.R&username fallback works",
                    label: "username fallback works",
                    file: path.join(testRepoTestsPath, "test-username.R"),
                    line: 13,
                },
            ],
        },
        <TestSuiteInfo>{
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
        },
        <TestSuiteInfo>{
            type: "suite",
            id: "test-gh-username.R",
            label: "test-gh-username.R",
            file: path.join(testRepoTestsPath, "test-gh-username.R"),
            children: [
                <TestInfo>{
                    type: "test",
                    id: "test-gh-username.R&Github username works",
                    label: "Github username works",
                    file: path.join(testRepoTestsPath, "test-gh-username.R"),
                    line: 3,
                },
            ],
        },
        <TestSuiteInfo>{
            type: "suite",
            id: "test-fullname.R",
            label: "test-fullname.R",
            file: path.join(testRepoTestsPath, "test-fullname.R"),
            children: [
                <TestInfo>{
                    type: "test",
                    id: "test-fullname.R&fullname fallback",
                    label: "fullname fallback",
                    file: path.join(testRepoTestsPath, "test-fullname.R"),
                    line: 3,
                },
                <TestInfo>{
                    type: "test",
                    id: "test-fullname.R&fullname works",
                    label: "fullname works",
                    file: path.join(testRepoTestsPath, "test-fullname.R"),
                    line: 16,
                },
                <TestInfo>{
                    type: "test",
                    id: "test-fullname.R&FULLNAME env var",
                    label: "FULLNAME env var",
                    file: path.join(testRepoTestsPath, "test-fullname.R"),
                    line: 26,
                },
            ],
        },
        <TestSuiteInfo>{
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
        },
        <TestSuiteInfo>{
            type: "suite",
            id: "test-email.R",
            label: "test-email.R",
            file: path.join(testRepoTestsPath, "test-email.R"),
            children: [
                <TestInfo>{
                    type: "test",
                    id: "test-email.R&Email address works",
                    label: "Email address works",
                    file: path.join(testRepoTestsPath, "test-email.R"),
                    line: 3,
                },
                <TestInfo>{
                    type: "test",
                    id: "test-email.R&EMAIL env var",
                    label: "EMAIL env var",
                    file: path.join(testRepoTestsPath, "test-email.R"),
                    line: 9,
                },
            ],
        },
    ],
};
