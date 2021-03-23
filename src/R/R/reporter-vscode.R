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
  public = list(
    suite_name = NULL,
    results = list(),
    n = 0L,
    has_tests = FALSE,
    contexts = NA_character_,

    initialize = function(suite_name, ...) {
      super$initialize(...)
      self$suite_name <- suite_name
      self$capabilities$parallel_support <- TRUE
    },

    start_reporter = function() {
      self$cat_json(list(type = "started", tests = list(self$suite_name)))
    },

    start_context = function(context) {
      self$contexts[self$n + 1] <- context
    },

    start_test = function(context, test) {
      self$cat_json(list(type = "start_test", context = context, test = test))
    },

    add_result = function(context, test, result) {
      self$has_tests <- TRUE
      self$n <- self$n + 1L
      self$results[[self$n]] <- result
    },

    end_test = function(context, test) {
      self$cat_json(list(type = "end_test", context = context, test = test))
    },

    end_reporter = function() {
      if (!self$has_tests) {
        return()
      }

      self$cat_line("1..", self$n)
      for (i in 1:self$n) {
        if (!is.na(self$contexts[i])) {
          self$cat_line("# Context ", self$contexts[i])
        }
        result <- self$results[[i]]
        if (expectation_success(result)) {
          self$cat_line("ok ", i, " ", result$test)
        } else if (expectation_broken(result)) {
          self$cat_line("not ok ", i, " ", result$test)
          msg <- gsub("(^|\n)", "\\1  ", format(result))
          self$cat_line(msg)
        } else {
          self$cat_line(
            "ok ", i, " # ", toupper(expectation_type(result)), " ",
            format(result)
          )
        }
      }
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
