test_that("reporter works", {
  expect_snapshot_reporter(VsCodeReporter$new())
})
