# Adding a new audit check — practical guide

> Audience: humans and AI agents adding audit checks to Evolution.
>
> **Start here**, then use the per-folder reference at
> [`./checks/README.md`](./checks/README.md)
> for the naming convention and the minimal check/test skeleton.
>
> This document answers: *where does my check fit in the pipeline, what are
> my choices, and what do I have to touch to ship it?*

---

## 1. What is an audit check?

In Evolution, an **audit check** is a post-submission validation run over a completed (or in-progress, during review) interview. Each failing check produces an `AuditForObject` record that is persisted in `sv_audits` and shown to reviewers in the admin app.

Checks do *not* run while the respondent fills the questionnaire — that is **real-time validation**, a separate system (see [`docs/nomenclature.md`](../../../../../../docs/nomenclature.md)). If your rule needs to prevent a respondent from moving forward, it is a real-time validation, not an audit.

**Rule of thumb**:


| You want to…                                                   | Build a…                             |
| -------------------------------------------------------------- | ------------------------------------ |
| Block the respondent until a field is valid                    | Real-time validation (widget config) |
| Flag an inconsistency a reviewer should look at after the fact | **Audit check** ← this guide         |
| Enrich the data for analysts (derived fields, coded values)    | Enhancer (out of scope here)         |


---

## 2. How a check gets run (one diagram)

```
 Reviewer opens interview                   Admin triggers batch audit
           │                                         │
           ▼                                         ▼
 GET /api/survey/correctInterview/:uuid   POST /api/validation/batchAudits
           │                                         │
           └──────────────┬──────────────────────────┘
                          ▼
        SurveyObjectsAndAuditsFactory
                          │
                          ▼
        AuditService.auditInterview(interview, runExtendedAuditChecks)
                          │
                          ▼
        SurveyObjectAuditor.auditSurveyObjects
                          │
     walks the object tree: interview → household → home
                          │            → each person → each journey
                          │                           → each visitedPlace
                          │                           → each trip → each segment
                          ▼
        For each level, calls run<Object>AuditChecks(context, checksMap)
                          │
                          ▼
        Your check function receives its context, returns
        an AuditForObject (fail) or undefined (pass)
                          │
                          ▼
        audits.db.queries.setAuditsForInterview
          — merges with existing rows (preserves `ignore` flag)
          — deletes old rows, inserts new set atomically
                          │
                          ▼
        Persisted in the `sv_audits` table
                          │
                          ▼
        Returned to the admin UI:
          - ValidationAuditFilter (counts by errorCode and level)
          - AuditDisplay / InterviewSummary (list shown to reviewer)
```

Key points that affect how you write a check:

- **Runners are `async`.** Your check may be sync or return a `Promise`. Async is fine for I/O (e.g. calling a geocoder), but keep it fast — this runs for every interview reviewed.
- **No per-check isolation today.** If your check throws, it crashes the whole audit pass for that interview. Guard anything that can throw (JSON parsing, external calls) inside the check.
- **The runner drops your result if the parent object has no `_uuid`.** You don't need to filter this yourself, but do not fabricate a uuid.
- **Every recalculation deletes and reinserts rows** for that interview, except that audits the reviewer has marked `ignore = true` for the same `version` are preserved through `mergeWithExisting`. Bump `version` if you change the semantics of an existing check so reviewers get a fresh look.

---

## 3. Before you write anything: decide

Answer these four questions first. They determine the file you will edit.

### 3.1 Which object is being audited?

Pick the **narrowest** scope that has the data you need. A check on "person has no journeys" goes on the *person*, not on the *interview*. That way the audit ends up attached to the right `objectUuid` and the reviewer UI highlights the right row.


| Object       | File                         | Context gives you                                       |
| ------------ | ---------------------------- | ------------------------------------------------------- |
| Interview    | `InterviewAuditChecks.ts`    | `interview`                                             |
| Household    | `HouseholdAuditChecks.ts`    | `household`, `home?`, `interview`                       |
| Home         | `HomeAuditChecks.ts`         | `home`, `household?`, `interview`                       |
| Person       | `PersonAuditChecks.ts`       | `person`, `household?`, `home?`, `interview`            |
| Journey      | `JourneyAuditChecks.ts`      | `journey`, `person`, `household?`, `home?`, `interview` |
| VisitedPlace | `VisitedPlaceAuditChecks.ts` | `visitedPlace`, `journey`, `person`, …, `interview`     |
| Trip         | `TripAuditChecks.ts`         | `trip`, `journey`, `person`, …, `interview`             |
| Segment      | `SegmentAuditChecks.ts`      | `segment`, `trip`, `journey`, …, `interview`            |


