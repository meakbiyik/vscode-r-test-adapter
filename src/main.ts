import * as vscode from "vscode";
import { TestHub, testExplorerExtensionId } from "vscode-test-adapter-api";
import { Log, TestAdapterRegistrar } from "vscode-test-adapter-util";
import { TestthatAdapter } from "./testthat/adapter";

export async function activate(context: vscode.ExtensionContext) {
    const workspaceFolder = (vscode.workspace.workspaceFolders || [])[0];

    // create a simple logger that can be configured with the configuration variables
    // `RExplorer.logpanel` and `RExplorer.logfile`
    const log = new Log("RExplorer", workspaceFolder, "R Explorer Log");
    context.subscriptions.push(log);

    // get the Test Explorer extension
    const testExplorerExtension = vscode.extensions.getExtension<TestHub>(testExplorerExtensionId);
    if (log.enabled) log.info(`Test Explorer ${testExplorerExtension ? "" : "not "}found`);

    if (testExplorerExtension) {
        const testHub = testExplorerExtension.exports;

        // this will register an RTestAdapter for each WorkspaceFolder
        context.subscriptions.push(
            new TestAdapterRegistrar(
                testHub,
                (workspaceFolder) => new TestthatAdapter(workspaceFolder, log),
                log
            )
        );
    }
}
