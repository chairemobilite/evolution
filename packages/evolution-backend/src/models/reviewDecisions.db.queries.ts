/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import TrError from 'chaire-lib-common/lib/utils/TrError';
import {
    ReviewDecision,
    ReviewDecisionValue,
    ReviewerVote,
    type InterviewReviewStatusFilter,
    type ReviewDecisionEffectiveStatus
} from 'evolution-common/lib/services/reviews/types';
import {
    computeReviewDecisionStatusForObject,
    hasDecisionBlockingInterviewApproval
} from '../services/reviews/ReviewDecisionUtils';
import {
    blocksApproval,
    getReviewDecisionEffectiveStatus
} from 'evolution-common/lib/services/reviews/reviewDecisionStatus';
import {
    CANNOT_APPROVE_INTERVIEW_WITH_BLOCKING_OBJECT_ERROR_CODE,
    CANNOT_FORCE_APPROVE_NOTHING_TO_OVERRIDE_ERROR_CODE
} from '../services/reviews/reviewDecisionErrors';
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import { Knex } from 'knex';

const tableName = 'sv_review_decisions';

type DbObject = {
    interview_id: number;
    user_id: number;
    object_type: string;
    object_uuid: string;
    /** Null on a row that only carries a force approve, an admin override being no reviewer vote. */
    decision_value: ReviewDecisionValue | null;
    comment: string | null;
    force_approved: boolean;
    force_approve_comment: string | null;
    re_review_requested: boolean;
    re_review_requested_by_user_id: number | null;
    re_review_requested_at: Date | null;
    re_review_request_comment: string | null;
    updated_at?: Date;
};

/** Maps nullable DB strings to optional domain fields. */
const nullToUndefined = <T>(value: T | null | undefined): T | undefined => (value === null ? undefined : value);

/** Maps optional domain strings to nullable DB columns. */
const optionalStringToDb = (value: string | null | undefined): string | null => value ?? null;

const dbObjectToReviewDecision = (dbObject: DbObject): ReviewDecision => ({
    objectType: dbObject.object_type as SurveyObjectName,
    objectUuid: dbObject.object_uuid,
    userId: dbObject.user_id,
    decision: nullToUndefined(dbObject.decision_value),
    comment: nullToUndefined(dbObject.comment),
    forceApproved: dbObject.force_approved,
    forceApproveComment: nullToUndefined(dbObject.force_approve_comment),
    reReviewRequested: dbObject.re_review_requested,
    reReviewRequestedByUserId: nullToUndefined(dbObject.re_review_requested_by_user_id),
    reReviewRequestedAt: dbObject.re_review_requested_at?.toISOString(),
    reReviewRequestComment: nullToUndefined(dbObject.re_review_request_comment),
    updatedAt: dbObject.updated_at?.toISOString()
});

const reviewDecisionToDbObject = (interviewId: number, userId: number, reviewDecision: ReviewerVote): DbObject => ({
    interview_id: interviewId,
    user_id: userId,
    object_type: reviewDecision.objectType,
    object_uuid: reviewDecision.objectUuid,
    decision_value: reviewDecision.decision,
    comment: optionalStringToDb(reviewDecision.comment),
    force_approved: false,
    force_approve_comment: null,
    re_review_requested: false,
    re_review_requested_by_user_id: null,
    re_review_requested_at: null,
    re_review_request_comment: null
});

const getReviewDecisionsForInterview = async (
    interviewId: number,
    transaction?: Knex.Transaction,
    forUpdate = false
): Promise<ReviewDecision[]> => {
    try {
        // Newest first: aggregation helpers rely on this order (e.g. most recent force-approve wins)
        const query = (transaction ?? knex)(tableName).where('interview_id', interviewId).orderBy('updated_at', 'desc');
        if (forUpdate) {
            query.forUpdate();
        }
        const reviews = await query;
        return reviews.map(dbObjectToReviewDecision);
    } catch (error) {
        throw new TrError(
            `Error getting reviews for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0001',
            'CannotGetReviewsForInterviewBecauseDatabaseError'
        );
    }
};

const deleteReviewDecisionsForInterview = async (
    interviewId: number,
    transaction?: Knex.Transaction
): Promise<boolean> => {
    try {
        await (transaction ?? knex)(tableName).where('interview_id', interviewId).del();
        return true;
    } catch (error) {
        throw new TrError(
            `Error deleting reviews for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0002',
            'CannotDeleteReviewsForInterviewBecauseDatabaseError'
        );
    }
};

