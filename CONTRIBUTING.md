
# Internals

We currently support only `tinytest` and `testthat` frameworks.
They both reuse the same [VSCodeEventStream](./streams.ts) class which processes
JSONs from [VSCode Testthat Reporter](./testthat/reporter/R/reporter-vscode.R).
The reporter is attached to both frameworks in so called 'entry points'
on the R side. See below.

## TODO list

Some improvement suggestions:

 1. refactor [VSCode Testthat Reporter](./testthat/reporter/R/reporter-vscode.R)
such that it doesn't depend on `testthat`
 2. add .vscode/settings.json options to specify the search paths during
 `testthat` and `tinytest` discovery

## testthat

### [Entry point](./testthat/runner.ts)

The entry point for `testthat` tests wraps the original `testthat::describe` and
`testthat::test_that` functions so they execute only the test with the given ID.

Additionally, the entry point hooks in the
[VSCodeReporter](./testthat/reporter/R/reporter-vscode.R) class as the
`testthat` reporter so that apriopriate JSONs get emitted to stdout of the R
process. Those JSONs get consumed from the stdout of the R process by
[VSCodeEventStream](./streams.ts) on the Typescript side.

## tinytest

### [Entry point](./tinytest/runner.ts)

Please note that in `tinytest` there is no concept of "reporters" as in
`testthat`. Yet it would be good to reuse VSCode Testthat Reporter (both the 
R [VSCodeReporter](./testthat/reporter/R/reporter-vscode.R) and
Typescript [VSCodeEventStream](./streams.ts)).

We fix that gap in the entry point by hacking into `tinytest` R
implementation. There are two possible approaches:
 1. you emit JSONs manually from result objects of `tinytest::run_test_file`
 2. observe that all `tinytest::expect_*` functions internally call
 `tinytest::tinytest` as their epilog (have a look at e.g.
 [expect_equal implementation](https://github.com/markvanderloo/tinytest/blob/c3ddc5b1a4500d2be210a374e6dc025f6cdbaa14/pkg/R/expectations.R#L290)) and hack it such that it has a side effect of emitting our JSONs

Additionally, note that in the Debug mode you can't utilize 1. because you need
to call `.vsc.debugSource` which doesn't let you call `tinytest::run_test_file`
or return anything at all. So the 1st approach won't work in the Debug mode.

On the other hand, the 2nd approach won't work in the non-Debug mode because the
source locations haven't been reconciled yet at the point when
`tinytest::expect_*` (and thus `tinytest::tinytest`) gets called.
Have a look at [run_test_file internal implementation](https://github.com/markvanderloo/tinytest/blob/c3ddc5b1a4500d2be210a374e6dc025f6cdbaa14/pkg/R/tinytest.R#L689).
Please note however that this doesn't impact the Debug mode
because `.vsc.debugSource` loads source locations of all R functions
immediately and they are available when `tinytest::tinytest` gets called anyway.

So long story short, 1. works for non-Debug mode while 2. works for Debug mode.
The `tinytest`-specific entry point mimics that.

## tinytest vs testthat

[VSCodeEventStream](./streams.ts) treats both frameworks differently. See [runTestthatTest](./runner.ts)
and [runTinytestTest](./runner.ts) for fundamental differences. They are created
 in a factory called [buildTestRunner](./runner.ts) which takes 2 parameters that
 differentiate how we treat `tinytest` and `testthat`:
 1. _entryPoint_: see [testthatEntryPoint in ./testthat/runner.ts](./testthat/runner.ts)
 and [tinytestEntryPoint in ./tinytest/runner.ts](./tinytest/runner.ts) for
 reference
 2. _shouldHighlightOutput_: this controls if we append failure messages to
 their corresponding lines as comments. We need this feature because `tinytest`
 doesn't have a concept of 'named tests' (it just uses file+line number to identify
 successful&failing assertions). See the image below.
 ![shouldHighlightOutput](./img/tinytest-vs-testthat.jpg)
