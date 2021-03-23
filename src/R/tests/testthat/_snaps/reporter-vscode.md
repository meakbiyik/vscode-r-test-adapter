# reporter works

    {"type":"start_reporter","tests":["suite_name"]}
    {"type":"start_test","context":{},"test":"Success"}
    {"type":"add_result","context":{},"test":"Success","result":"success","message":"Success has been forced","location":"tests.R:2:3"}
    {"type":"end_test","context":{},"test":"Success"}
    {"type":"start_test","context":{},"test":"Failure:1"}
    {"type":"add_result","context":{},"test":"Failure:1","result":"failure","message":"FALSE is not TRUE\n\n`actual`:   FALSE\n`expected`: TRUE ","location":"tests.R:6:3"}
    {"type":"end_test","context":{},"test":"Failure:1"}
    {"type":"start_test","context":{},"test":"Failure:2a"}
    {"type":"add_result","context":{},"test":"Failure:2a","result":"failure","message":"FALSE is not TRUE\n\n`actual`:   FALSE\n`expected`: TRUE ","location":"tests.R:11:3"}
    {"type":"end_test","context":{},"test":"Failure:2a"}
    {"type":"start_test","context":{},"test":"Error:1"}
    {"type":"add_result","context":{},"test":"Error:1","result":"error","message":"Error: stop","location":"tests.R:15:3"}
    {"type":"end_test","context":{},"test":"Error:1"}
    {"type":"start_test","context":{},"test":"errors get tracebacks"}
    {"type":"add_result","context":{},"test":"errors get tracebacks","result":"error","message":"Error: !","location":"tests.R:23:3"}
    {"type":"end_test","context":{},"test":"errors get tracebacks"}
    {"type":"start_test","context":{},"test":"explicit skips are reported"}
    {"type":"add_result","context":{},"test":"explicit skips are reported","result":"skip","message":"Reason: skip","location":"tests.R:27:3"}
    {"type":"end_test","context":{},"test":"explicit skips are reported"}
    {"type":"start_test","context":{},"test":"empty tests are implicitly skipped"}
    {"type":"add_result","context":{},"test":"empty tests are implicitly skipped","result":"skip","message":"Reason: empty test","location":"tests.R:30:1"}
    {"type":"end_test","context":{},"test":"empty tests are implicitly skipped"}
    {"type":"start_test","context":{},"test":"warnings get backtraces"}
    {"type":"add_result","context":{},"test":"warnings get backtraces","result":"warning","message":"def","location":"tests.R:37:3"}
    {"type":"end_test","context":{},"test":"warnings get backtraces"}
    {"type":"end_reporter","tests":["suite_name"]}
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

