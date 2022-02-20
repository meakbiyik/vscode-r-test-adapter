import * as vscode from "vscode";
import {
    TestSuiteInfo,
    TestInfo,
    TestRunStartedEvent,
    TestRunFinishedEvent,
    TestSuiteEvent,
    TestEvent,
} from "vscode-test-adapter-api";
import { Log } from "vscode-test-adapter-util";
import * as path from "path";
import { RAdapter } from "../abstractAdapter";
import { parseTestsFromFile } from "./parser";
import { runSingleTestFile, runSingleTest, runDescribeTestSuite } from "./runner";

export class TestthatAdapter extends RAdapter {
    testSuite!: TestSuiteInfo;
    public watcher: vscode.FileSystemWatcher;

    constructor(public readonly workspace: vscode.WorkspaceFolder, public readonly log: Log) {
        super(workspace, log, "testthat");

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

    async loadTests(): Promise<{ tests: TestSuiteInfo; errorMessage?: string }> {
        this.testSuite = {
            type: "suite",
            id: "root",
            label: "R (testthat)",
            children: [],
        };

        let testFiles;
        try {
            testFiles = await vscode.workspace.findFiles(
                "**/tests/testthat/**/test*.R",
                "**/check/*.Rcheck/**"
            );
        } catch (error) {
            this.log.error(error);
            let error_message = String(error);
            return Promise.resolve({ tests: this.testSuite, errorMessage: error_message });
        }

        for (const testFile of testFiles) {
            if (this.tempFilePaths.has(path.normalize(testFile.fsPath))) continue;
            try {
                let testsInFile = await parseTestsFromFile(this, testFile);
                let packageName = testsInFile
                    .file!.replace(/\\/g, "/")
                    .match(/.+?\/([^/]+?)\/tests\/testthat.+?/i);
                if (packageName !== null) {
                    let packageNode = <TestSuiteInfo>(
                        this.findNode(this.testSuite, `package-${packageName[1]}`)
                    );
                    if (packageNode === undefined) {
                        packageNode = <TestSuiteInfo>{
                            type: "suite",
                            id: `package-${packageName[1]}`,
                            label: packageName[1],
                            children: [],
                        };
                        this.testSuite.children.push(packageNode);
                    }
                    packageNode.children.push(testsInFile);
                } else {
                    this.testSuite.children.push(testsInFile);
                }
            } catch (error) {
                this.log.error(error);
            }
        }

        return Promise.resolve({ tests: this.testSuite });
    }

    async runTests(tests: string[], testRunId: string): Promise<void> {
        for (const suiteOrTestId of tests) {
            const node = this.findNode(this.testSuite, suiteOrTestId);
            if (node) {
                await this.runNode(node, testRunId);
            }
        }
    }

    findNode(
        searchNode: TestSuiteInfo | TestInfo,
        id: string
    ): TestSuiteInfo | TestInfo | undefined {
        if (searchNode.id === id) {
            return searchNode;
        } else if (searchNode.type === "suite") {
            for (const child of searchNode.children) {
                const found = this.findNode(child, id);
                if (found) return found;
            }
        }
        return undefined;
    }

    async runNode(node: TestSuiteInfo | TestInfo, testRunId: string): Promise<void> {
        let testStatesEmitter: vscode.EventEmitter<
            TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent
        > = this.testStatesEmitter;

        if (node.type === "suite") {
            testStatesEmitter.fire(<TestSuiteEvent>{
                type: "suite",
                suite: node.id,
                state: "running",
                testRunId,
            });
        }

        try {
            if (node.type === "suite" && node.file === undefined) {
                for (const child of node.children) {
                    await this.runNode(child, testRunId);
                }
            } else if (node.type === "suite" && node.line === undefined) {
                await runSingleTestFile(this, node.file!, node, testRunId);
            } else if (node.type === "suite") {
                await runDescribeTestSuite(this, node, testRunId);
            } else {
                await runSingleTest(this, node, testRunId);
            }
        } catch (error) {
            this.log.error(error);
            this.callRecursive(node, (node) => {
                if (node.type === "test") {
                    testStatesEmitter.fire(<TestEvent>{
                        type: "test",
                        test: node.id,
                        state: "errored",
                        message: error,
                        testRunId,
                    });
                }
            });
        }

        this.callRecursive(node, (node) => {
            if (node.type === "suite") {
                testStatesEmitter.fire(<TestSuiteEvent>{
                    type: "suite",
                    suite: node.id,
                    state: "completed",
                    testRunId,
                });
            }
        });
    }

    callRecursive(
        startNode: TestSuiteInfo | TestInfo,
        func: (node: TestSuiteInfo | TestInfo) => void
    ) {
        func(startNode);
        if (startNode.type === "suite") {
            for (const child of startNode.children) this.callRecursive(child, func);
        }
    }
}
