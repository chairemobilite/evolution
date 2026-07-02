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

- `GET /survey/correctInterview/:interviewUuid` — interview payload includes `surveyObjectsAndAudits` (survey objects and audits only, no review decisions)
- `GET /review/decisions/:interviewId` — fetch review decisions for an interview, separately from the interview and its audits; returns `reviewDecisions` (review decision lists and aggregated status by object)
- `POST /review/decision/:interviewId` — submit an approve/reject review decision with optional `comment`
- `POST /review/clearDecision/:interviewId` — remove the current user's review decision on the object
- `POST /review/reReview/:interviewId` — ask **every other reviewer** who already submitted a review decision on the object to look again (`comment` explains what to verify). The requester is never asked; reviewers without a prior review decision are skipped.
- `POST /review/forceApprove/:interviewId` and `POST /review/clearForceApprove/:interviewId` — admin override, see below

All mutation routes return only the updated `reviewDecisions` (same shape as the GET); audits are never recomputed by review mutations. They all require the interview's `corrected_response` to be populated (the interview must have been opened for correction) and the object to exist in it; otherwise a `409` (blank `corrected_response`) or `404` (object not found) is returned.

The admin frontend keeps review decisions in a Redux slice (`state.survey.reviewDecisions`) separate from the interview and its audits (see `startFetchInterviewReviewDecisions` in `evolution-frontend/src/actions/SurveyAdmin.ts`), so audits can be refreshed without re-fetching reviews and vice-versa.

Submitting a new approve/reject review decision clears the pending re-review flag for that reviewer.

## Admin force-approve

When reviewers disagree on an object (`hasConflict`), a user with the `confirm` permission can **force-approve** it. The action upserts the admin's own `sv_review_decisions` row with `force_approved = true`. If the admin already reviewed the object, their existing `decision_value` and review decision `comment` are preserved (e.g. reject + force approve). If the admin has not reviewed yet, a row is created with `decision_value = approve` and `force_approved = true`.

- Requires `hasConflict` on the object; returns 409 when reviewers no longer disagree
- `effectiveStatus` becomes `forceApproved` when any review decision row has `force_approved`
- `POST /review/forceApprove/:interviewId` — body: `objectType`, `objectUuid`, optional `comment` (stored as `force_approve_comment`); requires `confirm` permission
- `POST /review/clearForceApprove/:interviewId` — removes the `force_approved` flag and its comment from the current user's row; requires `confirm` permission

## Related modules

- Types and aggregation: `evolution-common/src/services/reviews/`
- Database queries: `evolution-backend/src/models/reviewDecisions.db.queries.ts`
- API routes: `evolution-backend/src/api/survey.validation.routes.ts`

## Survey configuration

`reviewableSurveyObjects` in the survey `config.js` lists object types for which approve/reject controls appear on the review summary page.