/**
 * Removes a reviewer's approve/reject row when it is not a force-approve row.
 * Rows with `force_approved` are left intact so an admin force-approve survives.
 * TODO: keep a soft-deleted audit history instead of hard-deleting rows.
 * See https://github.com/chairemobilite/evolution/issues/1714
 * @param interviewId - Interview database id
 * @param userId - Reviewer user id
 * @param reviewDecision - Object type and uuid
 * @param transaction - Optional knex transaction for atomic writes
 */
const clearReviewDecision = async (
    interviewId: number,
    userId: number,
    reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid'>,
    transaction?: Knex.Transaction
): Promise<void> => {
    try {
        await (transaction ?? knex)(tableName)
            .where({
                interview_id: interviewId,
                user_id: userId,
                object_type: reviewDecision.objectType,
                object_uuid: reviewDecision.objectUuid,
                force_approved: false
            })
            .del();
    } catch (error) {
        throw new TrError(
            `Error clearing review for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0010',
            'CannotClearReviewBecauseDatabaseError'
        );
    }
};

/**
 * Clears force-approve on the admin's review row without removing their approve/reject decision.
 * The row itself goes when the admin never voted on the object, as the override was all it held.
 * @param interviewId - Interview database id
 * @param userId - Admin user id who force-approved
 * @param reviewDecision - Object type and uuid
 * @param transaction - Optional knex transaction for atomic writes
 */
const clearForceApprove = async (
    interviewId: number,
    userId: number,
    reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid'>,
    transaction?: Knex.Transaction
): Promise<void> => {
    try {
        const forceApprovedRow = (queryKnex: Knex | Knex.Transaction) =>
            queryKnex(tableName).where({
                interview_id: interviewId,
                user_id: userId,
                object_type: reviewDecision.objectType,
                object_uuid: reviewDecision.objectUuid,
                force_approved: true
            });
        const clearOrDeleteRow = async (queryKnex: Knex | Knex.Transaction): Promise<void> => {
            // A row without a decision value holds nothing but the override, so clearing the
            // override leaves nothing to keep. A row also carrying a vote keeps that vote: the
            // admin who approved before overriding still approves once the override is gone.
            await forceApprovedRow(queryKnex).whereNull('decision_value').del();
            await forceApprovedRow(queryKnex).whereNotNull('decision_value').update({
                force_approved: false,
                force_approve_comment: null
            });
        };
        await (transaction ? clearOrDeleteRow(transaction) : knex.transaction(clearOrDeleteRow));
    } catch (error) {
        throw new TrError(
            `Error clearing force approve for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0011',
            'CannotClearForceApproveBecauseDatabaseError'
        );
    }
};

/**
 * Upserts a reviewer decision for one survey object in an interview.
 * Clears any pending re-review request and any prior force-approve override for that reviewer.
 * Approving the interview means accepting everything it contains, so it is refused while one
 * of its objects is rejected or disagreed upon; a force approve is then the only way through.
 * That check and the upsert run in the same transaction, locking the decision rows it reads, so
 * a concurrent update of one of them waits for it. A reviewer inserting a brand new rejection
 * meanwhile is not held back, no lock covering rows that do not exist yet, so the interview may
 * end up approved over it. Serializing every review of an interview would cost more than the
 * rare stale approval, which a reviewer clears. See
 * https://github.com/chairemobilite/evolution/issues/1886
 * @param interviewId - Interview database id
 * @param userId - Reviewer user id
 * @param reviewDecision - Object type, uuid, decision and optional decision comment
 * @param transaction - Optional knex transaction for atomic writes
 * @returns The persisted review decision row
 */
