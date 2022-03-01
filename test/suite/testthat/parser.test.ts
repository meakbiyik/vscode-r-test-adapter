import * as parser from "../../../src/testthat/parser";
import * as core from "../../../src/testthat/adapter";
import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import * as path from "path";
import { TestInfo, TestSuiteInfo } from "vscode-test-adapter-api";
import * as chai from "chai";
import * as deepEqualInAnyOrder from "deep-equal-in-any-order";
import * as chaiAsPromised from "chai-as-promised";
import { encodeNodeId } from "../../../src/testthat/parser";

chai.use(chaiAsPromised);
chai.use(deepEqualInAnyOrder);
const expect = chai.expect;

const testRepoPath = path.join(__dirname, "..", "..", "..", "..", "test", "testRepo");
const testRepoTestsPath = path.join(testRepoPath, "tests", "testthat");

function normalize_path(filepath: string): string {
    return path.normalize(filepath).replace(/^[\\\/]+|[\\\/]+$/g, "");
}

suite("TestthatParser", () => {
    const workspaceFolder = <vscode.WorkspaceFolder>{
        uri: vscode.Uri.file(testRepoPath),
        name: "testRepo",
        index: 0,
    };
    const log = new Log("RExplorer", workspaceFolder, "R Explorer Log");

    test("Tests are parsed from file", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);

        let suite = await parser.parseTestsFromFile(
            testAdapter,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-email.R"))
        );

        expect(suite).to.be.deep.equalInAnyOrder(testEmailRepoStructure);
        testAdapter.dispose();
    });

    test("tree-sitter parser executes correctly", async () => {
        let matches = await parser._unittestable.findTests(
            vscode.Uri.file(path.join(testRepoTestsPath, "test-email.R"))
        );

        expect(matches).to.be.deep.equalInAnyOrder([
            {
                testLabel: "Email address works",
                testStartLine: 3,
                testStartIndex: 27,
                testEndIndex: 209,
            },
            {
                testLabel: "EMAIL env var",
                testStartLine: 9,
                testStartIndex: 211,
                testEndIndex: 362,
            },
            {
                testSuperLabel: "Email address",
                testSuperStartLine: 15,
                testSuperStartIndex: 364,
                testSuperEndIndex: 736,
                testLabel: "works",
                testStartLine: 16,
                testStartIndex: 404,
                testEndIndex: 573,
            },
            {
                testSuperLabel: "Email address",
                testSuperStartLine: 15,
                testSuperStartIndex: 364,
                testSuperEndIndex: 736,
                testLabel: "got EMAIL env var",
                testStartLine: 22,
                testStartIndex: 577,
                testEndIndex: 733,
            },
        ]);
    });

    test("Node id's are properly encoded", async () => {
        let encoded_id = parser.encodeNodeId("test1", "test2");
        expect(encoded_id).to.be.equal("test1&test2");
    });
});

const testEmailRepoStructure = <TestSuiteInfo>{
    type: "suite",
    id: vscode.Uri.file(path.join(testRepoTestsPath, "test-email.R")).path,
    label: "test-email.R",
    file: path.join(testRepoTestsPath, "test-email.R"),
    children: [
        <TestInfo>{
            type: "test",
            id: encodeNodeId(
                normalize_path(path.join(testRepoTestsPath, "test-email.R")),
                "Email address works"
            ),
            label: "Email address works",
            file: path.join(testRepoTestsPath, "test-email.R"),
            line: 3,
        },
        <TestInfo>{
            type: "test",
            id: encodeNodeId(
                normalize_path(path.join(testRepoTestsPath, "test-email.R")),
                "EMAIL env var"
            ),
            label: "EMAIL env var",
            file: path.join(testRepoTestsPath, "test-email.R"),
            line: 9,
        },
        <TestSuiteInfo>{
            type: "suite",
            id: encodeNodeId(
                normalize_path(path.join(testRepoTestsPath, "test-email.R")),
                "Email address"
            ),
            label: "Email address",
            file: path.join(testRepoTestsPath, "test-email.R"),
            line: 15,
            children: [
                <TestInfo>{
                    type: "test",
                    id: encodeNodeId(
                        normalize_path(path.join(testRepoTestsPath, "test-email.R")),
                        "works",
                        "Email address"
                    ),
                    label: "works",
                    file: path.join(testRepoTestsPath, "test-email.R"),
                    line: 16,
                },
                <TestInfo>{
                    type: "test",
                    id: encodeNodeId(
                        normalize_path(path.join(testRepoTestsPath, "test-email.R")),
                        "got EMAIL env var",
                        "Email address"
                    ),
                    label: "got EMAIL env var",
                    file: path.join(testRepoTestsPath, "test-email.R"),
                    line: 22,
                },
            ],
        },
    ],
};
