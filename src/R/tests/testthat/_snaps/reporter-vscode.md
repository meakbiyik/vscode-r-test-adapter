# reporter works

    {"type":"started","tests":["suite_name"]}
    1..8
    ok 1 Success
    not ok 2 Failure:1
      FALSE is not TRUE
      
      `actual`:   FALSE
      `expected`: TRUE 
    not ok 3 Failure:2a
      FALSE is not TRUE
      
      `actual`:   FALSE
      `expected`: TRUE 
      Backtrace:
       1. f() reporters/tests.R:11:2
       2. testthat::expect_true(FALSE) reporters/tests.R:10:7
    not ok 4 Error:1
      Error: stop
    not ok 5 errors get tracebacks
      Error: !
      Backtrace:
       1. f() reporters/tests.R:23:2
       2. g() reporters/tests.R:19:7
       3. h() reporters/tests.R:20:7
    ok 6 # SKIP Reason: skip
    ok 7 # SKIP Reason: empty test
    ok 8 # WARNING def
    Backtrace:
     1. f() reporters/tests.R:37:2

