import * as vscode from "vscode";
import { match } from "minimatch";
import { ItemFramework, TestingTools, getOrCreateFile } from "../util";

export async function tinytestWatcherFactory(
    testingTools: TestingTools,
    workspaceFolder: vscode.WorkspaceFolder
) {
    testingTools.log.info("Registering testthat watchers");
    const pattern = new vscode.RelativePattern(workspaceFolder, "**/inst/tinytest/**/test*.R");
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    // Check that tests are not from RCMD and are not temp files
    const RCMDpattern = "**/check/*.Rcheck/**";
    const isValid = (uri: vscode.Uri) =>
        match([uri.path], RCMDpattern).length == 0 &&
        !testingTools.tempFilePaths.includes(uri.fsPath);

    // When files are created, make sure there's a corresponding "file" node in the tree
    watcher.onDidCreate((uri) => (isValid(uri) ? getOrCreateFile(ItemFramework.Tinytest, testingTools, uri, false) : undefined));
    // When files change, re-parse them. Note that you could optimize this so
    // that you only re-parse children that have been resolved in the past.
    watcher.onDidChange((uri) =>
        isValid(uri)
            ? testingTools.controller.createTestItem(uri.fsPath.toString(), uri.fsPath.toString(), uri)
            : undefined
    );
    // And, finally, delete TestItems for removed files. This is simple, since
    // we use the URI as the TestItem's ID.
    watcher.onDidDelete((uri) =>
        isValid(uri) ? testingTools.controller.items.delete(uri.path) : undefined
    );

    testingTools.log.info("Detecting tinytest test files");
    for (const file of await vscode.workspace.findFiles(pattern, RCMDpattern)) {
        getOrCreateFile(ItemFramework.Tinytest, testingTools, file, false);
    }
    return watcher;
}

export default tinytestWatcherFactory;
