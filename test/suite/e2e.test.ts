import * as vscode from "vscode";
import { expect } from "chai";
import { getTestingTools } from "../../src/main";
import { ItemFramework, rediscover } from "../../src/util";
import { testthatEntryPoint } from "../../src/testthat/runner";
import * as utils from "../../src/util";
import * as path from "path";
import { tinytestEntryPoint } from "../../src/tinytest/runner";

const ext = vscode.extensions.getExtension('meakbiyik.vscode-r-test-adapter');
let config = vscode.workspace.getConfiguration("RTestAdapter");
const testRepoPath = path.join(__dirname, "..", "..", "..", "..", "test", "testRepo");
const testthatPath = path.join(testRepoPath, "tests", "testthat");
const tinytestPath = path.join(testRepoPath, "inst", "tinytest");

suite("end to end testing", () => {

    test("Can rediscover tests after search path has been modified", async () => {
        await ext!.activate();
        let testingTools = getTestingTools();

        await rediscover(testingTools);
        expect(testingTools.controller.items.size).to.be.equal(11);

        await config.update(
            'testthatSearchPath',
            'dummy_empty_path',
            vscode.ConfigurationTarget.Workspace
        );

        await rediscover(testingTools);
        expect(testingTools.controller.items.size).to.be.equal(6);

        await config.update(
            'tinytestSearchPath',
            'dummy_empty_path',
            vscode.ConfigurationTarget.Workspace
        );

        await rediscover(testingTools);
        expect(testingTools.controller.items.size).to.be.equal(0);

        await config.update(
            'testthatSearchPath',
            undefined,
            vscode.ConfigurationTarget.Workspace
        );

        await config.update(
            'tinytestSearchPath',
            undefined,
            vscode.ConfigurationTarget.Workspace
        );

        await rediscover(testingTools);
        expect(testingTools.controller.items.size).to.be.equal(11);

    });

    test("Can load packages in entry point", async () => {
        await ext!.activate();
        let testingTools = getTestingTools();

        // === testthat ===
        await config.update(
            'packages',
            ["stringr"],
            vscode.ConfigurationTarget.Workspace
        );
        const testthatTest = utils._unittestable.getOrCreateFile(
            ItemFramework.Testthat,
            testingTools,
            vscode.Uri.file(path.join(testthatPath, "test-memoize.R")),
            true
        );
        const testthatEntry = await testthatEntryPoint(testingTools, testthatTest, false, false);
        expect(testthatEntry).to.contain("library(stringr)");

        // === tinytest ===
        const tinytestTest = utils._unittestable.getOrCreateFile(
            ItemFramework.Tinytest,
            testingTools,
            vscode.Uri.file(path.join(tinytestPath, "test-memoize.R")),
            false
        );
        const tinytestEntry = await tinytestEntryPoint(testingTools, tinytestTest, false, false);
        expect(tinytestEntry).to.contain("library(stringr)");

        await config.update(
            'packages',
            undefined,
            vscode.ConfigurationTarget.Workspace
        );
    });
});
