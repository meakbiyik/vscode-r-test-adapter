# reporter works

    1..13
    ok 1 # WARNING `context()` was deprecated in the 3rd edition.
    Backtrace:
     1. testthat::context("Successes") reporters/tests.R:1:0
     2. testthat:::edition_deprecate(3, "context()") /home/kirill/git/R/testthat/R/context.R:27:2
    # Context Successes
    ok 2 Success
    ok 3 # WARNING `context()` was deprecated in the 3rd edition.
    Backtrace:
     1. testthat::context("Failures") reporters/tests.R:7:0
     2. testthat:::edition_deprecate(3, "context()") /home/kirill/git/R/testthat/R/context.R:27:2
    # Context Failures
    not ok 4 Failure:1
      FALSE is not TRUE
      
      `actual`:   FALSE
      `expected`: TRUE 
    not ok 5 Failure:2a
      FALSE is not TRUE
      
      `actual`:   FALSE
      `expected`: TRUE 
      Backtrace:
       1. f() reporters/tests.R:15:2
       2. testthat::expect_true(FALSE) reporters/tests.R:14:7
    ok 6 # WARNING `context()` was deprecated in the 3rd edition.
    Backtrace:
     1. testthat::context("Errors") reporters/tests.R:18:0
     2. testthat:::edition_deprecate(3, "context()") /home/kirill/git/R/testthat/R/context.R:27:2
    # Context Errors
    not ok 7 Error:1
      Error: stop
    not ok 8 errors get tracebacks
      Error: !
      Backtrace:
       1. f() reporters/tests.R:29:2
       2. g() reporters/tests.R:25:7
       3. h() reporters/tests.R:26:7
    ok 9 # WARNING `context()` was deprecated in the 3rd edition.
    Backtrace:
     1. testthat::context("Skips") reporters/tests.R:32:0
     2. testthat:::edition_deprecate(3, "context()") /home/kirill/git/R/testthat/R/context.R:27:2
    # Context Skips
    ok 10 # SKIP Reason: skip
    ok 11 # SKIP Reason: empty test
    ok 12 # WARNING `context()` was deprecated in the 3rd edition.
    Backtrace:
     1. testthat::context("Warnings") reporters/tests.R:41:0
     2. testthat:::edition_deprecate(3, "context()") /home/kirill/git/R/testthat/R/context.R:27:2
    # Context Warnings
    ok 13 # WARNING def
    Backtrace:
     1. f() reporters/tests.R:47:2

