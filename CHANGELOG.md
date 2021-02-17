<!-- markdownlint-disable MD022 MD024 MD032 -->
# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.2] - 17.02.2021
### Fixed
- Wrong test id in single test runs, causing the tests to always show up as passed

## [0.2.1] - 14.02.2021
### Added
- Ignore test files created by R CMD check

## [0.2.0] - 20.01.2021
### Added
- Much better Rscript path resolution
- Rscript path support with `RTestAdapter.RscriptPath` configuration.
- More tests for adapter run checks

### Changed
- Cancel processes with "SIGINT" instead of "SIGTERM" on command.

## [0.1.2] - 19.01.2021
### Fixed
- Binary path resolution for all platforms

## [0.1.1] - 19.01.2021
### Fixed
- tree-sitter path resolution for Windows
- Some possible issues with tree-sitter output parser

## [0.1.0] - 18.01.2021
### Added
- Better testing

### Changed
- Prevent concurrent parsing and running
- Allow empty test files
- Manually generate temporary test file names

### Fixed
- Race condition on temporary file registration and directory watcher triggers

## [0.0.2] - 2021-01-17
### Fixed
- Fix Azure Pipelines authentication error.

## [0.0.1] - 2021-01-17
### Added
- Initial release of the VS Code R Test Explorer extension.
- Contains the infrastructure to parse and run R tests written with testthat framework.

[Unreleased]: https://github.com/meakbiyik/vscode-r-test-adapter/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/meakbiyik/vscode-r-test-adapter/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/meakbiyik/vscode-r-test-adapter/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/meakbiyik/vscode-r-test-adapter/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/meakbiyik/vscode-r-test-adapter/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/meakbiyik/vscode-r-test-adapter/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/meakbiyik/vscode-r-test-adapter/compare/v0.0.2...v0.1.0
[0.0.2]: https://github.com/meakbiyik/vscode-r-test-adapter/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/meakbiyik/vscode-r-test-adapter/releases/tag/v0.0.1
