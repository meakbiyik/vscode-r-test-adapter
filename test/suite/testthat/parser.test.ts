import parseTestsFromFile from "../../../src/testthat/parser";
import * as parser from "../../../src/testthat/parser";
import { expect } from "chai";
import * as chai from "chai";
import * as deepEqualInAnyOrder from "deep-equal-in-any-order";
import * as chaiAsPromised from "chai-as-promised";
import * as utils from "../../../src/util";
import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import * as path from "path";
import { ItemFramework, ItemType, TestingTools } from "../../../src/util";

chai.use(chaiAsPromised);
chai.use(deepEqualInAnyOrder);

const testRepoPath = path.join(__dirname, "..", "..", "..", "..", "test", "testRepo");
const testRepoTestsPath = path.join(testRepoPath, "tests", "testthat");

suite("testthat/parser", () => {
    const controller = vscode.tests.createTestController("fake-controller", "Fake Controller");
    const workspaceFolder = <vscode.WorkspaceFolder>{
        uri: vscode.Uri.file(testRepoPath),
        name: "testRepo",
        index: 0,
    };
    const log = new Log("FakeExplorer", workspaceFolder, "Fake Explorer Log");

    const testItemData = new WeakMap<
        vscode.TestItem,
        { itemType: ItemType; itemFramework: ItemFramework }
    >();
    const tempFilePaths: String[] = [];

    const testingTools: TestingTools = {
        controller,
        log,
        testItemData,
        tempFilePaths,
        context: <vscode.ExtensionContext>{},
    };

    test("Tests are parsed from file", async () => {
        const TestItem = utils._unittestable.getOrCreateFile(
            ItemFramework.Testthat,
            testingTools,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-email.R")),
            true
        );
        await parseTestsFromFile(testingTools, TestItem);
        let tests = TestItem.children;
        expect(tests.size).to.be.equal(3);
        let names: string[] = [];
        tests.forEach((test, collection) => {
            const id = test.id.replace(/[\\/]+/g, "/").split("/");
            names.push(id[id.length - 1]);
        });
        expect(names).to.be.deep.equalInAnyOrder([
            "test-email.R&EMAIL env var",
            "test-email.R&Email address",
            "test-email.R&Email address works",
        ]);
    });

    test("tree-sitter parser executes correctly", async () => {
        let matches = await parser._unittestable.findTests(
            vscode.Uri.file(path.join(testRepoTestsPath, "test-email.R"))
        );

        expect(matches).to.be.deep.equalInAnyOrder([
            {
                testLabel: "Email address works",
                testStartPosition: {
                    e: 0,
                    c: 3,
                },
                testEndPosition: {
                    e: 2,
                    c: 7,
                },
            },
            {
                testLabel: "EMAIL env var",
                testStartPosition: {
                    e: 0,
                    c: 9,
                },
                testEndPosition: {
                    e: 2,
                    c: 13,
                },
            },
            {
                testSuperLabel: "Email address",
                testLabel: "works",
                testStartPosition: {
                    e: 2,
                    c: 16,
                },
                testEndPosition: {
                    e: 4,
                    c: 20,
                },
                testSuperStartPosition: {
                    e: 0,
                    c: 15,
                },
                testSuperEndPosition: {
                    e: 2,
                    c: 27,
                },
            },
            {
                testSuperLabel: "Email address",
                testLabel: "got EMAIL env var",
                testStartPosition: {
                    e: 2,
                    c: 22,
                },
                testEndPosition: {
                    e: 4,
                    c: 26,
                },
                testSuperStartPosition: {
                    e: 0,
                    c: 15,
                },
                testSuperEndPosition: {
                    e: 2,
                    c: 27,
                },
            },
        ]);
    });

    controller.dispose();
});
