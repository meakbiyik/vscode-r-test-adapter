import * as vscode from "vscode";
import testthatWatcherFactory from "./testthat/watcher";
import testthatParser from "./testthat/parser";
import { ItemFramework, TestingTools, TestParser } from "./util";

const watcherFactories = [testthatWatcherFactory];
const testParsers: Record<ItemFramework, TestParser> = {
    testthat: testthatParser,
};

async function discoverTestFiles(testingTools: TestingTools) {
    if (!vscode.workspace.workspaceFolders) {
        testingTools.log.info("There is no open workspace, no need to register a file watcher.");
        return <vscode.FileSystemWatcher[][]>[[]]; // handle the case of no open folders
    }

    return Promise.all(
        vscode.workspace.workspaceFolders.map(async (workspaceFolder) => {
            testingTools.log.info(`Registering file watchers for ${workspaceFolder.uri}`);
            let watchers = [];
            for (const watcherFactory of watcherFactories) {
                const watcher = await watcherFactory(testingTools, workspaceFolder);
                watchers.push(watcher);
            }
            return watchers;
        })
    );
}

async function loadTestsFromFile(testingTools: TestingTools, test: vscode.TestItem) {
    testingTools.log.info(`Parsing test file ${test.uri}`);
    const getFramework = (testItem: vscode.TestItem) =>
        testingTools.testItemData.get(testItem)!.itemFramework;
    const framework = getFramework(test);
    testingTools.log.info(`Test file framework: ${framework}`);

    let tests;
    try {
        test.busy = true;
        tests = testParsers[framework](testingTools, test);
        test.busy = false;
    } catch (error) {
        test.busy = false;
        test.error = String(error);
        testingTools.log.error(`Parsing test file errored with reason: ${error}`);
        testingTools.log.error(error);
        tests = undefined;
    }

    return tests;
}

export { discoverTestFiles, loadTestsFromFile };
