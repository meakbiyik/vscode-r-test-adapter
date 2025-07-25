# R Test Adapter for Visual Studio Code

[![Build Status](https://dev.azure.com/meakbiyik/vscode-r-test-adapter/_apis/build/status/meakbiyik.vscode-r-test-adapter?branchName=master)](https://dev.azure.com/meakbiyik/vscode-r-test-adapter/_build/latest?definitionId=1&branchName=master)

This extension is built to help you run R tests on VSCode. Currently only `testthat` and `tinytest` frameworks are supported. You can run and debug individual tests.

## Requirements

This extension expects `Rscript` to be in the path, or pointed with the `RTestAdapter.RscriptPath` setting, and requires `devtools>=2.3.2` to be installed for the environment Rscript is connected to.
Additionally, in order to debug tests, you will need to install:
 1. the [R Debugger extension](https://marketplace.visualstudio.com/items/?itemName=RDebugger.r-debugger)
 2. the [vscDebugger](https://github.com/ManuelHentschel/vscDebugger) package in R

Only the following file paths are searched for tests (TODO: add .vscode/settings.json options to specify that):
 - `tinytest`: `"**/inst/tinytest/**/test*.R"`
 - `testthat`: `"**/tests/testthat/**/test*.R"`