const setReviewDecision = async (
    interviewId: number,
    userId: number,
    reviewDecision: ReviewerVote,
    transaction?: Knex.Transaction
): Promise<ReviewDecision> => {
    // Approving the interview accepts everything it contains, so that decision alone is checked
    // against the decisions taken on the objects below. Any other decision stands on its own and
    // is written without reading them.
    const guardsInterviewApproval = reviewDecision.objectType === 'interview' && reviewDecision.decision === 'approve';

    const runQuery = async (queryKnex: Knex | Knex.Transaction): Promise<ReviewDecision> => {
        if (guardsInterviewApproval) {
            // Read under lock inside the transaction of the upsert, so that a decision read here
            // cannot change while the approval is being written.
            const reviewDecisions = await getReviewDecisionsForInterview(
                interviewId,
                queryKnex as Knex.Transaction,
                true
            );
            if (hasDecisionBlockingInterviewApproval(reviewDecisions)) {
                throw new TrError(
                    `Cannot approve interview ${interviewId}, it contains a rejected or disagreed object`,
                    CANNOT_APPROVE_INTERVIEW_WITH_BLOCKING_OBJECT_ERROR_CODE,
                    'CannotApproveInterviewWithBlockingObject'
                );
            }
        }
        const dbObject = reviewDecisionToDbObject(interviewId, userId, reviewDecision);
        const rows = await queryKnex(tableName)
            .insert(dbObject)
            .onConflict(['interview_id', 'object_type', 'object_uuid', 'user_id'])
            .merge({
                decision_value: dbObject.decision_value,
                comment: dbObject.comment,
                force_approved: false,
                force_approve_comment: null,
                re_review_requested: false,
                re_review_requested_by_user_id: null,
                re_review_requested_at: null,
                re_review_request_comment: null
            })
            .returning('*');

        return dbObjectToReviewDecision(rows[0]);
    };

    try {
        if (transaction) {
            return await runQuery(transaction);
        }
        // Only the guarded case needs a transaction of its own; a plain upsert is atomic already.
        return guardsInterviewApproval ? await knex.transaction(runQuery) : await runQuery(knex);
    } catch (error) {
        if (error instanceof TrError) {
            throw error;
        }
        throw new TrError(
            `Error setting review for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0003',
            'CannotSetReviewBecauseDatabaseError'
        );
    }
};

/**
 * Ask every other reviewer who already decided on an object to look at it again.
 * Target reviewers are selected atomically at write time (no prior snapshot).
 * @param interviewId - Interview database id
 * @param requestedByUserId - User requesting the re-review (excluded from targets)
 * @param reviewDecision - Object type, uuid and optional re-review comment
 * @param transaction - Optional knex transaction for atomic writes
 */
const requestReReviewFromOtherReviewers = async (
    interviewId: number,
    requestedByUserId: number,
    reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'reReviewRequestComment'>,
    transaction?: Knex.Transaction
): Promise<void> => {
    try {
        const queryKnex = transaction ?? knex;
        await queryKnex(tableName)
            .where({
                interview_id: interviewId,
                object_type: reviewDecision.objectType,
                object_uuid: reviewDecision.objectUuid
            })
            .whereNot('user_id', requestedByUserId)
            .update({
                re_review_requested: true,
                re_review_requested_by_user_id: requestedByUserId,
                re_review_requested_at: queryKnex.fn.now(),
                re_review_request_comment: optionalStringToDb(reviewDecision.reReviewRequestComment)
            });
    } catch (error) {
        throw new TrError(
            `Error requesting re-review for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0004',
            'CannotRequestReReviewBecauseDatabaseError'
        );
    }
};

/**
 * Force-approves only when a decision still stands in the way of approving the object:
 * a rejection or a reviewer disagreement, on the object itself or, for the interview, on
 * any object it contains. Without one there is nothing to override, so the request is
 * rejected to avoid silently masking future conflicting reviews. The check and the upsert
 * run in the same transaction (with row locks) so a concurrent review cannot invalidate
 * the check between read and write.
 * @param interviewId - Interview database id
 * @param userId - Admin user id
 * @param reviewDecision - Object type, uuid and optional force-approve comment
 * @param transaction - Optional knex transaction for atomic writes
 * @returns The persisted review decision row
 */
