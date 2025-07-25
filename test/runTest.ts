import * as path from "path";
import { runTests } from "@vscode/test-electron";

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, "../../");
        const extensionTestsPath = path.resolve(__dirname, "./suite/index");
        const testRepoPath = path.join(__dirname, "..", "..", "test", "testRepo");

        const argsAfterScript = process.argv.slice(2);          // only user-supplied args
        let grep: string | undefined;

        for (let i = 0; i < argsAfterScript.length; i++) {
            const flag = argsAfterScript[i];
            if ((flag === "-g" || flag === "--grep") && i + 1 < argsAfterScript.length) {
                grep = argsAfterScript[i + 1];
                break;
            }
        }

        // Download VS Code, unzip it and run the integration test
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [testRepoPath],
            extensionTestsEnv: { ...process.env, TEST_GREP: grep ?? "" },
        });
    } catch (err) {
        console.error(err);
        console.error("Failed to run tests");
        process.exit(1);
    }
}

main();
