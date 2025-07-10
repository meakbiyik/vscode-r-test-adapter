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

devtools::load_all('${testReporterPath}', export_all = FALSE, attach_testthat = FALSE)
file <- '/home/kubajal/development/vscode-r-test-adapter/test/testRepo/inst/tinytest/test-misc.R'

library(tinytest)

reporter <- VSCodeReporter$new()

emit_assertion_result <- function(call, result, diff, range) {
  src  <- structure(range,
                    class    = "srcref",
                    srcfile  = structure(list(filename = file),
                                          class = "srcfile"))

  cls  <- if (isTRUE(result))         "expectation_success"
          else if (isFALSE(result))   "expectation_failure"
          else                        "expectation_skip"   # side effect

  exp  <- structure(
    list(message = if (!isTRUE(result)) diff else NULL,
          srcref  = src),
    class = c(cls, "expectation", "condition")
  )

  reporter$add_result(context = basename(file), test = file, result = exp)
}

if (IS_DEBUG) {
  orig_tinytest <- tinytest::tinytest
  new_tinytest <- function(...) {
    args <- list(...)
    result <- orig_tinytest(...)
    emit_assertion_result(args$call, args$result, args$diff, getSrcLocation(args$call))
    result
  }
  unlockBinding(TINYTEST, tinytest)
  assignInNamespace(TINYTEST, new_tinytest, ns = TINYTEST)
  lockBinding(TINYTEST, tinytest)
}

reporter$start_reporter()
reporter$start_file(normalizePath(file))
reporter$start_test(context = basename(file), test = file)

if (IS_DEBUG) {
  .vsc.debugSource(file)
} else {
  results <- tinytest::run_test_file(file, verbose=2)
  df <- as.data.frame(results)
  for (i in seq_len(nrow(df))) {
    row <- df[i, ]
    emit_assertion_result(row$call, row$result, row$diff, c(row$first, row$last))
  }
}

reporter$end_test(context   = basename(file), test = file)
reporter$end_file()
reporter$end_reporter()
`;
}
