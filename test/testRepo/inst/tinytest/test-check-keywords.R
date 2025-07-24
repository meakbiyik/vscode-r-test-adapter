
# This is a general-purpose scratchpad test
# for dummy testing of tinytest keywords

add_one <- function(x) {
  x + 1
}
some_numbers <- c(1, 2, 3)
some_strings <- c("aaa", "aab", "aac")

expect_equal(add_one(1), 2)
expect_equal(add_one(1), 1)

expect_equivalent(add_one(1), 2)
expect_equivalent(add_one(1), 1)

expect_identical(add_one(1), 2)
expect_identical(add_one(1), 1)

expect_length(some_numbers, 3)
expect_length(some_numbers, 4)

expect_true(length(some_numbers) == 3)
expect_true(length(some_numbers) == 4)

expect_false(length(some_numbers) == 4)
expect_false(length(some_numbers) == 3)

expect_inherits(some_strings, "character")
expect_inherits(some_strings, "numeric")

expect_inherits(some_strings, "character")
expect_inherits(some_strings, "numeric")

expect_null(NULL)
expect_null(some_strings)

expect_error(library("asdf"), "asdf")
expect_error(1+1, "there is no error")

expect_warning(warning("asdf"), "asdf")
expect_warning(1+1, "there is no warning")

expect_message(message("asdf"), "asdf")
expect_message(1+1, "there is no message")

expect_silent(1+1)
expect_silent(error("there is no error and no warning"))

expect_stdout(print("hello"), "hello")
expect_stdout(1+1, "output should be empty")

report_side_effects()
Sys.setenv(hihi="lol")
