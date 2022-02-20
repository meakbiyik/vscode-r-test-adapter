import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import { expect } from "chai";
import * as path from "path";
import * as tmp from "tmp-promise";
import { exec } from "child_process";
import { RAdapter } from "../../src/abstractAdapter";
import { TestSuiteInfo } from "vscode-test-adapter-api";

const testRepoPath = path.join(__dirname, "..", "..", "..", "test", "testRepo");
const testRepoTestsPath = path.join(testRepoPath, "tests", "testthat");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

    loadTests() {
        return <Promise<{ tests: TestSuiteInfo; errorMessage?: string }>>{};
    }
    runTests(a: string[]) {
        return <Promise<void>>{};
    }
}

suite("abstractAdapter", () => {
    const workspaceFolder = <vscode.WorkspaceFolder>{
        uri: vscode.Uri.file(testRepoPath),
        name: "testRepo",
        index: 0,
    };
    const log = new Log("FakeExplorer", workspaceFolder, "Fake Explorer Log");

    test("Is constructed properly", () => {
        let testAdapter = new FakeAdapter(workspaceFolder, log);
        expect((<any>testAdapter).watcher).to.exist;
        expect((<any>testAdapter).disposables).to.have.lengthOf(4);
        testAdapter.dispose();
    });

    test("Load is triggered on change", async () => {
        let testAdapter = new FakeAdapter(workspaceFolder, log);
        testAdapter.loadTests = async () => {
            return Promise.resolve({
                tests: {
                    type: "suite",
                    id: "",
                    label: "",
                    children: [],
                },
            });
        };
        let tmpFileName = `test-temp.R`;
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
        await sleep(1000); //await for cleanup
    });

    test("Load is not triggered when file is temporary", async () => {
        let testAdapter = new FakeAdapter(workspaceFolder, log);
        testAdapter.loadTests = () => {
            return Promise.resolve({
                tests: {
                    type: "suite",
                    id: "",
                    label: "",
                    children: [],
                },
            });
        };
        let tmpFileName = `test-temp.R`;
        let tmpFilePath = path.normalize(path.join(testRepoTestsPath, tmpFileName));
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
            tmpdir: testRepoTestsPath,
        });
        await sleep(5000);
        expect(testLoadStartedFiredFlag).to.be.false;
        expect(testLoadFinishedFiredFlag).to.be.false;
        testAdapter.dispose();
        await tmpFileResult.cleanup();
        await sleep(1000); //await for cleanup
    });

    test("Fires load events", async () => {
        let testAdapter = new FakeAdapter(workspaceFolder, log);
        testAdapter.loadTests = () => {
            return Promise.resolve({
                tests: {
                    type: "suite",
                    id: "",
                    label: "",
                    children: [],
                },
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
        expect(testLoadStartedFiredFlag).to.be.true;
        expect(testLoadFinishedFiredFlag).to.be.true;
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
        expect(testRunStartedFiredFlag).to.be.true;
        expect(testRunFinishedFiredFlag).to.be.true;
        testAdapter.dispose();
    });

    test("Cancels processes successfully", async () => {
        let testAdapter = new FakeAdapter(workspaceFolder, log);
        let sleepCall = "Sys.sleep(30)";
        let command = `Rscript -e "${sleepCall}"`;
        let errorInProcess = false;
        (<any>testAdapter).isRunning = true;
        let childProcess = exec(command, (err, _stdout: string, stderr: string) => {
            if (err) errorInProcess = true;
        });
        testAdapter.childProcess = childProcess;
        testAdapter.cancel();
        await sleep(15000); // especially in local, it takes some time to cancel
        expect(childProcess.killed).to.be.true;
        expect(errorInProcess).to.be.true;
        testAdapter.dispose();
    }).retries(10);

    test("Disposable without error", () => {
        let testAdapter = new FakeAdapter(workspaceFolder, log);
        testAdapter.dispose();
    });
});
