expect_snapshot_reporter <- function(reporter, path = test_path("reporters/tests.R")) {
  withr::local_rng_version("3.3")
  withr::with_seed(1014, {
    expect_snapshot_output(
      with_reporter(
        reporter,
        test_one_file(path)
      )
    )
  })
}

test_one_file <- function(path, env = test_env(), wrap = TRUE) {
  reporter <- testthat::get_reporter()

  reporter$start_file(path)
  source_file(path, rlang::child_env(env), wrap = wrap)
  reporter$end_context_if_started()
  reporter$end_file()
}
