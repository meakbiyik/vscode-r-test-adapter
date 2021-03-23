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
