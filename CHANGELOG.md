# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
## Added
## Changed
## Removed
## Fixed

## [0.1.1]
## Fixed
- tree-sitter path resolution for Windows
- Some possible issues with tree-sitter output parser

## [0.1.0]
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

[Unreleased]: https://github.com/meakbiyik/vscode-r-test-adapter/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/meakbiyik/vscode-r-test-adapter/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/meakbiyik/vscode-r-test-adapter/compare/v0.0.2...v0.1.0
[0.0.2]: https://github.com/meakbiyik/vscode-r-test-adapter/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/meakbiyik/vscode-r-test-adapter/releases/tag/v0.0.1