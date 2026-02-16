# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased (0.5.1)] - YYYY-MM-DD

### Added
- Added `platform`, `os`, `browser` and `language` fields to each record of the exported paradata (#1395)

### Changed

### Deprecated

### Removed

### Fixed

### Security

### Dependency updates


## [0.5.0] - 2026-01-30

### Added
- Initial CHANGELOG.md structure
- Navigation between section is now handled through a `SectionConfig` type (see #976, _needs documentation_) 
- The `startNavigate` redux action was introduced for section changes instead of `startUpdateInterview` with a `response._activeSection` (0541f0663fa9ba521d384359eacc99392c509dee)

### Changed
- BREAKING: rename `requestResponses` to `requestedFields` in the `downloadCsvFile` function call (f5d33f73b930a4ceb3741bd165a0d0b46680def4)
- BREAKING: The generator now escapes label with nicknames. Projects using this feature need to make sure to have the `lodash/escape` dependency (fe502f657335aed90c86750f4405a6a1ae13eecd)
- BREAKING: In generated surveys, the `preload` functions need to be renamed to `customPreload` (b4086b1d0ed07cd020cb6ba20d836ddf74fa5b9b)
- BREAKING: Label columns in the Excel files for the generator need to be renamed to `label::fr` and `label::en` (b4086b1d0ed07cd020cb6ba20d836ddf74fa5b9b)
- BREAKING: `responses` is renamed to `response` and `validated_date` to `corrected_response` (see ff99479a4653798d5e135bc5966d24888a8e7b79 and 2d96e3d4ed56e3e15da86723f0281be1b4d15611)
- BREAKING: The `startUpdateInterview` action call now takes named arguments instead of positional ones, for more clarity (03db104f9fea64081848d5ecbfd5b8e7074a12b2)
- BREAKING: Generator specific typescript types imported from `evolution-generator` now use the equivalent in evolution-common (59699a105f6279a7a9d6c217f36cc19853b489aa)
- Update sass stylesheets (ee6efc8a788bbc3bd00c7377957ff5e818142ff2)

### Deprecated
- Navigating to another section by calling `startUpdateInterview` with a `response._activeSection` is now deprecated, use the `startNavigate` action instead (0541f0663fa9ba521d384359eacc99392c509dee)

### Removed

### Fixed

### Security

### Dependency updates

---

## Guidelines for updating this changelog

### Types of changes
- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

### Version format
- Use semantic versioning (MAJOR.MINOR.PATCH)
- MAJOR: incompatible API changes
- MINOR: backwards-compatible functionality additions
- PATCH: backwards-compatible bug fixes

### Best practices
- Keep an "Unreleased" section at the top for upcoming changes
- Add release date in YYYY-MM-DD format when publishing a version
- Group changes by type (Added, Changed, etc.)
- Write from the user's perspective
- Be concise but descriptive
- Link to issues/PRs when relevant


