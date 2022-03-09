import * as vscode from "vscode";
import testthatWatcherFactory from "./testthat/watcher";
import testthatParser from "./testthat/parser";
import { TestingTools } from "./main";

const watcherFactories = [testthatWatcherFactory];
const testParsers = [testthatParser];

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
    return Promise.all(
        testParsers.map(async (testParser) => {
            testParser(testingTools, test);
        })
    );
}

export { discoverTestFiles, loadTestsFromFile };
