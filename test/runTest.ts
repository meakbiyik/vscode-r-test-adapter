import * as path from "path";
import * as cp from "child_process";
import {
    downloadAndUnzipVSCode,
    resolveCliPathFromVSCodeExecutablePath,
    runTests,
} from "vscode-test";

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, "../../");
        const extensionTestsPath = path.resolve(__dirname, "./suite/index");
        const vscodeExecutablePath = await downloadAndUnzipVSCode("1.40.1");
        const cliPath = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath);

        // Use cp.spawn / cp.exec for custom setup
        cp.spawnSync(cliPath, ["--install-extension", "hbenl.vscode-test-explorer"], {
            encoding: "utf-8",
            stdio: "inherit",
        });

        // Download VS Code, unzip it and run the integration test
        await runTests({ extensionDevelopmentPath, extensionTestsPath });
    } catch (err) {
        console.error(err);
        console.error("Failed to run tests");
        process.exit(1);
    }
}

main();
