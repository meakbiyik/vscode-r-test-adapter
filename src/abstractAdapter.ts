import * as vscode from "vscode";
import * as path from "path";
import {
    TestAdapter,
    TestLoadStartedEvent,
    TestLoadFinishedEvent,
    TestRunStartedEvent,
    TestRunFinishedEvent,
    TestSuiteEvent,
    TestEvent,
    TestSuiteInfo,
} from "vscode-test-adapter-api";
import { Log } from "vscode-test-adapter-util";
import { exec } from "child_process";
import { ChildProcess } from "child_process";

export abstract class RAdapter implements TestAdapter {
    public disposables: { dispose(): void }[] = [];
    public processes: Set<ChildProcess> = new Set();
    public tempFilePaths: Set<string> = new Set();

    readonly testsEmitter = new vscode.EventEmitter<TestLoadStartedEvent | TestLoadFinishedEvent>();
    readonly testStatesEmitter = new vscode.EventEmitter<
        TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent
    >();
    readonly autorunEmitter = new vscode.EventEmitter<void>();
    public abstract watcher: vscode.FileSystemWatcher;
    private loadTimeout = setTimeout(() => {}, 1);

    get tests(): vscode.Event<TestLoadStartedEvent | TestLoadFinishedEvent> {
        return this.testsEmitter.event;
    }
    get testStates(): vscode.Event<
        TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent
    > {
        return this.testStatesEmitter.event;
    }
    get autorun(): vscode.Event<void> | undefined {
        return this.autorunEmitter.event;
    }

    constructor(
        public readonly workspace: vscode.WorkspaceFolder,
        public readonly log: Log,
        public name: string
    ) {
        this.log.info(`Initializing ${this.name} adapter`);

        this.disposables.push(this.testsEmitter);
        this.disposables.push(this.testStatesEmitter);
        this.disposables.push(this.autorunEmitter);
    }

    abstract loadTests(): Promise<TestSuiteInfo>;
    abstract runTests(tests: string[]): Promise<void>;

    loadOnChange(e: vscode.Uri) {
        if (!this.tempFilePaths.has(path.normalize(e.fsPath))) {
            clearTimeout(this.loadTimeout);
            this.loadTimeout = setTimeout(() => {
                this.load();
            }, 1000);
        }
    }

    async load(): Promise<void> {
        this.log.info(`Loading ${this.name} tests`);
        this.testsEmitter.fire(<TestLoadStartedEvent>{ type: "started" });
        const loadedTests = await this.loadTests();
        this.testsEmitter.fire(<TestLoadFinishedEvent>{
            type: "finished",
            suite: loadedTests,
        });
    }

    async run(tests: string[]): Promise<void> {
        this.log.info(`Running ${this.name} tests ${JSON.stringify(tests)}`);
        this.testStatesEmitter.fire(<TestRunStartedEvent>{
            type: "started",
            tests,
        });
        await this.runTests(tests);
        this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: "finished" });
    }

    cancel(): void {
        for (const childProcess of this.processes) {
            childProcess.kill();
            if (process.platform == "win32") {
                exec(`taskkill /pid  ${childProcess.pid} /f /t`);
            }
        }
        this.processes = new Set();
        this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: "finished" });
    }

    dispose(): void {
        this.cancel();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }
}
