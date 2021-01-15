import * as vscode from 'vscode';
import { TestAdapter, TestLoadStartedEvent, TestLoadFinishedEvent, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent } from 'vscode-test-adapter-api';
import { Log } from 'vscode-test-adapter-util';
import { exec } from 'child_process';
import { loadTests, runTests } from './testthat/core';
import { ChildProcess } from 'child_process';

export class RAdapter implements TestAdapter {

	private disposables: { dispose(): void }[] = [];
	public processes: ChildProcess[] = [];

	readonly testsEmitter = new vscode.EventEmitter<TestLoadStartedEvent | TestLoadFinishedEvent>();
	readonly testStatesEmitter = new vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>();
	readonly autorunEmitter = new vscode.EventEmitter<void>();
	private readonly watcher: vscode.FileSystemWatcher
	private loadTimeout = setTimeout(()=>{}, 1)

	get tests(): vscode.Event<TestLoadStartedEvent | TestLoadFinishedEvent> { return this.testsEmitter.event; }
	get testStates(): vscode.Event<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent> { return this.testStatesEmitter.event; }
	get autorun(): vscode.Event<void> | undefined { return this.autorunEmitter.event; }

	constructor(
		public readonly workspace: vscode.WorkspaceFolder,
		public readonly log: Log
	) {

		this.log.info('Initializing R adapter');

		this.disposables.push(this.testsEmitter);
		this.disposables.push(this.testStatesEmitter);
		this.disposables.push(this.autorunEmitter);

		this.watcher = vscode.workspace.createFileSystemWatcher("**/tests/testthat/**/test*.R")
		this.watcher.onDidChange(e => {clearTimeout(this.loadTimeout); this.loadTimeout = setTimeout(() => {this.load()}, 1000)})
		this.watcher.onDidCreate(e => {clearTimeout(this.loadTimeout); this.loadTimeout = setTimeout(() => {this.load()}, 1000)})
		this.watcher.onDidDelete(e => {clearTimeout(this.loadTimeout); this.loadTimeout = setTimeout(() => {this.load()}, 1000)})
		this.disposables.push(this.watcher);

	}

	async load(): Promise<void> {

		this.log.info('Loading R tests');

		this.testsEmitter.fire(<TestLoadStartedEvent>{ type: 'started' });

		const loadedTests = await loadTests(this);

		this.testsEmitter.fire(<TestLoadFinishedEvent>{ type: 'finished', suite: loadedTests });
	}

	async run(tests: string[]): Promise<void> {

		this.log.info(`Running R tests ${JSON.stringify(tests)}`);

		this.testStatesEmitter.fire(<TestRunStartedEvent>{ type: 'started', tests });

		await runTests(this, tests);

		this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: 'finished' });

	}

/*	implement this method if your TestAdapter supports debugging tests
	async debug(tests: string[]): Promise<void> {
		// start a test run in a child process and attach the debugger to it...
	}
*/

	cancel(): void {
		for (const childProcess of this.processes) {
			childProcess.kill()
			if(process.platform == "win32") {
				exec(`taskkill /pid  ${childProcess.pid} /f /t`);
			}
		}
		this.processes = [];
		this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: 'finished' });
	}

	dispose(): void {
		this.cancel();
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
		this.disposables = [];
	}
}
