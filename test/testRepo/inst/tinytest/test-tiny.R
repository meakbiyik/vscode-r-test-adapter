
addOne <- function(x) {x + 1}

# this test should pass
expect_equal(addOne(1), 2 )

# this test will fail
expect_equal(addOne(3),
    2+2)

# this test will fail
expect_equal(addOne(77), 2+2)
