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
  let workspaceFolder = vscode.workspace.getWorkspaceFolder(test.uri!)!.uri.fsPath.replace(/\\/g, "/");
  return `

# NOTE! This file has been generated automatically by the VSCode R Test Adapter. Modification has no effect.

# This file adds JSON reporting capabilities to tinytest.
# Please report any unwanted effects at https://github.com/meakbiyik/vscode-r-test-adapter/issues.

# Entry point for the '${test.id}' test follows...

TINYTEST <- "tinytest"
IS_DEBUG <- ${Number(isDebug)}
FILE <- '${file}'

# This prevents polluting the global namespace with testthat::expect_* functions
# which are loaded by load_all of VSCode reporter
devtools::load_all('${testReporterPath}', export_all = FALSE, attach_testthat = FALSE)

tinytest <- loadNamespace('tinytest')

reporter <- VSCodeReporter$new()

emit_JSON_result <- function(call, result, diff, range) {
  src  <- structure(range,
                    class    = "srcref",
                    srcfile  = structure(list(filename = FILE),
                                          class = "srcfile"))

  cls  <- if (isTRUE(result))         "expectation_success"
          else if (isFALSE(result))   "expectation_failure"
          else                        "expectation_warning"   # side effect

  exp  <- structure(
    list(message = if (!isTRUE(result)) diff else NULL,
          srcref  = src),
    class = c(cls, "expectation", "condition")
  )

  reporter$add_result(context = basename(FILE), test = FILE, result = exp)
}

reporter$start_reporter()
reporter$start_file(normalizePath(FILE))
reporter$start_test(context = basename(FILE), test = FILE)

if (IS_DEBUG) {
  # We are in the debug mode. We need to .vsc.debugSource so breakpoints are
  # respected.
  # Because .vsc.debugSource doesn't expose any other hooks and we need to
  # somehow emit VSCode Reporter JSONs. We need to hack tinytest::tinytest for
  # that. It is the internal function that gets called by all tinytest::expect_*
  # functions. This hack works only in the Debug mode as only then locations
  # of failures are non-NA.
  orig_tinytest <- tinytest::tinytest
  new_tinytest <- function(...) {
    args <- list(...)
    result <- orig_tinytest(...)
    emit_JSON_result(args$call, args$result, args$diff, getSrcLocation(args$call))
    result
  }
  unlockBinding(TINYTEST, tinytest)
  assignInNamespace(TINYTEST, new_tinytest, ns = TINYTEST)
  lockBinding(TINYTEST, tinytest)
  .vsc.load_all('${workspaceFolder}')
  library(tinytest)
  .vsc.debugSource(FILE)
} else {
  # If we are in non-debug mode, we need to first run tests and then parse their
  # results. Using tinytest::tinytest hack won't work because in non-debug mode,
  # the failure locations are not available yet.
  devtools::load_all('${workspaceFolder}')
  results <- tinytest::run_test_file(FILE, verbose=2)
  df <- as.data.frame(results)
  for (i in seq_len(nrow(df))) {
    row <- df[i, ]
    emit_JSON_result(row$call, row$result, row$diff, c(row$first, row$last))
  }
}

reporter$end_test(context   = basename(FILE), test = FILE)
reporter$end_file()
reporter$end_reporter()
`;
}
