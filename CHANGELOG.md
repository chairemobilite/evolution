# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased (0.6.0)] - YYYY-MM-DD

### Added

- **CSS refresh in dev mode**: Changes to `.scss` files are automatically picked up by `yarn build:dev` and apply after a page reload (fixes [#1403](https://github.com/chairemobilite/evolution/issues/1403)). Survey projects that want the same: see [#1407](https://github.com/chairemobilite/evolution/pull/1407) for the webpack modifications.
- Added `maxAccessEgressTravelTimeMinutes` and `walkingSpeedKmPerHour` to accessibility map calculation parameters ([#1379](https://github.com/chairemobilite/evolution/pull/1379))
- Added utility functions for webpack generation in evolution-frontend: `createParticipantWebpackConfig` and `createAdminWebpackConfig`. The example projects implement this approach. Projects should consider using those for simlicity. ([#1405](https://github.com/chairemobilite/evolution/issues/1405))
- **Generator custom labels support**: Widget generation can now import and use custom labels, allowing label overrides without a full custom widget. In the `Widgets` Excel sheet, set this in the `parameters` column: `customLabels={{yourCustomLabelsKey}}` (fixes [#1035](https://github.com/chairemobilite/evolution/issues/1035))
- **Generator built-in widgets**: In the `Widgets` Excel sheet, set `inputType=BuiltIn` and add `builtInFunction={{yourBuiltInFunctionName}}` in the `parameters` column (Part [#902](https://github.com/chairemobilite/evolution/issues/902)).
- Added the `WidgetConfigFactory` and `SectionConfigFactory` interfaces that can be implemented to provide builtin widgets and features. These interfaces are expected to return the complete section and widget configurations necessary for the builtin feature. (commit [f2ade4d](https://github.com/chairemobilite/evolution/commit/f2ade4d1e3e69b13e30e851d034b751e1955efc9))
- Segment section configuration accepts additional widget names as an array of strings in the `additionalSegmentWidgetNames` property. The widgets need to be defined in the survey and will be added after the mode questions (#1345). It also includes the option to ask who was driving a vehicle, with the `askSegmentDriver` boolean option (fixes [#1434](https://github.com/chairemobilite/evolution/issues/1434)).
- Added various builtin audit checks: home in survey area, survey contactEmail and helpContactEmail validation, missing home, mismatched household members and declared count, missing or invalid vehicle count
- Added `platform`, `os`, `browser` and `language` fields to each record of the exported paradata (fixes [#1395](https://github.com/chairemobilite/evolution/issues/1395))
- Config: Added the `workingAge` (default to 15) and `schoolMandatoryAge` (default to 15) configuration options, used to show various questions about work or school in the household sections (commit [0014238](https://github.com/chairemobilite/evolution/commit/0014238cf7a111fccac067b7fe50ba50291b2ce7)).
- OD survey helpers: new helper functions available directly in survey: 
  - `isStudentFromSchoolType` (commit [e742efa](https://github.com/chairemobilite/evolution/commit/55d89bbaa7d11eb533cd38c639bdde742efa94b3e42f4a1a28471ed671f9ee567654aa9a90c59e52))
  - `hasOrUnknownDrivingLicense` (commit [b5e8171](https://github.com/chairemobilite/evolution/commit/b5e81716ab620876a7fbd5661c23d786fbfcc699))
  - `getCarsharingMembersCount` (commit [33353d9](https://github.com/chairemobilite/evolution/commit/33353d901fd0d71ba370d93a3de520f80e22f9a5))
  - `getPotentialDrivers`  (commit [95e198d](https://github.com/chairemobilite/evolution/commit/95e198db3854771ad1b09886e72a0392dbb2a604))
  - `isLoopActivity` (commit [26cdb7e](https://github.com/chairemobilite/evolution/commit/26cdb7e92e8fa539d57c9d00439aacdbd97512bc))
  - `getFirstIncompleteVisitedPlace` (commit [600bb6e](https://github.com/chairemobilite/evolution/commit/600bb6ea2f019dc07400440f84c380d1f4cc1dce))
  - `reconcileVisitedPlaces` (commit [cb1e699](https://github.com/chairemobilite/evolution/commit/cb1e699ba27534c8056597045012e5e7af2157e9))
  - `deleteVisitedPlace` (commit [fd6e33b](https://github.com/chairemobilite/evolution/commit/fd6e33bfa36c16b741469b30dd5ca90ef1948083))
  - `addVisitedPlace` (commit [3b3be2d](https://github.com/chairemobilite/evolution/commit/3b3be2d7d0d79e5f5b4928f6784e892d67562687))
  - `getHomeAddressOneLine` (commit [3b28f45](https://github.com/chairemobilite/evolution/commit/3b28f454515445b4b438bfcb6cf00e1a8fffcde9))
  - `shouldShowTripsAndPlacesSections` (commit [852a240](https://github.com/chairemobilite/evolution/commit/852a240a98d3c3a92197fe9684102df1326545f4))
- Added a `visitedPlaces` section configuration, which includes activity, location and next place category questions, with the  `VisitedPlacesSectionFactory` class (fixes [#1437](https://github.com/chairemobilite/evolution/issues/1437))
- Provide a `VisitedPlacesSection` template to be used in the UI to display visited places. The template can be used by the `visitedPlaces` name in the `template` property of a section's configuration (fixes [#1446](https://github.com/chairemobilite/evolution/issues/1446)).
- The `getFormattedDate` widget factory option now takes an optional options parameter to fine-tune the desired format of the date (commit [8dbd493](https://github.com/chairemobilite/evolution/commit/8dbd4938c1dd4f5466a8c19b3b90f934e63b953f))
- Add a `QuestionnaireConfiguration` type, that allows to configure an optional trip diary (which can include a visited places and segments sections). The `QuestionnaireFactory` class receives the configuration and returns the builtin widgets and sections from config. (commit [be226aa](https://github.com/chairemobilite/evolution/commit/be226aab8ad8f84b027a380dd90af70e2989e62d)).

### Changed

- **BREAKING**: if using the webpack generation functions and the project has a `locales` folder, make sure an empty module file is present in the folder for build time import. An empty file named `index.js` at the root of the project's `locales` folder is enough. Webpack will replace it with the actual translations in the build. (fixes [#1426](https://github.com/chairemobilite/evolution/issues/1426))
- **BREAKING**: the `addGroupedObjects` function now returns an object of type `{ valuesByPath: Record<string, unknown>, newObjects: QuestionnaireObjectWithUuidAndSequence[] }` instead of only the values by path. Previous code can simply use the response's `valuesByPath` field to have the same data as before (commit [8f0efbf](https://github.com/chairemobilite/evolution/commit/8f0efbf03e736b050d873b4c676c38053749f489)).
- **BREAKING**: Add a second field for the `buttonActions` of the `WidgetFactoryOptions`: the previous `validateButtonAction` is now expected to simply validate without checking the section completion (to be used for grouped object for example), while the `validateButtonActionWithCompleteSection` will handle section completion as well and should be used at the end of sections (commit [52660e1](https://github.com/chairemobilite/evolution/commit/52660e16d4ff1faa217ea5b0648028c59bd8795d))
- **BREAKING**: Many builtin widgets now implement the `WidgetConfigFactory` and `SectionConfigFactory` instead of simple function calls (commit [f2ade4d](https://github.com/chairemobilite/evolution/commit/f2ade4d1e3e69b13e30e851d034b751e1955efc9)).
  - `getSwitchPersonWidgets` => `SwitchPersonWidgetsFactory`
  - `getPersonsTripsGroupConfig` => `PersonTripsGroupConfigFactory`
  - `getSegmentsGroupConfig` => `SegmentsGroupConfigFactory`
  - `getSegmentsSectionConfig` => `SegmentsSectionFactory`


### Deprecated

### Removed

### Fixed

- Allow to effectively override locales from Evolution by survey specifics with the same key. Fix is applied automatically on projects calling the `createParticipantWebpackConfig` and `createAdminWebpackConfig` webpack helpers. (fixes [#1426](https://github.com/chairemobilite/evolution/issues/1426))
- Yaml translation files generated by the generator now produce nested keys instead of '.' separated, to match Evolution's builtin format (fixes [#1529](https://github.com/chairemobilite/evolution/issues/1529))

### Security

### Dependency updates

- style-loader: 4.0.0
- lodash: 4.17.21 => 4.18.1
- @types/lodash: 4.17.21 => 4.17.23
- yargs: 17.7.2 => 18.0.0
- i18next: 25.7.4 => 26.0.6
- i18next-browser-languagedetector: 8.2.0 => 8.2.1
- i18next-fs-backend: 2.6.1 => 2.6.4
- @turf/turf: 7.3.1 => 7.3.5
- @casl/ability: 6.7.3 => 6.8.1
- In the root `package.json` add a resolution of `kdbush` to 3.0.0 to avoid compilation errors with some packages depending on a more recent version. This requirement comes from Transition, who does the same (see https://github.com/chairemobilite/transition/issues/921 to track issue to upgrade/remove `kdbush`).

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
