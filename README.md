# R Test Adapter for Visual Studio Code

[![Build Status](https://dev.azure.com/meakbiyik/vscode-r-test-adapter/_apis/build/status/meakbiyik.vscode-r-test-adapter?branchName=master)](https://dev.azure.com/meakbiyik/vscode-r-test-adapter/_build/latest?definitionId=1&branchName=master)

This extension is built to help you run R tests on VSCode. Currently only `testthat` framework is supported, but running individual tests is now possible contrary to the file-based atomicity of testthat API.

## Requirements

This extension expects `Rscript` to be in the path, or pointed with the `RTestAdapter.RscriptPath` setting, and requires `devtools>=2.3.2` to be installed for the environment Rscript is connected to.
Additionally, install and enable the [R Debugger](https://marketplace.visualstudio.com/items/?itemName=RDebugger.r-debugger) extension in order to enable test case debugging.