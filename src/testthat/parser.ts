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

    let subsuites = new Map();
    for (const match of matches) {
        if (match === undefined) continue;
        let testStartLine = match.testStartLine;
        let fileName = uri.path.split("/").pop()!;
        let testLabel = match.testLabel;
        if (match.testSuperLabel === undefined) {
            test_suite.children.push(<TestInfo>{
                type: "test",
                id: encodeNodeId(fileName, testLabel),
                label: testLabel,
                file: uri.fsPath,
                line: testStartLine,
            });
        } else {
            if (subsuites.has(match.testSuperLabel)) {
                subsuites.get(match.testSuperLabel).children.push(<TestInfo>{
                    type: "test",
                    id: encodeNodeId(fileName, testLabel, match.testSuperLabel),
                    label: testLabel,
                    file: uri.fsPath,
                    line: testStartLine,
                });
            } else {
                let new_subsuite = <TestSuiteInfo>{
                    type: "suite",
                    id: encodeNodeId(fileName, match.testSuperLabel),
                    label: match.testSuperLabel,
                    file: uri.fsPath,
                    line: match.testSuperStartLine,
                    children: [
                        <TestInfo>{
                            type: "test",
                            id: encodeNodeId(fileName, testLabel, match.testSuperLabel),
                            label: testLabel,
                            file: uri.fsPath,
                            line: testStartLine,
                        },
                    ],
                };
                subsuites.set(match.testSuperLabel, new_subsuite);
            }
        }
    }

    test_suite.children.push(...subsuites.values());

    return Promise.resolve(test_suite);
}

export async function findTests(uri: vscode.Uri) {
    const parserResolved = await parser;
    return vscode.workspace.openTextDocument(uri).then(
        (document: vscode.TextDocument) => {
            const tree = parserResolved.parse(document.getText());
            const query = R.query(
                `
                (call 
                    function: [
                        (identifier) @_function.name 
                        (namespace_get 
                            function: (identifier) @_function.name 
                        ) (#eq? @_function.name "test_that")
                    ]
                    arguments: 
                        (arguments 
                            value: (string) @label
                            value: (_)
                        )
                ) @call
                
                (call 
                    function: [
                        (identifier) @_superfunction.name 
                        (namespace_get 
                            function: (identifier) @_superfunction.name 
                        ) 
                    ] (#eq? @_superfunction.name "describe")
                    arguments: 
                        (arguments 
                            value: (string) @superlabel
                            value: (_
                                (call
                                    function: [
                                        (identifier) @_function.name 
                                        (namespace_get 
                                            function: (identifier) @_function.name 
                                        ) 
                                    ] (#eq? @_function.name "it")
                                    arguments: 
                                        (arguments 
                                            value: (string) @label
                                            value: (_)
                                        )
                                ) @call 
                            )
                        )
                ) @supercall
                `
            );
            const raw_matches = query.matches(tree.rootNode);

            let matches = [];

            for (const match of raw_matches) {
                if (match === undefined) continue;
                if (match.pattern == 0) {
                    matches.push({
                        testLabel: match.captures[2].node.text.substring(
                            1,
                            match.captures[2].node.text.length - 1
                        ),
                        testStartLine: match.captures[0].node.startPosition.row,
                        testStartIndex: match.captures[0].node.startIndex,
                        testEndIndex: match.captures[0].node.endIndex,
                    });
                } else {
                    matches.push({
                        testSuperLabel: match.captures[2].node.text.substring(
                            1,
                            match.captures[2].node.text.length - 1
                        ),
                        testSuperStartLine: match.captures[0].node.startPosition.row,
                        testSuperStartIndex: match.captures[0].node.startIndex,
                        testSuperEndIndex: match.captures[0].node.endIndex,
                        testLabel: match.captures[5].node.text.substring(
                            1,
                            match.captures[5].node.text.length - 1
                        ),
                        testStartLine: match.captures[3].node.startPosition.row,
                        testStartIndex: match.captures[3].node.startIndex,
                        testEndIndex: match.captures[3].node.endIndex,
                    });
                }
            }

            return matches;
        },
        (reason: any) => {
            throw reason;
        }
    );
}

export function encodeNodeId(
    fileName: string,
    testLabel: string,
    testSuperLabel: string | undefined = undefined
) {
    return testSuperLabel
        ? `${fileName}&${testSuperLabel}: ${testLabel}`
        : `${fileName}&${testLabel}`;
}

export const _unittestable = {
    findTests,
};
