import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import { TestingTools } from './util';
import { DebugProtocol } from '@vscode/debugprotocol';
import { TestResult } from './testthat/reporter';

function* parseTestResults(
    chunk: string
): Generator<TestResult, void, void> {
    for (const line of chunk.split('\n')) {
        try {
            const data = JSON.parse(line) as TestResult;
            if (data) {
                yield data;
            }
        } catch {
            /* ignore non‑TestResult lines */
        }
    }
}

// This EventEmitter emits test results in the plain 'Run test' scenario.
export class ProcessChannel extends EventEmitter {

    constructor(cmd: string, cwd: vscode.WorkspaceFolder) {
        super();
        let child = spawn(cmd, { cwd: cwd.uri.fsPath, shell: true });
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");

        child.stdout.on('data', (data: string) => {
            for (const testResult of parseTestResults(data)) {
                this.emit('test_result', testResult);
            }
        })
        child.once('error', (err: Error) => {
            this.emit('error', err);
        })
        child.once('exit', (code: number) => {
            this.emit('end');
        });
    }

}

// A helper class for intercepting the DAP messages.
class DebuggerTracker implements vscode.DebugAdapterTracker {

    channel: DebugChannel;

    constructor(channel: DebugChannel) {
        this.channel = channel;
    }

    onDidSendMessage(message: DebugProtocol.ProtocolMessage) {
        if (message.type === 'event') {
            const event = message as DebugProtocol.Event;
            if (event.event === 'output') {
                const outputEvent = event as DebugProtocol.OutputEvent;
                if (outputEvent.body.category === 'stdout') {
                    for (const testResult of parseTestResults(outputEvent.body.output)) {
                        this.channel.emit('test_result', testResult);
                    }
                }
            }
            if (event.event === 'exited') {
                this.channel.emit('end');
            }
        }
    }
}

// This EventEmitter emits test results in the 'Debug test' scenario.
// The difference from ProcessChannel is that it intercepts the DAP messages instead of
// parsing the stdout of the R process under debugging. This is necessary because
// VSCode API doesn't easily expose the stdout of the R process under debugging.
export class DebugChannel extends EventEmitter {

    constructor(testingTools: TestingTools, folder: vscode.WorkspaceFolder, RFilePath: string) {
        super();
        const channel = this;

        testingTools.context.subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory('*', {
            createDebugAdapterTracker(session: vscode.DebugSession) {
                return new DebuggerTracker(channel);
            }
        }));
        const debugConfig: vscode.DebugConfiguration = {
            type: 'R-Debugger',
            name: 'Launch R File',
            request: 'launch',
            debugMode: 'file',
            file: RFilePath,
            allowGlobalDebugging: false
        };

        vscode.debug.startDebugging(folder, debugConfig);
    }
}
