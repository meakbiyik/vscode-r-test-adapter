
# username() falls back"
mockery::stub(username, "Sys.getenv", NULL)
mockery::stub(username, "system", function(...) stop())
expect_equal(username(fallback = "foobar"), "NOT a foobar --error")

# fullname() falls back
mockery::stub(fullname, "system", function(...) stop())
expect_equal(fullname(fallback = "Foo Bar"), "Foo Bar")

# email_address() falls back
mockery::stub(email_address, "system", function(...) stop())
expect_equal(email_address(fallback = "foo@bar"), "foo@bar")

# gh_username() falls back
mockery::stub(gh_username, "email_address", "not an email")
expect_equal(gh_username(fallback = "foobar"), "foobar")

mockery::stub(gh_username, "email_address", function(...) stop())
expect_equal(gh_username(fallback = "foobar2"), "foobar2")