const setForceApproveWhenApprovalBlocked = async (
    interviewId: number,
    userId: number,
    reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'forceApproveComment'>,
    transaction?: Knex.Transaction
): Promise<ReviewDecision> => {
    const runInTransaction = async (trx: Knex.Transaction): Promise<ReviewDecision> => {
        // Every row of the interview is locked and read: force-approving the interview also
        // overrides the decisions taken on the objects it contains.
        const reviewDecisions = await getReviewDecisionsForInterview(interviewId, trx, true);
        const status = computeReviewDecisionStatusForObject(
            reviewDecisions,
            reviewDecision.objectType,
            reviewDecision.objectUuid,
            userId
        );
        const overridesContainedObject =
            reviewDecision.objectType === 'interview' && hasDecisionBlockingInterviewApproval(reviewDecisions);
        if (!blocksApproval(status.effectiveStatus) && !overridesContainedObject) {
            throw new TrError(
                `Cannot force-approve ${reviewDecision.objectType}/${reviewDecision.objectUuid}, no decision to override`,
                CANNOT_FORCE_APPROVE_NOTHING_TO_OVERRIDE_ERROR_CODE,
                'CannotForceApproveNothingToOverride'
            );
        }

        // Upsert force-approve on the admin's own row. Inserted rows carry no reviewer vote;
        // conflicts merge only the force-approve fields so an existing decision is kept.
        const dbObject: DbObject = {
            interview_id: interviewId,
            user_id: userId,
            object_type: reviewDecision.objectType,
            object_uuid: reviewDecision.objectUuid,
            decision_value: null,
            comment: null,
            force_approved: true,
            force_approve_comment: optionalStringToDb(reviewDecision.forceApproveComment),
            re_review_requested: false,
            re_review_requested_by_user_id: null,
            re_review_requested_at: null,
            re_review_request_comment: null
        };
        const mergeFields: Pick<
            DbObject,
            | 'force_approved'
            | 're_review_requested'
            | 're_review_requested_by_user_id'
            | 're_review_requested_at'
            | 're_review_request_comment'
        > &
            Partial<Pick<DbObject, 'force_approve_comment'>> = {
                force_approved: true,
                re_review_requested: false, // If force-approving, clear any pending re-review request
                re_review_requested_by_user_id: null,
                re_review_requested_at: null,
                re_review_request_comment: null
            };
        if (reviewDecision.forceApproveComment !== undefined) {
            mergeFields.force_approve_comment = optionalStringToDb(reviewDecision.forceApproveComment);
        }

        const rows = await trx(tableName)
            .insert(dbObject)
            .onConflict(['interview_id', 'object_type', 'object_uuid', 'user_id'])
            .merge(mergeFields)
            .returning('*');

        return dbObjectToReviewDecision(rows[0]);
    };

    try {
        if (transaction) {
            return await runInTransaction(transaction);
        }
        return await knex.transaction(runInTransaction);
    } catch (error) {
        if (error instanceof TrError) {
            throw error;
        }
        throw new TrError(
            `Error setting force approve for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0008',
            'CannotSetForceApproveBecauseDatabaseError'
        );
    }
};

/**
 * The queries below aggregate the decisions of many interviews at once, resolving their
 * interview-level review status. They are composed by the queries of the other tables needing
 * that status: the admin interview list, the paradata stream and the exports.
 */

/**
 * Reviewer vote counts for the interview-level review decisions, as aggregated
 * by the database. Mirrors the counts that
 * `computeReviewDecisionStatusForObject` derives in memory for a single object,
 * so both paths resolve the same effective status.
 */
export type InterviewReviewDecisionCounts = {
    approvalCount: number;
    rejectionCount: number;
    isForceApproved: boolean;
};

/**
 * Aggregates the interview-level review decisions, one row per reviewed
 * interview. Force-approve rows are excluded from the vote counts, since a
 * force approve overrides the reviewers instead of counting as a vote.
 *
 * The aggregates stay raw: knex has no builder for the `filter` clause of an aggregate, and
 * counting with a `case` expression would be raw as well.
 * @param transaction - Optional knex transaction, to read within the caller's context
 * @returns Knex query builder selecting `interview_id` and the vote counts
 */
export const interviewReviewDecisionCountsQuery = (transaction?: Knex.Transaction) =>
    (transaction ?? knex)(tableName)
        .select('interview_id')
        .select(
            knex.raw('count(*) filter (where decision_value = \'approve\' and force_approved is false) approval_count'),
            knex.raw('count(*) filter (where decision_value = \'reject\' and force_approved is false) rejection_count'),
            knex.raw('bool_or(force_approved) is_force_approved')
        )
        .where('object_type', 'interview')
        .groupBy('interview_id');

// Postgres returns the bigint counts as strings.
const toCount = (count: unknown): number =>
    typeof count === 'string' ? parseInt(count) : typeof count === 'number' ? count : 0;

/**
 * Resolves the interview-level review status from the counts selected with
 * {@link interviewReviewDecisionCountsQuery}. Interviews nobody reviewed have no
 * aggregated row at all, so their counts come back absent and resolve to
 * `notReviewed`.
 * @param row - Query row joined with the aggregated review decision counts
 * @returns Effective interview-level review status
 */
export const getInterviewReviewStatusFromRow = (row: {
    approval_count?: unknown;
    rejection_count?: unknown;
    is_force_approved?: unknown;
}): ReviewDecisionEffectiveStatus =>
    getReviewDecisionEffectiveStatus(
        toCount(row.approval_count),
        toCount(row.rejection_count),
        row.is_force_approved === true
    );

/**
 * Predicates on the aggregated vote counts, one per review status. They are the SQL counterpart
 * of `getReviewDecisionEffectiveStatus` and must be kept equivalent to it: the list filters here
 * and the status shown for a row come from the two, and they would otherwise disagree. Only the
 * database tests of `getList` compare them, on the statuses those tests cover.
 */
const countsPredicateByStatus = {
    forceApproved: 'r.is_force_approved is true',
    approved: 'r.is_force_approved is not true and r.approval_count > 0 and r.rejection_count = 0',
    rejected: 'r.is_force_approved is not true and r.rejection_count > 0 and r.approval_count = 0',
    conflict: 'r.is_force_approved is not true and r.approval_count > 0 and r.rejection_count > 0'
} as const;

/** Statuses that can be matched by a predicate on the aggregated counts. */
export type MatchableInterviewReviewStatus = keyof typeof countsPredicateByStatus;

/**
 * Builds the SQL resolving the interview-level review status of each row, for the queries
 * reading the status instead of filtering on it. The aggregated counts must be joined under
 * the `r` alias the predicates expect, with a left join: an interview nobody reviewed has no
 * aggregated row, and its null counts then fall to `notReviewed`.
 * @returns Raw SQL selecting a `review_status` column
 */
export const interviewReviewStatusSelect = () =>
    knex.raw(
        `case ${Object.entries(countsPredicateByStatus)
            .map(([status, predicate]) => `when ${predicate} then '${status}'`)
            .join(' ')} else 'notReviewed' end as review_status`
    );

/**
 * Builds the SQL selecting the ids of the interviews whose interview-level
 * review status matches the given status.
 * @param status - Review status to match
 * @returns SQL string usable as a subquery
 */
const interviewIdsWithStatusSql = (status: MatchableInterviewReviewStatus): string =>
    knex
        .select('r.interview_id')
        .from(interviewReviewDecisionCountsQuery().as('r'))
        .whereRaw(countsPredicateByStatus[status])
        .toString();

/** SQL selecting the ids of every interview having at least one interview-level review decision. */
const reviewedInterviewIdsSql = (): string =>
    knex(tableName).select('interview_id').where('object_type', 'interview').toString();

/**
 * Builds the raw where clause filtering interviews on their interview-level
 * review status. Returns undefined for `all`, which means no filtering.
 * @param status - Review status filter requested by the admin interview list
 * @param tblAlias - Alias of the interviews table in the enclosing query
 * @returns Raw where clause, or undefined when no filtering is required
 */
export const getInterviewReviewStatusWhereClause = (
    status: InterviewReviewStatusFilter,
    tblAlias: string
): string | undefined => {
    switch (status) {
    case 'all':
        return undefined;
        // An interview without any interview-level decision has no aggregated
        // row at all, so it is unreviewed by absence rather than by predicate.
    case 'notReviewed':
        return `${tblAlias}.id not in (${reviewedInterviewIdsSql()})`;
    case 'notRejected':
        return `${tblAlias}.id not in (${interviewIdsWithStatusSql('rejected')})`;
    default:
        return `${tblAlias}.id in (${interviewIdsWithStatusSql(status)})`;
    }
};

export default {
    getReviewDecisionsForInterview,
    deleteReviewDecisionsForInterview,
    setReviewDecision,
    clearReviewDecision,
    clearForceApprove,
    setForceApproveWhenApprovalBlocked,
    requestReReviewFromOtherReviewers
};
