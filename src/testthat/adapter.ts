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
import { parseTestsFromFile, encodeNodeId } from "./parser";
import { runAllTests, runSingleTestFile, runSingleTest, runDescribeTestSuite } from "./runner";

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

    async loadTests(): Promise<TestSuiteInfo> {
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
            return this.testSuite;
        }

        for (const testFile of testFiles) {
            if (this.tempFilePaths.has(path.normalize(testFile.fsPath))) continue;
            try {
                let tests_in_file = await parseTestsFromFile(this, testFile);
                this.testSuite.children.push(tests_in_file);
            } catch (error) {
                this.log.error(error);
            }
        }

        return Promise.resolve(this.testSuite);
    }

    async runTests(tests: string[]): Promise<void> {
        for (const suiteOrTestId of tests) {
            const node = this.findNode(this.testSuite, suiteOrTestId);
            if (node) {
                await this.runNode(node);
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

    async runNode(node: TestSuiteInfo | TestInfo): Promise<void> {
        let testStatesEmitter: vscode.EventEmitter<
            TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent
        > = this.testStatesEmitter;

        let stdout: string | undefined;

        this.callRecursive(node, (node) => {
            if (node.type === "suite") {
                testStatesEmitter.fire(<TestSuiteEvent>{
                    type: "suite",
                    suite: node.id,
                    state: "running",
                });
            } else {
                testStatesEmitter.fire(<TestEvent>{
                    type: "test",
                    test: node.id,
                    state: "running",
                });
            }
        });

        try {
            if (node.type === "suite" && node.id === "root") {
                stdout = await runAllTests(this);
            } else if (node.type === "suite" && node.line === undefined) {
                stdout = await runSingleTestFile(this, node.file!);
            } else if (node.type === "suite") {
                stdout = await runDescribeTestSuite(this, node);
            } else {
                stdout = await runSingleTest(this, node);
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
                    });
                }
            });
        }

        if (stdout !== undefined) {
            this.emitTestResults(stdout, node, testStatesEmitter);
        }

        this.callRecursive(node, (node) => {
            if (node.type === "suite") {
                testStatesEmitter.fire(<TestSuiteEvent>{
                    type: "suite",
                    suite: node.id,
                    state: "completed",
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

    emitTestResults(
        stdout: string,
        node: TestSuiteInfo | TestInfo,
        testStatesEmitter: vscode.EventEmitter<
            TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent
        >
    ) {
        let fileName = node.file ? path.basename(node.file) : undefined;
        let failedTests = this.getFailedTests(stdout, fileName);
        let skippedTests = this.getSkippedTests(stdout, fileName);
        this.callRecursive(node, (node) => {
            if (node.type === "test") {
                let state = "passed";
                let message = undefined;
                if (failedTests.has(node.id)) {
                    state = "failed";
                    message = failedTests.get(node.id);
                }
                if (skippedTests.has(node.id)) {
                    state = "skipped";
                    message = skippedTests.get(node.id);
                }
                testStatesEmitter.fire(<TestEvent>{
                    type: "test",
                    test: node.id,
                    state: state,
                    message: message,
                });
            }
        });
    }

    getFailedTests(stdout: string, testFileName?: string) {
        const failureRegex = /(failure|error) \((?<fileName>.+?):\d+:\d+\): (?<label>.+)(\r\n|\r|\n)(?<reason>[\w\W]+?)(?=(\n\s*skip|\n\s*failure|\n\s*warn|\n\s*error|[-─]{10,}))/gi;
        let failedTests = new Map<string, string>();
        let match;
        while ((match = failureRegex.exec(stdout))) {
            let testLabel = match.groups!["label"];
            let fileName = match.groups!["fileName"];
            let reason = match.groups!["reason"];
            let id = testFileName
                ? encodeNodeId(testFileName, testLabel)
                : encodeNodeId(fileName, testLabel);
            let previousReasons = failedTests.get(id) ? failedTests.get(id) : "";
            failedTests.set(id, previousReasons + reason + "\n\n");
        }
        return failedTests;
    }

    getSkippedTests(stdout: string, testFileName?: string) {
        const skipRegex = /skip \((?<fileName>.+?):\d+:\d+\): (?<label>.+)(\r\n|\r|\n)(?<reason>[\w\W]+?)(?=(\n\s*skip|\n\s*failure|\n\s*warn|\n\s*error|[-─]{10,}))/gi;
        let skippedTests = new Map<string, string>();
        let match;
        while ((match = skipRegex.exec(stdout))) {
            let testLabel = match.groups!["label"];
            let fileName = match.groups!["fileName"];
            let reason = match.groups!["reason"];
            let id = testFileName
                ? encodeNodeId(testFileName, testLabel)
                : encodeNodeId(fileName, testLabel);
            let previousReasons = skippedTests.get(id) ? skippedTests.get(id) : "";
            skippedTests.set(id, previousReasons + reason + "\n\n");
        }
        return skippedTests;
    }
}
