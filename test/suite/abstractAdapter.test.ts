import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import { assert } from "../helpers";
import * as path from "path";
import * as tmp from "tmp-promise";
import * as crypto from "crypto";
import { exec } from "child_process";
import { RAdapter } from "../../src/abstractAdapter";
import { TestSuiteInfo } from "vscode-test-adapter-api";

const testRepoPath = path.join(__dirname, "..", "..", "..", "test", "testRepo")
const testRepoTestsPath = path.join(testRepoPath, "tests", "testthat") 
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class FakeAdapter extends RAdapter {

    public watcher: vscode.FileSystemWatcher;

    constructor(public readonly workspace: vscode.WorkspaceFolder, public readonly log: Log) {
        super(workspace, log, "fake");

        this.watcher = vscode.workspace.createFileSystemWatcher("**/tests/testthat/**/test*.R");

        // bind 'this' to object
        let boundLoadOnChange = (e: vscode.Uri) => {
            this.loadOnChange(e);
        };

        this.watcher.onDidChange(boundLoadOnChange);
        this.watcher.onDidCreate(boundLoadOnChange);
        this.watcher.onDidDelete(boundLoadOnChange);
        this.disposables.push(this.watcher);
    }

    loadTests () {return <Promise<TestSuiteInfo>> {}};
    runTests(a: string[]) {return <Promise<void>> {}};

}

suite("abstractAdapter", () => {
    const workspaceFolder = <vscode.WorkspaceFolder> {
        uri: vscode.Uri.file(testRepoPath),
        name: "testRepo",
        index: 0
    }
    const log = new Log("FakeExplorer", workspaceFolder, "Fake Explorer Log");

    test("Is constructed properly", () => {
        let testAdapter = new FakeAdapter(workspaceFolder, log);
        assert.ok((<any>testAdapter).watcher);
        assert.strictEqual((<any>testAdapter).disposables.length, 4);
        testAdapter.dispose();
    });

    test("Load is triggered on change", async () => {
        let testAdapter = new FakeAdapter(workspaceFolder, log);
        testAdapter.loadTests = async () => {
            return Promise.resolve({
                type: "suite",
                id: "",
                label: "",
                children: [],
            });
        };
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

    test("Load is not triggered when file is temporary", async () => {
        let testAdapter = new FakeAdapter(workspaceFolder, log);
        testAdapter.loadTests = () => {
            return Promise.resolve({
                type: "suite",
                id: "",
                label: "",
                children: [],
            });
        };
        let tmpFileName = `test-${randomChars()}.R`
        let tmpFilePath = path.normalize(path.join(testRepoTestsPath, tmpFileName))
        testAdapter.tempFilePaths.add(tmpFilePath);
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
        assert.ok(!testLoadStartedFiredFlag);
        assert.ok(!testLoadFinishedFiredFlag);
        testAdapter.dispose();
        await tmpFileResult.cleanup()
        await sleep(1000); //await for cleanup
    });

    test("Fires load events", async () => {
        let testAdapter = new FakeAdapter(workspaceFolder, log);
        testAdapter.loadTests = () => {
            return Promise.resolve({
                type: "suite",
                id: "",
                label: "",
                children: [],
            });
        };
        let testLoadStartedFiredFlag = false;
        let testLoadFinishedFiredFlag = false;
        testAdapter.testsEmitter.event((e) => {
            if (e.type == "started") testLoadStartedFiredFlag = true;
        });
        testAdapter.testsEmitter.event((e) => {
            if (e.type == "finished") testLoadFinishedFiredFlag = true;
        });
        await testAdapter.load();
        assert.ok(testLoadStartedFiredFlag);
        assert.ok(testLoadFinishedFiredFlag);
        testAdapter.dispose();
    });

    test("Fires run events", async () => {
        let testAdapter = new FakeAdapter(workspaceFolder, log);
        testAdapter.runTests = (a) => {
            return Promise.resolve();
        };
        let testRunStartedFiredFlag = false;
        let testRunFinishedFiredFlag = false;
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "started") testRunStartedFiredFlag = true;
        });
        testAdapter.testStatesEmitter.event((e) => {
            if (e.type == "finished") testRunFinishedFiredFlag = true;
        });
        await testAdapter.run([]);
        assert.ok(testRunStartedFiredFlag);
        assert.ok(testRunFinishedFiredFlag);
        testAdapter.dispose();
    });

    test("Cancels processes successfully", async () => {
        let testAdapter = new FakeAdapter(workspaceFolder, log);
        let sleepCall = "Sys.sleep(30)";
        let command = `Rscript -e "${sleepCall}"`;
        let errorInProcess = false;
        (<any>testAdapter).isRunning = true;
        let childProcess = exec(command, (err, _stdout: string, stderr: string) => {if (err) errorInProcess=true;});
        testAdapter.childProcess = childProcess;
        testAdapter.cancel()
        await sleep(500); // especially in local, it takes some time to cancel
        assert.ok(childProcess.killed && errorInProcess)
        testAdapter.dispose();
    })

    test("Disposable without error", () => {
        let testAdapter = new FakeAdapter(workspaceFolder, log);
        testAdapter.dispose();
    });

});

function randomChars() {
    
    const RANDOM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    const count = 12;

    let
      value = [],
      rnd = null;
  
    // make sure that we do not fail because we ran out of entropy
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
