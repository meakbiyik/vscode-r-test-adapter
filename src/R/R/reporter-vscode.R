#' Test reporter: TAP format.
#'
#' This reporter will output results in the Test Anything Protocol (TAP),
#' a simple text-based interface between testing modules in a test harness.
#' For more information about TAP, see http://testanything.org
#'
#' @export
#' @family reporters
VsCodeReporter <- R6::R6Class("VsCodeReporter",
  inherit = Reporter,
  private = list(
    filename = NULL
  ),
  public = list(
    suite_name = NULL,

    initialize = function(suite_name, ...) {
      super$initialize(...)
      self$suite_name <- suite_name
      private$filename <- NULL
      self$capabilities$parallel_support <- TRUE
      # FIXME: self$capabilities$parallel_updates <- TRUE
    },

    start_reporter = function() {
      self$cat_json(list(type = "start_reporter", tests = list(self$suite_name)))
    },

    start_file = function(filename) {
      self$cat_json(list(type = "start_file", filename = filename))
      private$filename <- filename
    },

    start_test = function(context, test) {
      self$cat_json(list(type = "start_test", context = context, test = test))
    },

    add_result = function(context, test, result) {
      self$cat_json(list(
        type = "add_result",
        context = context,
        test = test,
        result = expectation_type(result),
        message = exp_message(result),
        location = expectation_location(result)
      ))
    },

    end_test = function(context, test) {
      self$cat_json(list(type = "end_test", context = context, test = test))
    },

    end_file = function() {
      self$cat_json(list(type = "end_file", filename = private$filename))
      private$filename <- NULL
    },

    end_reporter = function() {
      self$cat_json(list(type = "end_reporter", tests = list(self$suite_name)))
    },

    cat_json = function(x) {
      self$cat_line(jsonlite::toJSON(x, auto_unbox = TRUE))
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
expectation_ok      <- function(exp) expectation_type(exp) %in% c("success", "warning")

exp_message <- function(x) {
  if (expectation_error(x)) {
    paste0("Error: ", x$message)
  } else {
    x$message
  }
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
