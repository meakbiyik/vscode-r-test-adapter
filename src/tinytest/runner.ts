import * as vscode from "vscode";
import * as path from "path";
import { TestingTools } from "../util";

const testReporterPath = path
  .join(__dirname, "..", "..", "..", "src", "testthat", "reporter")
  .replace(/\\/g, "/");

export async function tinytestEntryPoint(
  testingTools: TestingTools,
  test: vscode.TestItem,
  isDebug: boolean = false,
  isWholeFile: boolean
) {
  const file = test?.uri!.fsPath
    .replace(/\\/g, "/");
  return `
# NOTE! This file has been generated automatically by the VSCode R Test Adapter. Modification has no effect.

# This file adds JSON reporting capabilities to tinytest.
# Please report any unwanted effects at https://github.com/meakbiyik/vscode-r-test-adapter/issues.

# Entry point for the '${test.id}' test follows...

TINYTEST <- "tinytest"
IS_DEBUG <- ${Number(isDebug)}

devtools::load_all('${testReporterPath}')
file <- '${file}'

tinytest <- loadNamespace(TINYTEST)

reporter <- VSCodeReporter$new()

if (IS_DEBUG) {

  orig_tinytest <- tinytest::tinytest
  new_tinytest <- function(...) {
    args <- list(...)

    src  <- structure(c(getSrcLocation(args$call), 1),
                      class    = "srcref",
                      srcfile  = structure(list(filename = file),
                                            class = "srcfile"))

    cls  <- if (isTRUE(args$result))         "expectation_success"
            else if (isFALSE(args$result))   "expectation_failure"
            else                        "expectation_skip"   # side effect

    exp  <- structure(
      list(message = if (!isTRUE(args$result)) args$diff else NULL,
            srcref  = src),
      class = c(cls, "expectation", "condition")
    )

    reporter$start_test(context = basename(file), test = file)
    reporter$add_result(context = basename(file), test = file, result = exp)
    reporter$end_test(context   = basename(file), test = file)
    orig_tinytest(...)
  }

  suppressPackageStartupMessages({library(tinytest)})
  unlockBinding(TINYTEST, tinytest)
  assignInNamespace(TINYTEST, new_tinytest, ns = TINYTEST)
  lockBinding(TINYTEST, tinytest)
}

reporter$start_reporter()
reporter$start_file(normalizePath(file))

if (IS_DEBUG) {
  .vsc.debugSource('${file}')
} else {
  tinytest::run_test_file('${file}')
}

reporter$end_file()
reporter$end_reporter()
`;
}
