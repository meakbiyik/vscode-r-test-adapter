# R Test Adapter for Visual Studio Code

[![Build Status](https://dev.azure.com/meakbiyik/vscode-r-test-adapter/_apis/build/status/meakbiyik.vscode-r-test-adapter?branchName=master)](https://dev.azure.com/meakbiyik/vscode-r-test-adapter/_build/latest?definitionId=1&branchName=master)

This extension is built to help you run R tests on VSCode. Currently only `testthat` framework is supported, but running individual tests is now possible contrary to the file-based atomicity of testthat API.

This repository is a plug-in `Test Adapter` extension that works with the
[Test Explorer](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-test-explorer). User does not need to install the `Test Explorer` extension manually, it will automatically be integrated.

## Requirements

This extension expects `Rscript` to be in the path, or pointed with the `RTestAdapter.RscriptPath` setting, and requires `devtools>=2.3.2` to be installed for the environment Rscript is connected to. No other dependencies are expected.