All contexts are defined in [`./AuditCheckContexts.ts`](./AuditCheckContexts.ts).

### 3.2 What kind of problem is it?

Follow the existing prefix convention (see the checks folder README):

- `_M_` — **Missing** required data (`HH_M_Size`).
- `_I_` — **Invalid** data (`HH_I_Size` — out of range, malformed, wrong type).
- `_L_` — **Logical** inconsistency between fields or objects (`HH_L_SizeMembersCountMismatch`).

Pick `_M_` only if the field should always be present. If "required" depends on survey configuration, use `fieldIsRequired(...)` (see §5.1) and still prefix with `_M_`.

### 3.3 Which severity?


| Level     | Meaning                                                                    | Reviewer behavior expected             |
| --------- | -------------------------------------------------------------------------- | -------------------------------------- |
| `error`   | The data is wrong or unusable and must be corrected or explicitly ignored. | Must look at it.                       |
| `warning` | Something suspicious that often turns out fine.                            | Should look at it when they have time. |
| `info`    | Informational only, typically for stats or routing.                        | Can ignore.                            |


When in doubt, start at `warning`. Escalating later is cheap; downgrading creates review backlog.

### 3.4 Standard or Extended?

Every object has two check maps, e.g. `homeAuditChecks` and `homeExtendedAuditChecks`. Extended checks only run when `runExtendedAuditChecks = true` is passed (see the "Refresh extended" action in `ValidationLinks.tsx`).

Put it in **extended** if:

- It is slow (e.g. calls an external API).
- It is only useful for deep data cleanup, not for the normal review flow.
- It would spam the reviewer with low-value warnings during everyday work.

Put it in **standard** otherwise. All current extended maps are empty (`{}`) — be thoughtful about being the first to populate one.

---

## 4. The 6-step checklist

Follow these in order. Every step is mandatory unless marked optional.

1. **Add the function** in the appropriate `<Object>AuditChecks.ts` (or `<Object>ExtendedAuditChecks.ts`) — e.g. `InterviewAuditChecks.ts`, `HouseholdAuditChecks.ts`, `PersonAuditChecks.ts`. Follow the naming and signature documented in [`./checks/README.md`](./checks/README.md).
2. **Add translations** for the `errorCode` in `locales/en/audits.json` and `locales/fr/audits.json`. The UI displays `t('audits:' + errorCode)`.
3. **Write a unit test** in `__tests__/<Object>/[ERROR_CODE].test.ts` with at least one passing case, one failing case, and the boundary (or missing field) case. Prefer `it.each` for enumerated cases.
4. **Run locally**:
  ```
   yarn workspace evolution-backend test -- auditChecks
   yarn lint && yarn format
  ```
5. **Add a CHANGELOG entry** under `Added` in the `Unreleased` section of `CHANGELOG.md`, listing the new `errorCode`.
6. **Open a small PR**. One check per commit when practical. If you add several related checks, split by object type.

Optional but encouraged:

- If the new check depends on a project-level config, document it in the survey project's `config.js` example and in `README.md`.
- If the check replaces or subsumes an existing one, document the migration plan (bump `version` or keep both for one cycle).

---

## 5. Helpers you should use

### 5.1 Required-field configuration

Do not hardcode "this field is required". Use the project config:

```ts
import { fieldIsRequired } from '../../AuditUtils';

// In a check:
if (fieldIsRequired('interview', 'accessCode') && !interview.accessCode) {
    return { /* ... I_M_AccessCode ... */ };
}
```

`fieldIsRequired(objectType, fieldName)` reads `projectConfig.requiredFieldsBySurveyObject`. Each survey project sets this in its config — your check becomes configurable without touching survey code. See existing usage in `./checks/InterviewAuditChecks.ts` and the type in [`../../../../../evolution-common/src/services/audits/types.ts`](../../../../../evolution-common/src/services/audits/types.ts).

### 5.2 Survey area / territorial check

```ts
import { getSurveyArea } from '../../AuditCheckUtils';
import * as turf from '@turf/turf';

const surveyArea = getSurveyArea(); // cached, reads projectConfig.surveyAreaGeojsonPath
if (surveyArea && !turf.booleanPointInPolygon(point, surveyArea)) {
    return { /* ... HM_I_geographyNotInSurveyTerritory ... */ };
}
```

If no survey area is configured, `getSurveyArea()` returns `undefined`. Your check must no-op in that case (do not fail the audit because the survey did not configure territorial validation).

See the live example at `HomeAuditChecks.ts` → `HM_I_geographyNotInSurveyTerritory`.

