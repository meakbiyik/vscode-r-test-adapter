import { Uri, workspace } from "vscode";
import * as util from "util";
import * as path from "path";
import * as tmp from "tmp-promise";
import { exec } from 'child_process';
import * as vscode from 'vscode';
import { TestInfo } from "vscode-test-adapter-api";
import { parseTestsFromFile } from "./parser";
import { appendFile as _appendFile } from "fs";
import { RAdapter } from "../adapter";

const appendFile = util.promisify(_appendFile);

export async function runAllTests(adapter: RAdapter): Promise<string> {
    let devtoolsCall = "devtools::test('.')"
    let command = `RScript -e "${devtoolsCall}"`
    let cwd = vscode.workspace.workspaceFolders![0].uri.fsPath;
    return new Promise(async resolve => {
        let childProcess = exec(command, {cwd}, (err, stdout: string, stderr: string) => {
            if (err) throw(stderr);
            resolve(stdout)
        })
        adapter.processes.push(childProcess);
     });
}

export async function runSingleTestFile(adapter: RAdapter, filePath: string): Promise<string> {
    let devtoolsCall = `devtools::test_file('${filePath.replace(/\\/g,'/')}')`
    let command = `RScript -e "${devtoolsCall}"`
    let cwd = vscode.workspace.workspaceFolders![0].uri.fsPath;
    return new Promise(async resolve => {
        let childProcess = exec(command, {cwd}, (err, stdout: string, stderr: string) => {
            if (err) throw(stderr);
            resolve(stdout)
        })
        adapter.processes.push(childProcess);
     });
}

export async function runTest(adapter: RAdapter, test: TestInfo) {
    let documentUri = Uri.file(test.file!)
    let document = await workspace.openTextDocument(documentUri)
    let source = document.getText()
    let allTests = (await parseTestsFromFile(documentUri)).children
    
    for (const parsedTest of allTests) {
        const {startIndex, endIndex} = getRangeOfTest(parsedTest.label, source)
        if (parsedTest.label != test.label) {
            source = source.slice(0, startIndex) + source.slice(endIndex! + 1)
        } else {
            source = source.slice(0, endIndex! + 1)
            break
        }
    }

    let tmpFileResult = await tmp.file({ prefix: "test-", postfix: ".R", tmpdir: path.dirname(test.file!)});
    let tmpFilePath = tmpFileResult.path
    await appendFile(tmpFilePath, source);
    return runSingleTestFile(adapter, tmpFilePath)
        .then((value) => {tmpFileResult.cleanup(); return value})
        .catch((err) => {tmpFileResult.cleanup(); throw(err)});
}

function getRangeOfTest(label: string, source: string) {
    let escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    let startIndex = RegExp(`test_that\\s*\\([\\"'\\s]+` + escapedLabel).exec(source)!.index
    let endIndex;
    let paranthesis = 0
    for (let index = startIndex; index < source.length; index++) {
        const char = source[index];
        if (char == ")" && paranthesis == 1) {
            endIndex = index;
            break
        };
        if (char == "(") paranthesis += 1;
        if (char == ")") paranthesis -= 1;
    }
    return {startIndex, endIndex}
}