import * as vscode from "vscode";
import { TestingTools } from "../main";
import parseTestsFromFile from "./parser";

export async function testthatWatcherFactory(
    testingTools: TestingTools,
    workspaceFolder: vscode.WorkspaceFolder
) {
    const pattern = new vscode.RelativePattern(workspaceFolder, "**/tests/testthat/**/test*.R");
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    // When files are created, make sure there's a corresponding "file" node in the tree
    watcher.onDidCreate((uri) => getOrCreateFile(testingTools, uri));
    // When files change, re-parse them. Note that you could optimize this so
    // that you only re-parse children that have been resolved in the past.
    watcher.onDidChange((uri) =>
        parseTestsFromFile(testingTools, getOrCreateFile(testingTools, uri))
    );
    // And, finally, delete TestItems for removed files. This is simple, since
    // we use the URI as the TestItem's ID.
    watcher.onDidDelete((uri) => testingTools.controller.items.delete(uri.toString()));

    for (const file of await vscode.workspace.findFiles(pattern)) {
        getOrCreateFile(testingTools, file);
    }
    return watcher;
}

function getOrCreateFile(testingTools: TestingTools, uri: vscode.Uri) {
    testingTools.log.info(`Creating a file node for ${uri}`);
    const existing = testingTools.controller.items.get(uri.toString());
    if (existing) {
        return existing;
    }

    const file = testingTools.controller.createTestItem(uri.path, uri.path.split("/").pop()!, uri);
    file.canResolveChildren = true;
    return file;
}

export default testthatWatcherFactory;
