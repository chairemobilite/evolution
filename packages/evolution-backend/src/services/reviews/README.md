# Review decisions

**Review** is the post-submission process of examining an interview in the admin app. A **review decision** is one reviewer's approve/reject on a specific survey object during that process.

Each review decision is persisted in the `sv_reviews` database table and surfaced to reviewers in the admin app. Review decisions do *not* block the respondent while they fill the questionnaire.

Each row records:

- which **interview** is under review
- which **user** (reviewer) made the review decision
- which **survey object** (`object_type` + `object_uuid`)
- the **decision value**: `approve` or `reject`
- an optional **comment** on the review decision
- an optional **re-review request** (`re_review_requested`) so a reviewer can be asked to look again after corrections, with `re_review_request_comment`

This replaces the legacy `_isValid` flag on survey objects (`IValidatable`), which mixed structural validation with reviewer workflow.

## API

- `POST /validation/reviewDecision/:interviewUuid` — submit an approve/reject review decision with optional `comment`
- `POST /validation/requestReReview/:interviewUuid` — ask **every other reviewer** who already submitted a review decision on the object to look again (`comment` explains what to verify). The requester is never asked; reviewers without a prior review decision are skipped.

Submitting a new approve/reject review decision clears the pending re-review flag for that reviewer.

## Related modules

- Types and aggregation: `evolution-common/src/services/reviewDecisions/`
- Interface for survey objects: `evolution-common/src/services/baseObjects/IReviewable.ts`
- Database queries: `evolution-backend/src/models/reviewDecisions.db.queries.ts`
- API routes: `evolution-backend/src/api/survey.validation.routes.ts`

## Survey configuration

`reviewableSurveyObjects` in the survey `config.js` lists object types for which approve/reject controls appear on the review summary page.
