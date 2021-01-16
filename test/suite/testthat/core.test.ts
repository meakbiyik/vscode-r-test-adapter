import * as core from "../../../src/testthat/adapter";
import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import { assert } from "../../helpers";

suite("TestthatAdapter", () => {
    const workspaceFolder = (vscode.workspace.workspaceFolders || [])[0];
    const log = new Log("RExplorer", workspaceFolder, "R Explorer Log");

    test("Disposable without error", () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);
        testAdapter.dispose();
    });

    test("Is constructed properly", () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);
        assert.ok((<any>testAdapter).watcher);
        assert.strictEqual((<any>testAdapter).disposables.length, 4);
        testAdapter.dispose();
    });

    test("Fires load events", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);
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
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);
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
});
