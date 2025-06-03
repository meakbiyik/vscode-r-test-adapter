import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";

export const R_DEBUGGER_EXTENSION_ID = "rdebugger.r-debugger";

export enum ItemType {
    File = "file",
    TestCase = "test",
}

export enum ItemFramework {
    Testthat = "testthat",
}

export interface TestingTools {
    controller: vscode.TestController;
    log: Log;
    testItemData: WeakMap<
        vscode.TestItem,
        {
            itemType: ItemType;
            itemFramework: ItemFramework;
        }
    >;
    tempFilePaths: String[];
    context: vscode.ExtensionContext;
}

export interface TestParser {
    (testingTools: TestingTools, file: vscode.TestItem): Promise<void>;
}

export interface TestRunner {
    (testingTools: TestingTools, run: vscode.TestRun, test: vscode.TestItem, isDebugMode: boolean): Promise<string>;
}

export function isExtensionEnabled(
    extensionId: string
): boolean {
    return vscode.extensions.getExtension(extensionId) != undefined;
}
