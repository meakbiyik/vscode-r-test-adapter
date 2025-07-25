
# test_that("fullname fallback"
mockery::stub(fullname, "system", function(cmd, ...) {
  if (grepl("^git config", cmd)) {
    "Joe Jamba"
  } else {
    NULL
  }
})
expect_equal(fullname(), "Joe Jamba")

# test_that("FULLNAME env var"
expect_equal(
  withr::with_envvar(c("FULLNAME" = "Bugs Bunny"), fullname()),
  "Bugs Bunny")
