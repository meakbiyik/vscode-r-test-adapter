import * as vscode from "vscode";

export async function activate(context: vscode.ExtensionContext) {
    const controller = vscode.tests.createTestController("r-test-adapter", "R Test Adapter");
    context.subscriptions.push(controller);
}
