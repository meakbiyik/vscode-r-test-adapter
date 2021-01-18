import * as vscode from "vscode";
import { TestSuiteInfo, TestInfo } from "vscode-test-adapter-api";
import * as path from "path";
import * as util from "util";
import { exec as _exec } from "child_process";
import { RAdapter } from "../abstractAdapter";

const treeSitterRPath = path.join(__dirname, "..", "..", "..", "node_modules", "tree-sitter-r");
const queryPath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "query",
    "detect_testthat.scm"
);
const exec = util.promisify(_exec);

export async function parseTestsFromFile(
    adapter: RAdapter,
    uri: vscode.Uri
): Promise<TestSuiteInfo> {
    let test_suite: TestSuiteInfo = {
        type: "suite",
        id: uri.path.split("/").pop()!,
        label: uri.path.split("/").pop()!,
        file: uri.fsPath,
        children: [],
    };

    let stdout;
    try {
        const result = await execute_R_parser(uri);
        stdout = result.stdout;
    } catch (error) {
        adapter.log.error(error);
        return test_suite;
    }

    let match_regex = /capture: call, row: (?<line>\d+), text: (?<code>"test_that\s*\([\\"'\s]+(?<label>.+?)[\\"']+,[\w\W]+?)\s+(?=pattern)/g;
    let match: RegExpExecArray | null;

    while ((match = match_regex.exec(stdout))) {
        let testStart = Number(match.groups!["line"]);
        let fileName = uri.path.split("/").pop()!;
        let testLabel = match.groups!["label"];
        test_suite.children.push(<TestInfo>{
            type: "test",
            id: encodeNodeId(fileName, testLabel),
            label: testLabel,
            file: uri.fsPath,
            line: testStart,
        });
    }

    return Promise.resolve(test_suite);
}

function execute_R_parser(uri: vscode.Uri) {
    let filePath = uri.fsPath;
    let command = `npx -c "tree-sitter query ${queryPath} ${filePath} -c"`;
    return exec(command, { cwd: treeSitterRPath });
}

export function encodeNodeId(fileName: string, testLabel: string) {
    return `${fileName}&${testLabel}`;
}
