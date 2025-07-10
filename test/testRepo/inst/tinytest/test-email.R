
# Email address works
mockery::stub(email_address, "system", "jambajoe@joe.joe")
expect_equal(email_address(), "jambajoe@joe.joe")

# EMAIL env var
expect_equal(
  withr::with_envvar(c("EMAIL" = "bugs.bunny@acme.com"), email_address()),
  "bugs.bunny@acme.com")

# Email address
# it works
  mockery::stub(email_address, "system", "jambajoe@joe.joe")
  expect_equal(email_address(), "jambajoe@joe.joe")

# it got EMAIL env var
  expect_equal(
    withr::with_envvar(c("EMAIL" = "bugs.bunny@acme.com"), email_address()),
    "bugs.bunny@acme.com")
