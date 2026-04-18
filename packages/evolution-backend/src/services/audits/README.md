# Audits

An **audit** is a post-submission validation run over an interview. Each failing or matching audit check produces an `AuditForObject` record persisted in `sv_audits` database table and surfaced to reviewers in the admin app. Audits do *not* block the respondent while they fill the questionnaire — that is [real-time validation](../../../../../docs/nomenclature.md), a separate system.

Each check declares a `level` (defaults to `error` if omitted):

- **`error`** — must be reviewed; may lead to correction or rejection of the interview.
- **`warning`** — worth a look; can be corrected, ignored, or (occasionally) cause rejection.
- **`info`** — informational tag only; classifies an interview without requiring action (e.g. *has at least one transit trip*).

## Adding a new audit check

See the practical guide in [`auditChecks/README.md`](auditChecks/README.md) — where a check fits in the pipeline, what choices you have, and what to touch to ship one.
