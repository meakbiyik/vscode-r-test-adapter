#' Test reporter: VS Code format.
#'
#' This reporter will output results in a format understood by the
#' [R Test Explorer](https://github.com/meakbiyik/vscode-r-test-adapter).
#'
#' @export
VSCodeReporter <- R6::R6Class("VSCodeReporter",
  inherit = testthat::Reporter,
  private = list(
    filename = NULL
  ),
  public = list(

    #' @description Initialize the reporter with optional arguments
    #' @param ... Additional arguments passed to parent class
    initialize = function(...) {
      super$initialize(...)
      private$filename <- NULL
      self$capabilities$parallel_support <- TRUE
      # FIXME: self$capabilities$parallel_updates <- TRUE
    },

    #' @description Start the test reporter session
    start_reporter = function() {
      self$cat_json(list(type = "start_reporter"))
    },

    #' @description Start processing a test file
    #' @param filename Character string, name of the test file
    start_file = function(filename) {
      self$cat_json(list(type = "start_file", filename = filename))
      private$filename <- filename
    },

    #' @description Start a test case
    #' @param context Character string, test context name
    #' @param test Character string, test name
    start_test = function(context, test) {
      self$cat_json(list(type = "start_test", test = as.character(test)))
    },

    #' @description Add a test result
    #' @param context Character string, test context name
    #' @param test Character string, test name
    #' @param result Test result object from testthat
    add_result = function(context, test, result) {
      test_result <- list(
        type = "add_result",
        context = context,
        test = as.character(test),
        result = expectation_type(result),
        location = expectation_location(result),
        filename = expectation_filename(result)
      )
      if (!is.null(expectation_message(result))) {
        test_result[["message"]] <- expectation_message(result)
      }
      self$cat_json(test_result)
    },

    #' @description End a test case
    #' @param context Character string, test context name
    #' @param test Character string, test name
    end_test = function(context, test) {
      self$cat_json(list(type = "end_test", test = as.character(test)))
    },

    #' @description End processing a test file
    end_file = function() {
      self$cat_json(list(type = "end_file", filename = private$filename))
      private$filename <- NULL
    },

    #' @description End the test reporter session
    end_reporter = function() {
      self$cat_json(list(type = "end_reporter"))
    },

    #' @description Output JSON data to console
    #' @param x Object to convert to JSON and output
    cat_json = function(x) {
      self$cat_line(jsonlite::toJSON(x, auto_unbox = TRUE))
      flush.console()
    }
  )
)

expectation_type <- function(exp) {
  stopifnot(is.expectation(exp))
  gsub("^expectation_", "", class(exp)[[1]])
}

expectation_success <- function(exp) expectation_type(exp) == "success"
expectation_failure <- function(exp) expectation_type(exp) == "failure"
expectation_error   <- function(exp) expectation_type(exp) == "error"
expectation_skip    <- function(exp) expectation_type(exp) == "skip"
expectation_warning <- function(exp) expectation_type(exp) == "warning"
expectation_broken  <- function(exp) expectation_failure(exp) || expectation_error(exp)
expectation_requires_message  <- function(exp) expectation_broken(exp) || expectation_skip(exp)
expectation_ok      <- function(exp) expectation_type(exp) %in% c("success", "warning")

expectation_message <- function(x) {
  if (expectation_requires_message(x)) {
    x$message
  } else {
    NULL
  }
}

expectation_filename <- function(x) {
  return(
    if(is.null(x$srcref)) "" else attr(x$srcref, "srcfile")$filename
  )
}

expectation_location <- function(x) {
  if (is.null(x$srcref)) {
    "???"
  } else {
    filename <- attr(x$srcref, "srcfile")$filename
    if (identical(filename, "")) {
      paste0("Line ", x$srcref[1])
    } else {
      paste0(basename(filename), ":", x$srcref[1], ":", x$srcref[2])
    }
  }
}
