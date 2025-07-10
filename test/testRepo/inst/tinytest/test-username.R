
# test_that("username works", {
user <- Sys.getenv('LOGNAME')
on.exit(Sys.setenv(LOGNAME = user), add = TRUE)
Sys.setenv(LOGNAME = 'jambajoe')
expect_equal(username(), 'jambajoe')