### 5.3 Survey dates

For date/time checks, look at how `I_I_StartedAtBeforeSurveyStartDate` and `I_I_StartedAtAfterSurveyEndDate` handle configuration in `./checks/InterviewAuditChecks.ts`, and the guidance in [`docs/SURVEY_END_DATE.md`](../../../../../../docs/SURVEY_END_DATE.md).

### 5.4 Geometry validation

For geography fields, `geojson-validation` (already imported in `HomeAuditChecks.ts`) provides `isFeature`, `isPoint`, etc. For distance comparisons, use `@turf/turf` — it is already a dependency.

---

## 6. Worked example — add `P_I_AgeOutOfRange`

Scenario: reject `person.age` values outside `0..120`. Age is already checked for *missing* via `P_M_Age`; we add the *invalid range* version.

### 6.1 The check function

`packages/evolution-backend/src/services/audits/auditChecks/checks/PersonAuditChecks.ts`:

```ts
P_I_AgeOutOfRange: (context: PersonAuditCheckContext): AuditForObject | undefined => {
    const { person } = context;
    if (person.age === undefined) {
        return undefined; // missing age is handled by P_M_Age
    }
    if (person.age < 0 || person.age > 120) {
        return {
            objectType: 'person',
            objectUuid: person._uuid!,
            errorCode: 'P_I_AgeOutOfRange',
            version: 1,
            level: 'error',
            message: 'Person age is out of valid range (0–120)',
            ignore: false
        };
    }
    return undefined;
},
```

### 6.2 The translations

`locales/en/audits.json`:

```json
"P_I_AgeOutOfRange": "Person age is out of valid range (0–120)."
```

`locales/fr/audits.json`:

```json
"P_I_AgeOutOfRange": "L'âge de la personne est hors de la plage valide (0–120)."
```

### 6.3 The test

`packages/evolution-backend/src/services/audits/auditChecks/checks/__tests__/person/P_I_AgeOutOfRange.test.ts`:

```ts
import { personAuditChecks } from '../../PersonAuditChecks';
import { createPersonContext } from '../person/testHelper'; // reuse existing helper

describe('P_I_AgeOutOfRange', () => {
    it.each([
        ['undefined (handled by P_M_Age)', undefined, undefined],
        ['zero', 0, undefined],
        ['typical adult', 42, undefined],
        ['upper bound', 120, undefined],
        ['negative', -1, 'P_I_AgeOutOfRange'],
        ['above upper bound', 121, 'P_I_AgeOutOfRange']
    ])('returns %s → %s', (_label, age, expectedErrorCode) => {
        const context = createPersonContext({ age });
        const result = personAuditChecks.P_I_AgeOutOfRange(context);
        if (expectedErrorCode === undefined) {
            expect(result).toBeUndefined();
        } else {
            expect(result).toMatchObject({
                objectType: 'person',
                errorCode: expectedErrorCode,
                level: 'error'
            });
        }
    });
});
```

Parametric tests are preferred here — all cases share a table. If a case needs more setup, drop it out of `it.each` into its own `it(...)`.

### 6.4 CHANGELOG

```md
### Added
- Audit check `P_I_AgeOutOfRange`: flags persons with age outside 0–120.
```

That's it. Run `yarn workspace evolution-backend test` and open the PR.

---

## 7. Inventory of current checks (read before adding)

Grep before adding to avoid duplicates. Current standard checks, grouped by object:

- **Interview** (`InterviewAuditChecks.ts`): `I_M_Languages`, `I_M_StartedAt`, `I_I_StartedAtBeforeSurveyStartDate`, `I_I_StartedAtAfterSurveyEndDate`, `I_M_AccessCode`, `I_I_InvalidAccessCodeFormat`, `I_I_ContactEmail`, `I_I_HelpContactEmail`.
- **Household**: `HH_M_Size`, `HH_I_Size`, `HH_M_Home`, `HH_L_SizeMembersCountMismatch`, `HH_M_CarNumber`, `HH_I_CarNumber`, `HH_L_CarNumberVehiclesCountMismatch`.
- **Home**: `HM_M_Geography`, `HM_I_Geography`, `HM_I_preGeographyAndHomeGeographyTooFarApartError`, `HM_I_preGeographyAndHomeGeographyTooFarApartWarning`, `HM_I_geographyNotInSurveyTerritory`.
- **Person**: `P_M_Age`.
- **Journey**: `J_M_StartDate`.
- **VisitedPlace**: `VP_M_Geography`, `VP_I_Geography`.
- **Trip**: `T_M_Segments`.
- **Segment**: `S_M_Mode`.

