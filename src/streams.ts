import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import { ANSI, findTestRecursively, TestingTools } from './util';
import { DebugProtocol } from '@vscode/debugprotocol';
import { TestResult } from './testthat/reporter';
import { encodeNodeId } from './util';
import * as path from "path";

function* parseChunk(
    chunk: string,
    streamName: string = "stdout"
): Generator<any, void, void> {
    for (const line of chunk.split('\n')) {
        try {
            const data = JSON.parse(line) as TestResult;
            if (data) {
                yield ["test_result", data];
            }
        } catch {
            yield [streamName, line];
        }
    }
}

// This class parses VSCode Reporter events from an R process.
class VSCodeEventStream extends EventEmitter {

    start(run: vscode.TestRun, test: vscode.TestItem, isDebugMode: boolean, shouldHighlightOutput: boolean): Promise<string> {
        let testStartDates = new WeakMap<vscode.TestItem, number>();
        return new Promise<string>((resolve, reject) => {
            let runOutput = "";

            this
                .on("stdout", function (line: string) {
                    runOutput += line + "\r\n";
                    run.appendOutput(line + "\r\n");
                })
                .on("stderr", function (line: string) {
                    runOutput += `${ANSI.red}${line}${ANSI.reset}\r\n`;
                    run.appendOutput(`${ANSI.red}${line}${ANSI.reset}\r\n`);
                })
                .on("test_result", function (data: TestResult) {
                    runOutput += JSON.stringify(data) + "\n";
                    switch (data.type) {
                        case "start_test":
                            if (data.test !== undefined) {
                                let testItem: undefined | vscode.TestItem = findTestRecursively(
                                    encodeNodeId(test.uri!.fsPath, data.test),
                                    test
                                ) ?? test;
                                if (testItem === undefined) {
                                    reject(
                                        `Test with id ${encodeNodeId(
                                            test.uri!.fsPath,
                                            data.test
                                        )} could not be found. Please report this.`
                                    );
                                    break;
                                }
                                if (!testItem.id.includes(data.test)) {
                                    break;
                                }
                                testStartDates.set(testItem!, Date.now());
                                run.started(testItem!);
                            }
                            break;
                        case "add_result":
                            if (data.result !== undefined && data.test !== undefined) {
                                let testItem: undefined | vscode.TestItem = findTestRecursively(
                                    encodeNodeId(test.uri!.fsPath, data.test),
                                    test
                                ) ?? test;
                                if (testItem === undefined) {
                                    reject(
                                        `Test with id ${encodeNodeId(
                                            test.uri!.fsPath,
                                            data.test
                                        )} could not be found. Please report this.`
                                    );
                                    break;
                                }
                                if (vscode.debug.activeDebugSession != undefined && !isDebugMode) {
                                    vscode.window.showWarningMessage("Got a debugging session while not in debug mode. " +
                                        "Please report this.");
                                    break;
                                }
                                if (!testItem.id.includes(data.test)) {
                                    // Silently ignore the test result if the test item id does not match
                                    break;
                                }
                                let duration = Date.now() - testStartDates.get(testItem!)!;
                                let color = ANSI.reset;
                                switch (data.result) {
                                    case "success":
                                        run.passed(testItem!, duration);
                                        break;
                                    case "warning":
                                        data.message = "Warning: " + data.message!;
                                        run.failed(testItem!, new vscode.TestMessage(data.message!), duration);
                                        color = ANSI.red;
                                        break;
                                    case "failure":
                                        data.message = "Failure: " + data.message!;
                                        run.failed(
                                            testItem!,
                                            new vscode.TestMessage(data.message!),
                                            duration
                                        );
                                        color = ANSI.red;
                                        break;
                                    case "skip":
                                        run.skipped(testItem!);
                                        break;
                                    case "error":
                                        data.message = "Error: " + data.message!;
                                        run.errored(
                                            testItem!,
                                            new vscode.TestMessage("Error: " + data.message!),
                                            duration
                                        );
                                        color = ANSI.red;
                                        break;
                                }
                                if (data.message) {
                                    if (shouldHighlightOutput && data.location) {
                                        // As tinytest doesn't have a concept of 'named tests' (it just uses file+line number to identify successful&failing assertions)
                                        // we extract the 'location' field from VSCode Reporter JSONs and in case of failures we append the assertion message
                                        // to the corresponding line so the user sees the failures in a readable way.
                                        const [firstRow, _] = data.location!.split(":").slice(-2);
                                        const location = new vscode.Location(test.uri!, new vscode.Position(Number(firstRow) - 1, 1));
                                        const localization = location ? `${path.basename(location!.uri.fsPath)}:${location.range.start.line}: ` : "";
                                        const message = data.message!.split("\n",).join("\r\n"); // a workaround for replaceAll which doesnt exist
                                        run.appendOutput(`${localization}${color}${message}${ANSI.reset}\r\n`, location, testItem);
                                        break;
                                    }
                                    else {
                                        const message = data.message!.split("\n",).join("\r\n"); // a workaround for replaceAll which doesnt exist
                                        run.appendOutput(`${message}`, undefined, testItem);
                                    }
                                }
                            }
                            break;
                    }
                })
                .on("end", () => {
                    if (runOutput.includes("Execution halted")) {
                        reject(Error(runOutput));
                    }
                    resolve(runOutput);
                })
                .on("error", () => {
                    reject(runOutput);
                });
        });

    };
}

// This EventEmitter emits test results in the plain 'Run test' scenario.
export class ProcessChannel extends VSCodeEventStream {

    constructor(cmd: string, cwd: vscode.WorkspaceFolder) {
        super();
        let child = spawn(cmd, { cwd: cwd.uri.fsPath, shell: true });
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");

        child.stdout.on('data', (chunk: string) => {
            for (const [eventName, data] of parseChunk(chunk)) {
                this.emit(eventName, data);
            }
        })
        child.stderr.on('data', (chunk: string) => {
            for (const line of chunk.split("\n")) {
                this.emit("stderr", line);
            }
        })
        child.once('error', (err: Error) => {
            this.emit('error', err);
        })
        child.once('exit', (code: number) => {
            if (code != 0) {
                this.emit('error');
            }
            else {
                this.emit('end');
            }
        });
    }

}

// A helper class for intercepting the DAP messages.
class DebuggerTracker implements vscode.DebugAdapterTracker {

    channel: DebugChannel;

    constructor(channel: DebugChannel) {
        this.channel = channel;
    }

    onWillStopSession(): void {
        this.channel.emit('end');
    }

    onDidSendMessage(message: DebugProtocol.ProtocolMessage) {
        if (message.type === 'event') {
            const event = message as DebugProtocol.Event;
            if (event.event === 'output') {
                const outputEvent = event as DebugProtocol.OutputEvent;
                if (outputEvent.body.category === 'stdout') {
                    for (const [eventName, data] of parseChunk(outputEvent.body.output)) {
                        this.channel.emit(eventName, data);
                    }
                }
                if (outputEvent.body.category === 'stderr') {
                    for (const line of outputEvent.body.output.split("\n")) {
                        this.channel.emit("stderr", line);
                    }
                }
            }
        }
    }
}

// This EventStream emits test results in the 'Debug test' scenario.
// The difference from ProcessChannel is that it intercepts the DAP messages instead of
// parsing the stdout of the R process under debugging. This is necessary because
// VSCode API doesn't easily expose the stdout of the R process under debugging.
export class DebugChannel extends VSCodeEventStream {

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
