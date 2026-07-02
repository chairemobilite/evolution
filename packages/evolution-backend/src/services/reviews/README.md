# Review decisions

**Review** is the post-submission process of examining an interview in the admin app. A **review decision** is one reviewer's approve/reject on a specific survey object during that process.

Each review decision is persisted in the `sv_review_decisions` database table and surfaced to reviewers in the admin app.

Each row records:

- which **interview** is under review
- which **user** (reviewer) made the review decision
- which **survey object** (`object_type` + `object_uuid`)
- the **decision value**: `approve` or `reject`
- an optional **comment** on the review decision
- an optional **re-review request** (`re_review_requested`) so a reviewer can be asked to look again after corrections, with `re_review_request_comment`

## Persistence model

One row per `(interview, object, user)` — **upsert only**, no history for the same reviewer on the same object. If a reviewer changes their mind (reject → approve, or vice versa), the existing row is updated. Different reviewers still get separate rows, so approve/reject disagreements remain visible.

Optional columns on the same row:

- `force_approved` — admin override on this reviewer's row (kept alongside `decision_value`)
- `force_approve_comment` — comment for the force-approve action (separate from the review decision `comment`)

## API endpoints

- `GET /survey/correctInterview/:uuid` — interview payload includes `surveyObjectsAndAuditsAndReviewDecisions` (survey objects, audits, and review decisions)
- `POST /validation/reviewDecision/:interviewUuid` — submit an approve/reject review decision with optional `comment`; returns updated `surveyObjectsAndAuditsAndReviewDecisions`
- `POST /validation/requestReReview/:interviewUuid` — ask **every other reviewer** who already submitted a review decision on the object to look again (`comment` explains what to verify). The requester is never asked; reviewers without a prior review decision are skipped.

Submitting a new approve/reject review decision clears the pending re-review flag for that reviewer.

## Admin force-approve

When reviewers disagree on an object (`hasConflict`), a user with the `confirm` permission can **force-approve** it. The action upserts the admin's own `sv_review_decisions` row with `force_approved = true`. If the admin already reviewed the object, their existing `decision_value` and review decision `comment` are preserved (e.g. reject + force approve). If the admin has not reviewed yet, a row is created with `decision_value = approve` and `force_approved = true`.

- Requires `hasConflict` on the object; returns 409 when reviewers no longer disagree
- `effectiveStatus` becomes `forceApproved` when any review decision row has `force_approved`
- `POST /validation/forceApprove/:interviewUuid` — body: `objectType`, `objectUuid`, optional `comment` (stored as `force_approve_comment`); requires `confirm` permission

## Related modules

- Types and aggregation: `evolution-common/src/services/reviews/`
- Database queries: `evolution-backend/src/models/reviewDecisions.db.queries.ts`
- API routes: `evolution-backend/src/api/survey.validation.routes.ts`

## Survey configuration

`reviewableSurveyObjects` in the survey `config.js` lists object types for which approve/reject controls appear on the review summary page.
