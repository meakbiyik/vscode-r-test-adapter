# R Test Adapter for Visual Studio Code

[![Build Status](https://dev.azure.com/meakbiyik/vscode-r-test-adapter/_apis/build/status/meakbiyik.vscode-r-test-adapter?branchName=master)](https://dev.azure.com/meakbiyik/vscode-r-test-adapter/_build/latest?definitionId=1&branchName=master)

This extension is built to help you run R tests on VSCode. Currently only `testthat` and `tinytest` frameworks are supported. You can run and debug individual tests.

## Requirements

This extension expects `Rscript` to be in the path, or pointed with the `RTestAdapter.RscriptPath` setting, and requires `devtools>=2.3.2` to be installed for the environment Rscript is connected to.
Additionally, in order to debug tests, you will need to install:
 1. the [R Debugger extension](https://marketplace.visualstudio.com/items/?itemName=RDebugger.r-debugger)
 2. the [vscDebugger](https://github.com/ManuelHentschel/vscDebugger) package in R

## Configuration

The following list of parameters are supported in .vscode/settings.json.

#### Test search paths

The following two options define where to look for tests relative to the current workspace folder.
After modifying those entries, please use the 'Rediscover tests' button in the top of the Testing Tab.

```json
{
    "RTestAdapter.testthatSearchPath": "**/tests/testthat/**/test*.R",  // default
    "RTestAdapter.tinytestSearchPath": "**/inst/tinytest/**/test*.R"    // default
}
```

#### Additional R packages

The extension will load additional R packages listed in the following array.
The libraries need to be available locally in the R search path.
```json
{
    "RTestAdapter.packages": ["stringr"]    // example
}
```
