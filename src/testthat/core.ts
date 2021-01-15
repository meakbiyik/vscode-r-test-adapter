import * as vscode from 'vscode';
import { TestSuiteInfo, TestInfo, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent } from 'vscode-test-adapter-api';
import { RAdapter } from '../adapter';
import { parseTestsFromFile, encodeNodeId } from './parser';
import { runAllTests, runSingleTestFile, runTest } from './runner';

let testSuite: TestSuiteInfo;

export async function loadTests(adapter: RAdapter): Promise<TestSuiteInfo> {

	testSuite = {
		type: 'suite',
		id: 'root',
		label: 'R (testthat)',
		children: []
	}

	let testFiles;
	try {
		testFiles = await vscode.workspace.findFiles("**/tests/testthat/**/test*.R");
	} catch (error) {
		adapter.log.error(error)
		return testSuite
	}

	for (const testFile of testFiles) {
		try {
			let tests_in_file = await parseTestsFromFile(adapter, testFile)
			testSuite.children.push(
				tests_in_file
			)
		} catch (error) {
			adapter.log.error(error)
		}
	}

	return Promise.resolve(testSuite)
}

export async function runTests(
	adapter: RAdapter,
	tests: string[],
): Promise<void> {
	for (const suiteOrTestId of tests) {
		const node = findNode(testSuite, suiteOrTestId);
		if (node) {
			await runNode(adapter, node);
		}
	}
}

function findNode(searchNode: TestSuiteInfo | TestInfo, id: string): TestSuiteInfo | TestInfo | undefined {
	if (searchNode.id === id) {
		return searchNode;
	} else if (searchNode.type === 'suite') {
		for (const child of searchNode.children) {
			const found = findNode(child, id);
			if (found) return found;
		}
	}
	return undefined;
}

async function runNode(
	adapter: RAdapter,
	node: TestSuiteInfo | TestInfo
): Promise<void> {

	let testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent> = adapter.testStatesEmitter

	if (node.type === 'suite' && node.id === 'root') {

		testStatesEmitter.fire(<TestSuiteEvent>{ type: 'suite', suite: node.id, state: 'running' });

		for (const file of <TestSuiteInfo[]> node.children) {
			for (const test of file.children) {
				testStatesEmitter.fire(<TestEvent>{ type: 'test', test: test.id, state: 'running' });
			}
		}

		try {
			let stdout = await runAllTests(adapter)
			let failedTests = getFailedTests(stdout);
			let skippedTests = getSkippedTests(stdout);
			for (const file of <TestSuiteInfo[]> node.children) {
				for (const test of file.children) {
					if (failedTests.has(test.id)){
						testStatesEmitter.fire(<TestEvent>{ type: 'test', test: test.id, state: 'failed', message: failedTests.get(test.id)});
					} else if (skippedTests.has(test.id)){
						testStatesEmitter.fire(<TestEvent>{ type: 'test', test: test.id, state: 'skipped', message: skippedTests.get(test.id)});
					} else {
						testStatesEmitter.fire(<TestEvent>{ type: 'test', test: test.id, state: 'passed'});
					}
				}
			}
		} catch (error) {
			adapter.log.error(error)
			for (const file of <TestSuiteInfo[]> node.children) {
				for (const test of file.children) {
					testStatesEmitter.fire(<TestEvent>{ type: 'test', test: test.id, state: 'errored' });
				}
			}
		}

		testStatesEmitter.fire(<TestSuiteEvent>{ type: 'suite', suite: node.id, state: 'completed' });

	} else if (node.type === 'suite') {

		testStatesEmitter.fire(<TestSuiteEvent>{ type: 'suite', suite: node.id, state: 'running' });

		for (const test of node.children) {
			testStatesEmitter.fire(<TestEvent>{ type: 'test', test: test.id, state: 'running' });
		}

		try {
			let stdout = await runSingleTestFile(adapter, node.file!)
			let failedTests = getFailedTests(stdout);
			let skippedTests = getSkippedTests(stdout);
			for (const test of node.children) {
				if (failedTests.has(test.id)){
					testStatesEmitter.fire(<TestEvent>{ type: 'test', test: test.id, state: 'failed', message: failedTests.get(test.id)});
				} else if (skippedTests.has(test.id)){
					testStatesEmitter.fire(<TestEvent>{ type: 'test', test: test.id, state: 'skipped', message: skippedTests.get(test.id)});
				} else {
					testStatesEmitter.fire(<TestEvent>{ type: 'test', test: test.id, state: 'passed'});
				}
			}
		} catch (error) {
			adapter.log.error(error)
			for (const test of node.children) {
				testStatesEmitter.fire(<TestEvent>{ type: 'test', test: test.id, state: 'errored' });
			}
		}

		testStatesEmitter.fire(<TestSuiteEvent>{ type: 'suite', suite: node.id, state: 'completed' });

	} else { // node.type === 'test'

		testStatesEmitter.fire(<TestEvent>{ type: 'test', test: node.id, state: 'running' });

		try {
			let stdout = await runTest(adapter, node)
			let failedTests = getFailedTests(stdout, node.id.split("&")[0]);
			let skippedTests = getSkippedTests(stdout, node.id.split("&")[0]);
			if (failedTests.has(node.id)){
				testStatesEmitter.fire(<TestEvent>{ type: 'test', test: node.id, state: 'failed', message: failedTests.get(node.id)});
			} else if (skippedTests.has(node.id)){
				testStatesEmitter.fire(<TestEvent>{ type: 'test', test: node.id, state: 'skipped', message: skippedTests.get(node.id)});
			} else {
				testStatesEmitter.fire(<TestEvent>{ type: 'test', test: node.id, state: 'passed'});
			}
		} catch (error) {
			adapter.log.error(error)
			testStatesEmitter.fire(<TestEvent>{ type: 'test', test: node.id, state: 'errored' });
		}
	}
}

function getFailedTests(stdout:string, filename?:string) {
	const failureRegex = /failure \((?<fileName>.+?):\d+:\d+\): (?<label>.+)(\r\n|\r|\n)(?<reason>[\w\W]+?)(?=(\s+skip|\s+failure|\s+warn|-{10,}))/gi;
	let failedTests = new Map<string,string>();
	let match;
	while (match = failureRegex.exec(stdout)) {
		let testLabel = match.groups!["label"]
		let fileName = filename?filename:match.groups!["fileName"]
		let reason = match.groups!["reason"]
		failedTests.set(
			encodeNodeId(fileName, testLabel), reason
		)
	}
	return failedTests
}

function getSkippedTests(stdout:string, filename?:string) {
	const skipRegex = /skip \((?<fileName>.+?):\d+:\d+\): (?<label>.+)(\r\n|\r|\n)(?<reason>[\w\W]+?)(?=(\s+skip|\s+failure|\s+warn|-{10,}))/gi;
	let skippedTests = new Map<string,string>();
	let match;
	while (match = skipRegex.exec(stdout)) {
		let testLabel = match.groups!["label"]
		let fileName = filename?filename:match.groups!["fileName"]
		let reason = match.groups!["reason"]
		skippedTests.set(
			encodeNodeId(fileName, testLabel), reason
		)
	}
	return skippedTests
}