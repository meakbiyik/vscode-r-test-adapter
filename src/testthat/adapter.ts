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
import { RAdapter } from "../abstractAdapter";
import { parseTestsFromFile, encodeNodeId } from "./parser";
import { runAllTests, runSingleTestFile, runTest } from "./runner";

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
            testFiles = await vscode.workspace.findFiles("**/tests/testthat/**/test*.R");
        } catch (error) {
            this.log.error(error);
            return this.testSuite;
        }

        for (const testFile of testFiles) {
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

        if (node.type === "suite" && node.id === "root") {
            testStatesEmitter.fire(<TestSuiteEvent>{
                type: "suite",
                suite: node.id,
                state: "running",
            });

            for (const file of <TestSuiteInfo[]>node.children) {
                for (const test of file.children) {
                    testStatesEmitter.fire(<TestEvent>{
                        type: "test",
                        test: test.id,
                        state: "running",
                    });
                }
            }

            try {
                let stdout = await runAllTests(this);
                let failedTests = this.getFailedTests(stdout);
                let skippedTests = this.getSkippedTests(stdout);
                for (const file of <TestSuiteInfo[]>node.children) {
                    for (const test of file.children) {
                        if (failedTests.has(test.id)) {
                            testStatesEmitter.fire(<TestEvent>{
                                type: "test",
                                test: test.id,
                                state: "failed",
                                message: failedTests.get(test.id),
                            });
                        } else if (skippedTests.has(test.id)) {
                            testStatesEmitter.fire(<TestEvent>{
                                type: "test",
                                test: test.id,
                                state: "skipped",
                                message: skippedTests.get(test.id),
                            });
                        } else {
                            testStatesEmitter.fire(<TestEvent>{
                                type: "test",
                                test: test.id,
                                state: "passed",
                            });
                        }
                    }
                }
            } catch (error) {
                this.log.error(error);
                for (const file of <TestSuiteInfo[]>node.children) {
                    for (const test of file.children) {
                        testStatesEmitter.fire(<TestEvent>{
                            type: "test",
                            test: test.id,
                            state: "errored",
                        });
                    }
                }
            }

            testStatesEmitter.fire(<TestSuiteEvent>{
                type: "suite",
                suite: node.id,
                state: "completed",
            });
        } else if (node.type === "suite") {
            testStatesEmitter.fire(<TestSuiteEvent>{
                type: "suite",
                suite: node.id,
                state: "running",
            });

            for (const test of node.children) {
                testStatesEmitter.fire(<TestEvent>{
                    type: "test",
                    test: test.id,
                    state: "running",
                });
            }

            try {
                let stdout = await runSingleTestFile(this, node.file!);
                let failedTests = this.getFailedTests(stdout);
                let skippedTests = this.getSkippedTests(stdout);
                for (const test of node.children) {
                    if (failedTests.has(test.id)) {
                        testStatesEmitter.fire(<TestEvent>{
                            type: "test",
                            test: test.id,
                            state: "failed",
                            message: failedTests.get(test.id),
                        });
                    } else if (skippedTests.has(test.id)) {
                        testStatesEmitter.fire(<TestEvent>{
                            type: "test",
                            test: test.id,
                            state: "skipped",
                            message: skippedTests.get(test.id),
                        });
                    } else {
                        testStatesEmitter.fire(<TestEvent>{
                            type: "test",
                            test: test.id,
                            state: "passed",
                        });
                    }
                }
            } catch (error) {
                this.log.error(error);
                for (const test of node.children) {
                    testStatesEmitter.fire(<TestEvent>{
                        type: "test",
                        test: test.id,
                        state: "errored",
                    });
                }
            }

            testStatesEmitter.fire(<TestSuiteEvent>{
                type: "suite",
                suite: node.id,
                state: "completed",
            });
        } else {
            // node.type === 'test'

            testStatesEmitter.fire(<TestEvent>{
                type: "test",
                test: node.id,
                state: "running",
            });

            try {
                let stdout = await runTest(this, node);
                let failedTests = this.getFailedTests(stdout, node.id.split("&")[0]);
                let skippedTests = this.getSkippedTests(stdout, node.id.split("&")[0]);
                if (failedTests.has(node.id)) {
                    testStatesEmitter.fire(<TestEvent>{
                        type: "test",
                        test: node.id,
                        state: "failed",
                        message: failedTests.get(node.id),
                    });
                } else if (skippedTests.has(node.id)) {
                    testStatesEmitter.fire(<TestEvent>{
                        type: "test",
                        test: node.id,
                        state: "skipped",
                        message: skippedTests.get(node.id),
                    });
                } else {
                    testStatesEmitter.fire(<TestEvent>{
                        type: "test",
                        test: node.id,
                        state: "passed",
                    });
                }
            } catch (error) {
                this.log.error(error);
                testStatesEmitter.fire(<TestEvent>{
                    type: "test",
                    test: node.id,
                    state: "errored",
                });
            }
        }
    }

    getFailedTests(stdout: string, filename?: string) {
        const failureRegex = /(failure|error) \((?<fileName>.+?):\d+:\d+\): (?<label>.+)(\r\n|\r|\n)(?<reason>[\w\W]+?)(?=(\n\s*skip|\n\s*failure|\n\s*warn|\n\s*error|[-─]{10,}))/gi;
        let failedTests = new Map<string, string>();
        let match;
        while ((match = failureRegex.exec(stdout))) {
            let testLabel = match.groups!["label"];
            let fileName = filename ? filename : match.groups!["fileName"];
            let reason = match.groups!["reason"];
            let id = encodeNodeId(fileName, testLabel)
            let previousReasons = failedTests.get(id)?failedTests.get(id):""
            failedTests.set(id, previousReasons + reason + "\n\n");
        }
        return failedTests;
    }

    getSkippedTests(stdout: string, filename?: string) {
        const skipRegex = /skip \((?<fileName>.+?):\d+:\d+\): (?<label>.+)(\r\n|\r|\n)(?<reason>[\w\W]+?)(?=(\n\s*skip|\n\s*failure|\n\s*warn|\n\s*error|[-─]{10,}))/gi;
        let skippedTests = new Map<string, string>();
        let match;
        while ((match = skipRegex.exec(stdout))) {
            let testLabel = match.groups!["label"];
            let fileName = filename ? filename : match.groups!["fileName"];
            let reason = match.groups!["reason"];
            let id = encodeNodeId(fileName, testLabel)
            let previousReasons = skippedTests.get(id)?skippedTests.get(id):""
            skippedTests.set(id, previousReasons + reason + "\n\n");
        }
        return skippedTests;
    }
}
