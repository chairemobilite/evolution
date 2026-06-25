# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased (0.6.0)] - YYYY-MM-DD

### Added

- Config: Support several access code formats. Set the `accessCodeFormat` config option to one of the predefined formats (e.g. `'0000-0000'` (default), `'000-000-000'`, `'ABCD-ABCD'`, `'ABC-000-000'`) to choose your survey's format (fixes [#1668](https://github.com/chairemobilite/evolution/issues/1668)).
- Validation list: filter by several access codes at once, typed or imported from a CSV file (fixes [#1660](https://github.com/chairemobilite/evolution/issues/1660)).
- **Generator Excel to CSV copy**: Generator can now write one CSV file per Excel sheet in a `<Name_Excel_File>_csv` folder next to the Excel file, making Excel changes easier to review in git diffs. To enable it, add `copy_excel_to_csv: true` under `enabled_scripts` in your `generatorConfig.yaml` (fixes [#1580](https://github.com/chairemobilite/evolution/issues/1580)).
- **CSS refresh in dev mode**: Changes to `.scss` files are automatically picked up by `yarn build:dev` and apply after a page reload (fixes [#1403](https://github.com/chairemobilite/evolution/issues/1403)). Survey projects that want the same: see [#1407](https://github.com/chairemobilite/evolution/pull/1407) for the webpack modifications.
- Added `maxAccessEgressTravelTimeMinutes` and `walkingSpeedKmPerHour` to accessibility map calculation parameters ([#1379](https://github.com/chairemobilite/evolution/pull/1379))
- Added utility functions for webpack generation in evolution-frontend: `createParticipantWebpackConfig` and `createAdminWebpackConfig`. The example projects implement this approach. Projects should consider using those for simlicity. ([#1405](https://github.com/chairemobilite/evolution/issues/1405))
- **Generator custom labels support**: Widget generation can now import and use custom labels, allowing label overrides without a full custom widget. In the `Widgets` Excel sheet, set this in the `parameters` column: `customLabels={{yourCustomLabelsKey}}` (fixes [#1035](https://github.com/chairemobilite/evolution/issues/1035))
- **Generator widget suffix labels**: In the `Widgets` Excel sheet, for `inputType=String` and `inputType=Number`, you can set `suffixLabel=sectionName:valueSuffix` in the `parameters` column to display a translatable suffix label on the right side of the input (fixes [#1241](https://github.com/chairemobilite/evolution/issues/1241)).
- **Generator built-in widgets**: In the `Widgets` Excel sheet, set `inputType=BuiltIn` and add `builtInFunction={{yourBuiltInFunctionName}}` in the `parameters` column (Part [#902](https://github.com/chairemobilite/evolution/issues/902)).
- **Generator conditionals context tokens**: Conditional `path` values can now include `${currentJourney}`, `${currentTrip}`, `${currentSegment}`, and `${currentVisitedPlace}` tokens (in addition to `${currentPerson}`) so generated conditionals can target the “current” OD survey objects (fixes [#1081](https://github.com/chairemobilite/evolution/issues/1081)).
- Added the `WidgetConfigFactory` and `SectionConfigFactory` interfaces that can be implemented to provide builtin widgets and features. These interfaces are expected to return the complete section and widget configurations necessary for the builtin feature. (commit [f2ade4d](https://github.com/chairemobilite/evolution/commit/f2ade4d1e3e69b13e30e851d034b751e1955efc9))
- Segment section configuration accepts additional widget names as an array of strings in the `additionalSegmentWidgetNames` property. The widgets need to be defined in the survey and will be added after the mode questions (#1345). It also includes the option to ask who was driving a vehicle, with the `askSegmentDriver` boolean option (fixes [#1434](https://github.com/chairemobilite/evolution/issues/1434)).
- Segment section configuration can set an array of fields representing geolocalization by setting the `fieldsWithGeojsonPoint` property. (fixes [#1603](https://github.com/chairemobilite/evolution/issues/1603)).
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
  - `insertEmptyVisitedPlace`/`insertVisitedPlace` (commits [481c0ba](https://github.com/chairemobilite/evolution/commit/481c0ba5ff600baddd1aed9269cc03f4d85507ae) and [1bb4428](https://github.com/chairemobilite/evolution/commit/1bb4428e5782301d902c6de8825ee459b62182e3))
  - `getHomeAddressOneLine` (commit [3b28f45](https://github.com/chairemobilite/evolution/commit/3b28f454515445b4b438bfcb6cf00e1a8fffcde9))
  - `shouldShowTripsAndPlacesSections` (commit [852a240](https://github.com/chairemobilite/evolution/commit/852a240a98d3c3a92197fe9684102df1326545f4))
  - `getJourneyContextFromPath`, `getTripContextFromPath`, `getVisitedPlaceContextFromPath`, `getSegmentContextFromPath` to get all objects in the interview from the path (fixes [#1538](https://github.com/chairemobilite/evolution/issues/1538))
  - `getCurrentJourneyId`, `getCurrentTripId`, `getCurrentSegmentId`, `getCurrentVisitedPlaceId` to extract current context ids from a widget path or from the interview’s active ids (commits [92f001e](https://github.com/chairemobilite/evolution/commit/92f001ef347195dce28a806280dfbfe508ca698d) and [492ce647](https://github.com/chairemobilite/evolution/commit/492ce6478bb82610523428136dbc231e79fbec1f))
  - `getVisitedPlaceDescription` (commit [d203578](https://github.com/chairemobilite/evolution/commit/d20357804046c1691278b97a5fd9caa74a2d587a))
  - `isUsualActivity` (commit [83e0bf4](https://github.com/chairemobilite/evolution/commit/83e0bf49d6b1d6f59c41a703dcc746195393527d))
- Added a `visitedPlaces` section configuration, which includes activity, location, shortcuts, on the road, next place category questions, as well as save/cancel/delete buttons with the  `VisitedPlacesSectionFactory` class (fixes [#1437](https://github.com/chairemobilite/evolution/issues/1437), [#1069](https://github.com/chairemobilite/evolution/issues/1069), [#1435](https://github.com/chairemobilite/evolution/issues/1435), [#1436](https://github.com/chairemobilite/evolution/issues/1436), [#1455](https://github.com/chairemobilite/evolution/issues/1455), [#1484](https://github.com/chairemobilite/evolution/issues/1484), [#1485](https://github.com/chairemobilite/evolution/issues/1485))
- Provide a `VisitedPlacesSection` template to be used in the UI to display visited places. The template can be used by the `visitedPlaces` name in the `template` property of a section's configuration (fixes [#1446](https://github.com/chairemobilite/evolution/issues/1446)).
- The `getFormattedDate` widget factory option now takes an optional options parameter to fine-tune the desired format of the date (commit [8dbd493](https://github.com/chairemobilite/evolution/commit/8dbd4938c1dd4f5466a8c19b3b90f934e63b953f))
- Add a `QuestionnaireConfiguration` type, that allows to configure an optional trip diary (which can include a visited places and segments sections). The `QuestionnaireFactory` class receives the configuration and returns the builtin widgets and sections from config. (commit [be226aa](https://github.com/chairemobilite/evolution/commit/be226aab8ad8f84b027a380dd90af70e2989e62d)).
- **Generator conditional hidden values**: In the `Conditionals` Excel sheet, you can now set an optional `value_when_hidden` so a value is applied when the conditional hides the question (fixes [#979](https://github.com/chairemobilite/evolution/issues/979)).
- **Generator section conditionals**: The `Sections` Excel sheet supports optional `enable_conditional` and `completion_conditional` columns. Set them to a conditional name from the `Conditionals` sheet (generated as `conditionals.<name>`) or to a custom conditional whose name ends with `CustomConditional` (generated as `customConditionals.<name>`). When omitted, the generator keeps the previous defaults (`true` or `isSectionCompleted` with the previous or current section as appropriate). (fixes [#997](https://github.com/chairemobilite/evolution/issues/997)).
- **Generator selective script generation**: The generator now accepts a `--only` command-line argument to generate only specified scripts (e.g., widgets, conditionals, labels) instead of everything (fixes [#1601](https://github.com/chairemobilite/evolution/issues/1601))
- **Experimental** Add a `selectFeature` input type that takes a geojson point feature collection and sorts them in a select widget by proximity to a reference geography in the survey (fixes [#1604](https://github.com/chairemobilite/evolution/issues/1604))

### Changed

- **BREAKING**: if using the webpack generation functions and the project has a `locales` folder, make sure an empty module file is present in the folder for build time import. An empty file named `index.js` at the root of the project's `locales` folder is enough. Webpack will replace it with the actual translations in the build. (fixes [#1426](https://github.com/chairemobilite/evolution/issues/1426))
- **BREAKING**: the `addGroupedObjects` function now returns an object of type `{ valuesByPath: Record<string, unknown>, newObjects: QuestionnaireObjectWithUuidAndSequence[] }` instead of only the values by path. Previous code can simply use the response's `valuesByPath` field to have the same data as before (commit [8f0efbf](https://github.com/chairemobilite/evolution/commit/8f0efbf03e736b050d873b4c676c38053749f489)).
- **BREAKING**: Add a second field for the `buttonActions` of the `WidgetFactoryOptions`: the previous `validateButtonAction` is now expected to simply validate without checking the section completion (to be used for grouped object for example), while the `validateButtonActionWithCompleteSection` will handle section completion as well and should be used at the end of sections (commit [52660e1](https://github.com/chairemobilite/evolution/commit/52660e16d4ff1faa217ea5b0648028c59bd8795d))
- **BREAKING**: Many builtin widgets now implement the `WidgetConfigFactory` and `SectionConfigFactory` instead of simple function calls (commit [f2ade4d](https://github.com/chairemobilite/evolution/commit/f2ade4d1e3e69b13e30e851d034b751e1955efc9)).
  - `getSwitchPersonWidgets` => `SwitchPersonWidgetsFactory`
  - `getPersonsTripsGroupConfig` => `PersonTripsGroupConfigFactory`
  - `getSegmentsGroupConfig` => `SegmentsGroupConfigFactory`
  - `getSegmentsSectionConfig` => `SegmentsSectionFactory`
- **BREAKING**: Rename the map widget's `updateDefaultValueWhenResponded` to `resetToDefaultUnlessUserInteracted` for clarity. The property applies to all map types, not just 'findPlace'. (commit [325d6ca](https://github.com/chairemobilite/evolution/commit/325d6cafe6b31e2964f95bed00999add0f1ddbae))
- **BREAKING**: The generator's `Labels` sheet in the Excel file should rename the "section" and "path" columns to "namespace" and "key", which better represents where we want the key to be (fixes [#1530](https://github.com/chairemobilite/evolution/issues/1530)).
- **BREAKING**: The generator now use the question name as translation label key instead of the path. Surveys using the generator will automatically update all label fields, but if additional label with context had been added in the "Labels" sheet to match the question's original label, these might need to be updated (fixes [#1530](https://github.com/chairemobilite/evolution/issues/1530)).
- **BREAKING**: Generator inactive widgets: `active` now behaves like a real boolean (Excel `0`/`1` included), defaults to inactive when omitted, and inactive rows stay commented-out in generated widget files instead of emitting broken code (fixes [#1597](https://github.com/chairemobilite/evolution/issues/1597)).
- **BREAKING**: The Google map widgets were migrated from the deprecated `@react-google-maps/api` package to `@vis.gl/react-google-maps`, which renders vector maps and uses `AdvancedMarker` (fixes [#453](https://github.com/chairemobilite/evolution/issues/453)). This requires a new `GOOGLE_MAP_ID` environment variable: each deployment must create a Map ID in the Google Cloud Console ("Map Management", associated with a vector map style) and set it in `.env` (`GOOGLE_MAP_ID`). Partners who provide us with a Google API key now also need to provide (or let us create) a Map ID tied to the same Google Cloud project; without it the maps will not render. See `.env.example` and the [Get a Map ID](https://developers.google.com/maps/documentation/get-map-id) docs.

### Deprecated

- `eightDigitsAccessCodeFormatter` is deprecated. Set the `accessCodeFormat` config option to `'0000-0000'` (the default) and use `accessCodeFormatter` instead (fixes [#1668](https://github.com/chairemobilite/evolution/issues/1668)).
- The evolution-frontend's `frontendHelper#getVisitedPlaceDescription` has been deprecated. Use the `getVisitedPlaceDescription` OD survey helper function from `evolution-common/lib/services/odSurvey/helpers` (commit [d203578](https://github.com/chairemobilite/evolution/commit/d20357804046c1691278b97a5fd9caa74a2d587a))
- The `InputMapPoint` widget (and the underlying `geocodeSinglePoint` helper) is deprecated in favor of `InputMapFindPlace`. `InputMapPoint` silently auto-selects the first geocoding result, which can mask wrong matches; `InputMapFindPlace` surfaces all candidates to the participant and auto-selects only when there is a single result. New surveys should use `InputMapFindPlace` for all map point inputs. (commit [59d66d7](https://github.com/chairemobilite/evolution/commit/59d66d7341c00541528e9b453d869f1c85809454))

### Removed

### Fixed

- `joinWith` now works for widgets inside a group: the next widget status is read from the group status path instead of the top-level `widgets`, so grouped widgets are joined as expected, and the dashed separator stays continuous across joined widgets (fixes [#1621](https://github.com/chairemobilite/evolution/issues/1621)).
- Allow to effectively override locales from Evolution by survey specifics with the same key. Fix is applied automatically on projects calling the `createParticipantWebpackConfig` and `createAdminWebpackConfig` webpack helpers. (fixes [#1426](https://github.com/chairemobilite/evolution/issues/1426))
- Yaml translation files generated by the generator now produce nested keys instead of '.' separated, to match Evolution's builtin format (fixes [#1529](https://github.com/chairemobilite/evolution/issues/1529))
- Fix the type of the `defaultValue` field of the `WidgetConfig#InputMapType` to be or return a geojson point feature as this is what the code really expects. (commit [a5b5534](https://github.com/chairemobilite/evolution/commit/a5b55342f79784ea3fa863bc4c462a1d6ab07cb5))
- Fix UI visibility tests for radio/checkbox widgets. (fixes [#1622](https://github.com/chairemobilite/evolution/issues/1622))

### Security

- Require admin access to verify new user accounts

### Dependency updates

- Replaced `@react-google-maps/api` with `@vis.gl/react-google-maps` (and its transitive `@types/google.maps`) for the Google map widgets (fixes [#453](https://github.com/chairemobilite/evolution/issues/453))
- style-loader: 4.0.0
- lodash: 4.17.21 => 4.18.1
- @types/lodash: 4.17.21 => 4.17.23
- yargs: 17.7.2 => 18.0.0
- i18next: 25.7.4 => 26.0.6
- i18next-browser-languagedetector: 8.2.0 => 8.2.1
- i18next-fs-backend: 2.6.1 => 2.6.4
- @turf/turf: 7.3.1 => 7.3.5
- @casl/ability: 6.7.3 => 6.8.1
- @playwright/test 1.56.1 => 1.61.1
- In the root `package.json` add a resolution of `kdbush` to 3.0.0 to avoid compilation errors with some packages depending on a more recent version. This requirement comes from Transition, who does the same (see https://github.com/chairemobilite/transition/issues/921 to track issue to upgrade/remove `kdbush`).
- Added dependency to `i18next-intervalplural-postprocessor` 3.0.0 to support i18next [interval pluralization](https://www.i18next.com/translation-function/plurals#interval-plurals)

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
