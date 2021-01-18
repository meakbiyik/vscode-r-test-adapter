import * as core from "../../../src/testthat/adapter";
import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import { assert } from "../../helpers";
import * as path from "path";
import * as crypto from "crypto";
import * as tmp from "tmp-promise";
import * as util from "util";
import * as equal from "fast-deep-equal";
import { TestInfo, TestSuiteInfo } from "vscode-test-adapter-api";

const testRepoPath = path.join(__dirname, "..", "..", "..", "..", "test", "testRepo")
const testRepoTestsPath = path.join(testRepoPath, "tests", "testthat") 
const sleep = util.promisify(setTimeout)

suite("TestthatAdapter", () => {
    const workspaceFolder = <vscode.WorkspaceFolder> {
        uri: vscode.Uri.file(testRepoPath),
        name: "testRepo",
        index: 0
    }
    const log = new Log("RExplorer", workspaceFolder, "R Explorer Log");

    test("Is constructed properly", () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);
        assert.ok((<any>testAdapter).watcher);
        assert.strictEqual((<any>testAdapter).disposables.length, 4);
        testAdapter.dispose();
    });

    test("Load is triggered on change", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);
        testAdapter.loadTests = () => <Promise<TestSuiteInfo>>{};
        let tmpFileName = `test-${randomChars()}.R`
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
            tmpdir: testRepoTestsPath
        });
        await sleep(5000);
        assert.ok(testLoadStartedFiredFlag);
        assert.ok(testLoadFinishedFiredFlag);
        testAdapter.dispose();
        await tmpFileResult.cleanup()
        await sleep(1000); //await for cleanup
    });

    test("Tests are loaded correctly", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);
        (<any>testAdapter).isLoading = true;
        let tests = await testAdapter.loadTests()
        assert.ok(equal(tests, testRepoStructure))
        testAdapter.dispose();
    });

});

function randomChars() {
    
    const RANDOM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    const count = 12;

    let
      value = [],
      rnd = null;
  
    try {
      rnd = crypto.randomBytes(count);
    } catch (e) {
      rnd = crypto.pseudoRandomBytes(count);
    }
  
    for (var i = 0; i < 12; i++) {
      value.push(RANDOM_CHARS[rnd[i] % RANDOM_CHARS.length]);
    }
  
    return value.join('');
}


const testRepoStructure: TestSuiteInfo = {
    type: "suite",
    id: "root",
    label: "R (testthat)",
    children: [
        <TestSuiteInfo> { 
            type: "suite",
            id: "test-username.R",
            label: "test-username.R",
            file: path.join(testRepoTestsPath, "test-username.R"),
            children: [
                <TestInfo> {
                    type: "test",
                    id: "test-username.R&username works",
                    label: "username works",
                    file: path.join(testRepoTestsPath, "test-username.R"),
                    line: 3,
                },
                <TestInfo> {
                    type: "test",
                    id: "test-username.R&username fallback works",
                    label: "username fallback works",
                    file: path.join(testRepoTestsPath, "test-username.R"),
                    line: 13,
                }
            ]
        },
        <TestSuiteInfo> { 
            type: "suite",
            id: "test-memoize.R",
            label: "test-memoize.R",
            file: path.join(testRepoTestsPath, "test-memoize.R"),
            children: [
                <TestInfo> {
                    type: "test",
                    id: "test-memoize.R&can memoize",
                    label: "can memoize",
                    file: path.join(testRepoTestsPath, "test-memoize.R"),
                    line: 3,
                },
                <TestInfo> {
                    type: "test",
                    id: "test-memoize.R&non-string argument",
                    label: "non-string argument",
                    file: path.join(testRepoTestsPath, "test-memoize.R"),
                    line: 18,
                }
            ]
        },
        <TestSuiteInfo> { 
            type: "suite",
            id: "test-gh-username.R",
            label: "test-gh-username.R",
            file: path.join(testRepoTestsPath, "test-gh-username.R"),
            children: [
                <TestInfo> {
                    type: "test",
                    id: "test-gh-username.R&Github username works",
                    label: "Github username works",
                    file: path.join(testRepoTestsPath, "test-gh-username.R"),
                    line: 3,
                }
            ]
        },
        <TestSuiteInfo> { 
            type: "suite",
            id: "test-fullname.R",
            label: "test-fullname.R",
            file: path.join(testRepoTestsPath, "test-fullname.R"),
            children: [
                <TestInfo> {
                    type: "test",
                    id: "test-fullname.R&fullname fallback",
                    label: "fullname fallback",
                    file: path.join(testRepoTestsPath, "test-fullname.R"),
                    line: 3,
                },
                <TestInfo> {
                    type: "test",
                    id: "test-fullname.R&fullname works",
                    label: "fullname works",
                    file: path.join(testRepoTestsPath, "test-fullname.R"),
                    line: 16,
                },
                <TestInfo> {
                    type: "test",
                    id: "test-fullname.R&FULLNAME env var",
                    label: "FULLNAME env var",
                    file: path.join(testRepoTestsPath, "test-fullname.R"),
                    line: 26,
                }
            ]
        },
        <TestSuiteInfo> { 
            type: "suite",
            id: "test-fallbacks.R",
            label: "test-fallbacks.R",
            file: path.join(testRepoTestsPath, "test-fallbacks.R"),
            children: [
                <TestInfo> {
                    type: "test",
                    id: "test-fallbacks.R&username() falls back",
                    label: "username() falls back",
                    file: path.join(testRepoTestsPath, "test-fallbacks.R"),
                    line: 3,
                },
                <TestInfo> {
                    type: "test",
                    id: "test-fallbacks.R&fullname() falls back",
                    label: "fullname() falls back",
                    file: path.join(testRepoTestsPath, "test-fallbacks.R"),
                    line: 10,
                },
                <TestInfo> {
                    type: "test",
                    id: "test-fallbacks.R&email_address() falls back",
                    label: "email_address() falls back",
                    file: path.join(testRepoTestsPath, "test-fallbacks.R"),
                    line: 16,
                },
                <TestInfo> {
                    type: "test",
                    id: "test-fallbacks.R&gh_username() falls back",
                    label: "gh_username() falls back",
                    file: path.join(testRepoTestsPath, "test-fallbacks.R"),
                    line: 22,
                }
            ]
        },
        <TestSuiteInfo> { 
            type: "suite",
            id: "test-email.R",
            label: "test-email.R",
            file: path.join(testRepoTestsPath, "test-email.R"),
            children: [
                <TestInfo> {
                    type: "test",
                    id: "test-email.R&Email address works",
                    label: "Email address works",
                    file: path.join(testRepoTestsPath, "test-email.R"),
                    line: 3,
                },
                <TestInfo> {
                    type: "test",
                    id: "test-email.R&EMAIL env var",
                    label: "EMAIL env var",
                    file: path.join(testRepoTestsPath, "test-email.R"),
                    line: 9,
                }
            ]
        },
    ],
}