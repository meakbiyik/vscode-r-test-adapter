import * as vscode from "vscode";
import { expect } from "chai";
import { getTestingTools } from "../../src/main";
import { rediscover } from "../../src/util";

const ext = vscode.extensions.getExtension('meakbiyik.vscode-r-test-adapter');
let config = vscode.workspace.getConfiguration("RTestAdapter");

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

        // clean up of options
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

        await config.update(
            "RPackageRoot",
            "../testRepo",  // faking some path but effectively pointing to the original R package
            vscode.ConfigurationTarget.Workspace
        );
        await rediscover(testingTools);
        expect(testingTools.controller.items.size).to.be.equal(11);

        // clean up of options
        await config.update(
            "RPackageRoot",
            undefined,
            vscode.ConfigurationTarget.Workspace
        );
        expect(testingTools.controller.items.size).to.be.equal(11);
    });
});
