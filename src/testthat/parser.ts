import * as vscode from "vscode";
import * as path from "path";
import { TestSuiteInfo, TestInfo } from "vscode-test-adapter-api";
import { exec as _exec } from "child_process";
import { RAdapter } from "../abstractAdapter";

const wasmPath = path.join(__dirname, "..", "..", "..", "bin", "tree-sitter-r.wasm");
const Parser = require("web-tree-sitter");
let R: any;

async function prepareParser(): Promise<any> {
    await Parser.init();
    const parser = new Parser();
    R = await Parser.Language.load(wasmPath);
    parser.setLanguage(R);
    return parser;
}

let parser = prepareParser();

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

    let matches;
    try {
        matches = await findTests(uri);
    } catch (error) {
        adapter.log.error(error);
        return test_suite;
    }

    for (const match of matches) {
        if (match === undefined) continue;
        let callNode = match.captures[0].node;
        let labelNode = match.captures[2].node;
        let testStartLine = callNode.startPosition.row;
        let fileName = uri.path.split("/").pop()!;
        let testLabel = labelNode.text;
        let strippedTestLabel = testLabel.substring(1, testLabel.length - 1);
        test_suite.children.push(<TestInfo>{
            type: "test",
            id: encodeNodeId(fileName, strippedTestLabel),
            label: strippedTestLabel,
            file: uri.fsPath,
            line: testStartLine,
        });
    }

    return Promise.resolve(test_suite);
}

async function findTests(uri: vscode.Uri) {
    const parserResolved = await parser;
    return vscode.workspace.openTextDocument(uri).then(
        (document: vscode.TextDocument) => {
            const tree = parserResolved.parse(document.getText());
            const query = R.query(
                `
                (call 
                    function: (identifier) @_function.name (#eq? @_function.name "test_that")
                    arguments: 
                        (arguments 
                            value: (string) @label
                            value: (_)
                        )
                ) @call
                `
            );
            return query.matches(tree.rootNode);
        },
        (reason: any) => {
            throw reason;
        }
    );
}

export function encodeNodeId(fileName: string, testLabel: string) {
    return `${fileName}&${testLabel}`;
}

export const _unittestable = {
    findTests,
};
