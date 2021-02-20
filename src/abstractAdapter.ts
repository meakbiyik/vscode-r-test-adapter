import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
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
    public childProcess: ChildProcess | undefined = undefined;
    public tempFilePaths: Set<string> = new Set();

    readonly testsEmitter = new vscode.EventEmitter<TestLoadStartedEvent | TestLoadFinishedEvent>();
    readonly testStatesEmitter = new vscode.EventEmitter<
        TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent
    >();
    readonly autorunEmitter = new vscode.EventEmitter<void>();

    private isLoading = false;
    private isRunning = false;
    private loadTimeout = setTimeout(() => {}, 1);

    public abstract watcher: vscode.FileSystemWatcher;

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

        this.log.info(`Initialized ${this.name} adapter`);
    }

    abstract loadTests(): Promise<TestSuiteInfo>;
    abstract runTests(tests: string[]): Promise<void>;

    loadOnChange(e: vscode.Uri) {
        if (!this.tempFilePaths.has(path.normalize(e.fsPath)) && fs.existsSync(e.fsPath)) {
            clearTimeout(this.loadTimeout);
            this.loadTimeout = setTimeout(() => {
                this.load();
            }, 1000);
        }
    }

    async load(): Promise<void> {
        if (this.isLoading) return;
        this.isLoading = true;
        this.log.info(`Loading ${this.name} tests`);

        this.testsEmitter.fire(<TestLoadStartedEvent>{ type: "started" });
        const loadedTests = await this.loadTests();
        this.testsEmitter.fire(<TestLoadFinishedEvent>{
            type: "finished",
            suite: loadedTests,
        });

        this.log.info(`Tests loaded`);
        this.isLoading = false;
    }

    async run(tests: string[]): Promise<void> {
        if (this.isRunning) return;
        this.isRunning = true;
        this.log.info(`Running ${this.name} tests ${JSON.stringify(tests)}`);

        this.testStatesEmitter.fire(<TestRunStartedEvent>{
            type: "started",
            tests,
        });
        await this.runTests(tests);
        this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: "finished" });

        this.log.info(`Test run finished`);
        this.isRunning = false;
        this.cleanUpTempFiles();
    }

    cancel(): void {
        if (this.childProcess === undefined || !this.isRunning) return;

        this.log.info(`Canceling ${this.name} processes`);

        this.childProcess.kill("SIGINT");
        if (process.platform == "win32") {
            exec(`taskkill /pid  ${this.childProcess.pid} /f /t`);
        }
        this.childProcess = undefined;
        this.isRunning = false;
        this.cleanUpTempFiles();

        this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: "finished" });

        this.log.info(`Canceled ${this.name} processes`);
    }

    dispose(): void {
        this.cancel();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }

    cleanUpTempFiles(): void {
        if (this.isRunning) return;
        for (const file of this.tempFilePaths) {
            if (fs.existsSync(file)) {
                try {
                    fs.unlinkSync(file);
                } catch (e) {}
            } else {
                this.tempFilePaths.delete(file);
            }
        }
    }
}
