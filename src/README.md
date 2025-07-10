
# Internals

We currently support only `tinytest` and `testthat` frameworks.
They both reuse the same [VSCodeEventStream](./streams.ts) class which processes
JSONs from [VSCode Testthat Reporter](./testthat/reporter/R/reporter-vscode.R).
The reporter is attached to both frameworks in so called 'entry points'. See
below.

TODO: refactor [VSCode Testthat Reporter](./testthat/reporter/R/reporter-vscode.R)
such that you it doesn't depend on `testthat`.

## tinytest vs testthat

[VSCodeEventStream](./streams.ts) treats both frameworks differently. See [runTestthatTest](./runner.ts)
and [runTinytestTest](./runner.ts) for fundamental differences. They are created
 in a factory called `buildTestRunner` which takes 2 fundamental parameters that
 differentiate how we treat `tinytest` and `testthat`:
 1. _entryProvider_ (aka 'entry point'): see [testthatEntryPoint in ./testthat/runner.ts](./testthat/runner.ts)
 and [tinytestEntryPoint in ./tinytest/runner.ts](./tinytest/runner.ts) for
 reference.
 2. _shouldHighlightOutput_: this controls if we append failure messages to
 their corresponding lines as comments. We need this feature because `tinytest`
 doesn't have a concept of 'named tests' (it just uses file+line number to identify
 successful&failing assertions). See the image below.
 ![shouldHighlightOutput](./img/tinytest-vs-testthat.png)