Extended maps are all currently empty.

This inventory ages fast — regenerate it from the source files if in doubt:

```
rg -n "^\s+[IHMPJVTS]{1,2}_[MIL]_[A-Za-z]+:" \
  packages/evolution-backend/src/services/audits/auditChecks/checks
```

---

## 8. Storage & API (what you do *not* have to write)

You do not touch the database, the routes, or the UI. They are generic:

- **Storage**: table `sv_audits`, created by
`packages/evolution-backend/src/models/migrations/20231019213400_createAuditTbl.ts`, updated by
`20240205101500_addLevelToAuditTbl.ts`. Primary key is `(interview_id, error_code, object_type, object_uuid)`.
Writes go through `audits.db.queries.setAuditsForInterview`.
- **API**: your check's result is delivered automatically through
`GET /api/survey/correctInterview/:uuid` (single) and `POST /api/validation/batchAudits` (bulk). Stats aggregate through `POST /api/validation/auditStats`.
- **UI**: `ValidationAuditFilter` shows the new `errorCode` in the filter list (count aggregation), and `AuditDisplay` / `InterviewSummary` show the per-interview rows. Both use `t('audits:' + errorCode)`, which is why translations are mandatory.

If anything in the generic pipeline needs to change for your check, you have probably picked the wrong abstraction — step back and discuss.

---

## 9. Common pitfalls

- **Returning `null` instead of `undefined`.** The runner only drops `undefined`. A `null` result is truthy-enough for some downstream code and has caused bugs elsewhere in the codebase. Always `return undefined;` for the pass case.
- **Forgetting `objectUuid` / `objectType`.** The Home example in `checks/README.md` shows the partial-return pattern for *some* cases. Current best practice: return the full `AuditForObject` shape including `objectType` and `objectUuid` so the row is well-formed regardless of whether callers normalize it.
- **Throwing for invalid input.** A single thrown error crashes the whole audit pass for that interview. Wrap parsing / external calls in try/catch and return an `AuditForObject` with the appropriate error code instead.
- **Hardcoding "required".** Use `fieldIsRequired(...)`. Hardcoding breaks every survey that does not collect that field.
- **Using the legacy `auditInterview` in `evolution-common`.** There is an older function by that name in `packages/evolution-common/src/services/interviews/interview.ts` with a `FIXME: move this to backend`. It is a parallel, legacy path. New checks go through `AuditService`, not there.
- **Skipping translations.** The admin UI will literally show the raw `errorCode` string if the translation is missing. Reviewers hate that.
- **Forgetting to bump `version`.** If you change what an existing check flags, bump its `version`. Otherwise reviewers' `ignore` flags carry over silently and hide new problems.
- **Putting slow checks in the standard map.** Anything > ~50 ms per interview should be Extended.

---

## 10. If you need to go beyond

These are out of scope for this guide but will come up eventually:

- **A new top-level object type** (e.g. auditing `Vehicle` directly). Requires: a new context type in `AuditCheckContexts.ts`, a new runner in `AuditCheckRunners.ts`, traversal wiring in `SurveyObjectAuditor.ts`, and a new prefix in the checks folder README. Coordinate with the team before starting.
- **Cross-interview audits** (e.g. "same access code used twice"). Today each check only sees its own interview tree. This would need a new orchestrator and a different storage shape.
- **Auto-applying a correction when an audit triggers.** That is the job of Enhancers (`SystemEnhancer` in the nomenclature), not audit checks.

For any of these, open a design issue before writing code.

---

## 11. Related files and references

- Tactical reference for the check/test skeleton: [`./checks/README.md`](./checks/README.md)
- Types: [`../../../../../evolution-common/src/services/audits/types.ts`](../../../../../evolution-common/src/services/audits/types.ts)
- Contexts: [`./AuditCheckContexts.ts`](./AuditCheckContexts.ts)
- Runners: [`./AuditCheckRunners.ts`](./AuditCheckRunners.ts)
- Orchestration: [`../AuditService.ts`](../AuditService.ts), [`../SurveyObjectAuditor.ts`](../SurveyObjectAuditor.ts)
- Helpers: [`../AuditUtils.ts`](../AuditUtils.ts), [`./AuditCheckUtils.ts`](./AuditCheckUtils.ts)
- Storage: [`../../../models/audits.db.queries.ts`](../../../models/audits.db.queries.ts)
- Nomenclature: [`docs/nomenclature.md`](../../../../../../docs/nomenclature.md)
- Survey end date: [`docs/SURVEY_END_DATE.md`](../../../../../../docs/SURVEY_END_DATE.md)
