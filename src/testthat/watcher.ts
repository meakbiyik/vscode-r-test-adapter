import * as vscode from "vscode";
import { match } from "minimatch";
import { ItemFramework, ItemType, TestingTools } from "../util";
import parseTestsFromFile from "./parser";

export async function testthatWatcherFactory(
    testingTools: TestingTools,
    workspaceFolder: vscode.WorkspaceFolder
) {
    testingTools.log.info("Registering testthat watchers");
    const pattern = new vscode.RelativePattern(workspaceFolder, "**/tests/testthat/**/test*.R");
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    // Check that tests are not from RCMD and are not temp files
    const RCMDpattern = "**/check/*.Rcheck/**";
    const isValid = (uri: vscode.Uri) =>
        match([uri.path], RCMDpattern).length == 0 &&
        !testingTools.tempFilePaths.includes(uri.fsPath);

    // When files are created, make sure there's a corresponding "file" node in the tree
    watcher.onDidCreate((uri) => (isValid(uri) ? getOrCreateFile(testingTools, uri) : undefined));
    // When files change, re-parse them. Note that you could optimize this so
    // that you only re-parse children that have been resolved in the past.
    watcher.onDidChange((uri) =>
        isValid(uri)
            ? parseTestsFromFile(testingTools, getOrCreateFile(testingTools, uri))
            : undefined
    );
    // And, finally, delete TestItems for removed files. This is simple, since
    // we use the URI as the TestItem's ID.
    watcher.onDidDelete((uri) =>
        isValid(uri) ? testingTools.controller.items.delete(uri.path) : undefined
    );

    testingTools.log.info("Detecting testthat test files");
    for (const file of await vscode.workspace.findFiles(pattern, RCMDpattern)) {
        getOrCreateFile(testingTools, file);
    }
    return watcher;
}

function getOrCreateFile(testingTools: TestingTools, uri: vscode.Uri) {
    const existing = testingTools.controller.items.get(uri.toString());
    if (existing) {
        testingTools.log.info(`Found a file node for ${uri}`);
        return existing;
    }

    testingTools.log.info(`Creating a file node for ${uri}`);
    const file = testingTools.controller.createTestItem(uri.path, uri.path.split("/").pop()!, uri);
    testingTools.testItemData.set(file, {
        itemType: ItemType.File,
        itemFramework: ItemFramework.Testthat,
    });
    file.canResolveChildren = true;
    testingTools.controller.items.add(file);

    return file;
}

const _unittestable = {
    getOrCreateFile,
};

export default testthatWatcherFactory;
export { _unittestable };
