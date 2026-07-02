/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import {
    reviewUuidKeyedCollectionKeysByObjectType,
    type ReviewDecisions,
    type ReviewDecision,
    type ReviewDecisionEffectiveStatus,
    type ReviewDecisionsByObject,
    type ReviewDecisionStatusByObject,
    type ReviewDecisionStatusForObject,
    type SingletonSurveyObjectName
} from 'evolution-common/lib/services/reviews/types';
import { surveyObjectNames, type SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';

// Null prototype: bucket keys are object uuids coming from external data, so
// guard against `__proto__` / `constructor` prototype-pollution keys.
const emptyUuidKeyedBuckets = <T>(): { [key: string]: T } => Object.create(null) as { [key: string]: T };

type ReviewDecisionsByObjectCollectionKey = keyof ReviewDecisionsByObject;

type ReviewObjectTypeBucketMeta = {
    collectionKey: ReviewDecisionsByObjectCollectionKey;
    isUuidKeyed: boolean;
};

// Derived from reviewUuidKeyedCollectionKeysByObjectType (types.ts) so the
// objectType→collectionKey mapping has a single source of truth. Singleton
// object types (one per interview) keep their own name as collection key.
const singletonReviewObjectTypes = surveyObjectNames.filter(
    (name): name is SingletonSurveyObjectName => !Object.hasOwn(reviewUuidKeyedCollectionKeysByObjectType, name)
);
const reviewObjectTypeBucketMeta = Object.fromEntries([
    ...singletonReviewObjectTypes.map((objectType) => [objectType, { collectionKey: objectType, isUuidKeyed: false }]),
    ...Object.entries(reviewUuidKeyedCollectionKeysByObjectType).map(([objectType, collectionKey]) => [
        objectType,
        { collectionKey, isUuidKeyed: true }
    ])
]) as Record<SurveyObjectName, ReviewObjectTypeBucketMeta>;

const getReviewObjectTypeBucketMeta = (objectType: SurveyObjectName): ReviewObjectTypeBucketMeta => {
    if (!Object.hasOwn(reviewObjectTypeBucketMeta, objectType)) {
        throw new Error(`Unknown review object type: ${objectType}`);
    }
    return reviewObjectTypeBucketMeta[objectType];
};

const emptyBucketsByCollection = <TBucket>(
    createUuidKeyedBucket: () => { [key: string]: TBucket },
    createArrayBucket?: () => TBucket
): Partial<Record<ReviewDecisionsByObjectCollectionKey, TBucket | { [key: string]: TBucket }>> => {
    const buckets: Partial<Record<ReviewDecisionsByObjectCollectionKey, TBucket | { [key: string]: TBucket }>> = {};
    const includeSingletonBuckets = createArrayBucket !== undefined;

    for (const objectType of surveyObjectNames) {
        const { collectionKey, isUuidKeyed } = reviewObjectTypeBucketMeta[objectType];
        if (!isUuidKeyed && !includeSingletonBuckets) {
            continue;
        }
        buckets[collectionKey] = isUuidKeyed ? createUuidKeyedBucket() : createArrayBucket!();
    }

    return buckets;
};

const emptyReviewDecisionsByObject = (): ReviewDecisionsByObject =>
    emptyBucketsByCollection(
        () => emptyUuidKeyedBuckets<ReviewDecision[]>(),
        () => []
    ) as ReviewDecisionsByObject;

const emptyReviewDecisionStatusByObject = (): ReviewDecisionStatusByObject =>
    emptyBucketsByCollection(() =>
        emptyUuidKeyedBuckets<ReviewDecisionStatusForObject>()
    ) as ReviewDecisionStatusByObject;

const pushUuidKeyedReviewDecision = (
    decisionsByUuid: { [key: string]: ReviewDecision[] },
    reviewDecision: ReviewDecision
): void => {
    if (!decisionsByUuid[reviewDecision.objectUuid]) {
        decisionsByUuid[reviewDecision.objectUuid] = [];
    }
    decisionsByUuid[reviewDecision.objectUuid].push(reviewDecision);
};

const pushReviewDecision = (reviewDecisionsByObject: ReviewDecisionsByObject, reviewDecision: ReviewDecision): void => {
    const { collectionKey, isUuidKeyed } = getReviewObjectTypeBucketMeta(reviewDecision.objectType);

    if (isUuidKeyed) {
        pushUuidKeyedReviewDecision(
            reviewDecisionsByObject[collectionKey] as { [key: string]: ReviewDecision[] },
            reviewDecision
        );
        return;
    }

    (reviewDecisionsByObject[collectionKey] as ReviewDecision[]).push(reviewDecision);
};

/**
 * Groups review decision rows by survey object type and uuid.
 * @param reviewDecisions - Flat list of review decisions for an interview
 * @returns Review decisions grouped by object type
 */
export const reviewDecisionsArrayToReviewDecisionsByObject = (
    reviewDecisions: ReviewDecision[]
): ReviewDecisionsByObject => {
    const reviewDecisionsByObject = emptyReviewDecisionsByObject();
    reviewDecisions.forEach((reviewDecision) => pushReviewDecision(reviewDecisionsByObject, reviewDecision));
    return reviewDecisionsByObject;
};

// Decisions are already sorted newest first by the db queries (`orderBy('updated_at', 'desc')`),
// so the first force-approved row is the most recent one.
const findForceApproveReviewDecision = (objectReviewDecisions: ReviewDecision[]): ReviewDecision | undefined =>
    objectReviewDecisions.find((reviewDecision) => reviewDecision.forceApproved);

/**
 * Resolves export-gate status from reviewer counts and optional admin force-approve.
 * @param approvalCount - Number of approve decisions
 * @param rejectionCount - Number of reject decisions
 * @param isForceApproved - Whether an admin force-approved the object
 * @returns Effective review status for the object
 */
export const getReviewDecisionEffectiveStatus = (
    approvalCount: number,
    rejectionCount: number,
    isForceApproved: boolean
): ReviewDecisionEffectiveStatus => {
    if (isForceApproved) {
        return 'forceApproved';
    }
    if (approvalCount > 0 && rejectionCount > 0) {
        return 'conflict';
    }
    if (approvalCount > 0) {
        return 'approved';
    }
    if (rejectionCount > 0) {
        return 'rejected';
    }
    return 'notReviewed';
};

/**
 * Computes aggregated review status from review decisions already scoped to one object.
 * @param objectReviewDecisions - Review decisions for a single object
 * @param objectType - Survey object type
 * @param objectUuid - Survey object uuid
 * @param currentUserId - Optional current reviewer user id
 * @returns Aggregated review status for the object
 */
const computeReviewDecisionStatusFromObjectDecisions = (
    objectReviewDecisions: ReviewDecision[],
    objectType: SurveyObjectName,
    objectUuid: string,
    currentUserId?: number
): ReviewDecisionStatusForObject => {
    const reviewerVoteDecisions = objectReviewDecisions.filter((reviewDecision) => !reviewDecision.forceApproved);
    const approvalCount = reviewerVoteDecisions.filter(
        (reviewDecision) => reviewDecision.decision === 'approve'
    ).length;
    const rejectionCount = reviewerVoteDecisions.filter(
        (reviewDecision) => reviewDecision.decision === 'reject'
    ).length;
    const hasApprove = approvalCount > 0;
    const hasReject = rejectionCount > 0;
    const reReviewRequestedUserIds = objectReviewDecisions
        .filter((reviewDecision) => reviewDecision.reReviewRequested)
        .map((reviewDecision) => reviewDecision.userId);
    const currentUserReviewDecision =
        currentUserId !== undefined
            ? objectReviewDecisions.find((reviewDecision) => reviewDecision.userId === currentUserId)
            : undefined;
    const reReviewRequestedByCurrentUser =
        currentUserId !== undefined &&
        objectReviewDecisions.some(
            (reviewDecision) =>
                reviewDecision.reReviewRequested && reviewDecision.reReviewRequestedByUserId === currentUserId
        );
    const forceApproveReviewDecision = findForceApproveReviewDecision(objectReviewDecisions);
    const isForceApproved = forceApproveReviewDecision !== undefined;

    return {
        objectType,
        objectUuid,
        approvalCount,
        rejectionCount,
        hasConflict: hasApprove && hasReject,
        isForceApproved,
        forceApprovedByUserId: forceApproveReviewDecision?.userId,
        forceApproveComment: forceApproveReviewDecision?.forceApproveComment,
        effectiveStatus: getReviewDecisionEffectiveStatus(approvalCount, rejectionCount, isForceApproved),
        currentUserDecision: currentUserReviewDecision?.decision,
        currentUserForceApproved: currentUserReviewDecision?.forceApproved,
        reReviewRequestedOfCurrentUser: currentUserReviewDecision?.reReviewRequested,
        reReviewRequestedByCurrentUser,
        reReviewRequestedUserIds,
        isReviewed: reviewerVoteDecisions.length > 0
    };
};

/**
 * Computes aggregated review status for one object from reviewer decisions.
 * @param reviewDecisions - All review decisions for the interview
 * @param objectType - Survey object type
 * @param objectUuid - Survey object uuid
 * @param currentUserId - Optional current reviewer user id
 * @returns Aggregated review status for the object
 */
export const computeReviewDecisionStatusForObject = (
    reviewDecisions: ReviewDecision[],
    objectType: SurveyObjectName,
    objectUuid: string,
    currentUserId?: number
): ReviewDecisionStatusForObject =>
    computeReviewDecisionStatusFromObjectDecisions(
        reviewDecisions.filter(
            (reviewDecision) => reviewDecision.objectType === objectType && reviewDecision.objectUuid === objectUuid
        ),
        objectType,
        objectUuid,
        currentUserId
    );

const setReviewDecisionStatus = (
    reviewDecisionStatusByObject: ReviewDecisionStatusByObject,
    status: ReviewDecisionStatusForObject
): void => {
    const { collectionKey, isUuidKeyed } = getReviewObjectTypeBucketMeta(status.objectType);

    if (isUuidKeyed) {
        (reviewDecisionStatusByObject[collectionKey] as { [key: string]: ReviewDecisionStatusForObject })[
            status.objectUuid
        ] = status;
        return;
    }

    // Singleton object types (interview/household/home) store their status directly under their key.
    reviewDecisionStatusByObject[collectionKey as SingletonSurveyObjectName] = status;
};

/**
 * Computes aggregated review status for every object that has at least one review decision.
 * @param reviewDecisions - All review decisions for the interview
 * @param currentUserId - Optional current reviewer user id
 * @returns Review status grouped by object type
 */
const computeReviewDecisionStatusByObject = (
    reviewDecisions: ReviewDecision[],
    currentUserId?: number
): ReviewDecisionStatusByObject => {
    const reviewDecisionStatusByObject = emptyReviewDecisionStatusByObject();
    const reviewDecisionsByObjectUuid = new Map<SurveyObjectName, Map<string, ReviewDecision[]>>();

    for (const reviewDecision of reviewDecisions) {
        const decisionsByUuid =
            reviewDecisionsByObjectUuid.get(reviewDecision.objectType) ?? new Map<string, ReviewDecision[]>();
        const objectReviewDecisions = decisionsByUuid.get(reviewDecision.objectUuid) ?? [];
        objectReviewDecisions.push(reviewDecision);
        decisionsByUuid.set(reviewDecision.objectUuid, objectReviewDecisions);
        reviewDecisionsByObjectUuid.set(reviewDecision.objectType, decisionsByUuid);
    }

    for (const [objectType, decisionsByUuid] of reviewDecisionsByObjectUuid) {
        for (const [objectUuid, objectReviewDecisions] of decisionsByUuid) {
            const status = computeReviewDecisionStatusFromObjectDecisions(
                objectReviewDecisions,
                objectType,
                objectUuid,
                currentUserId
            );
            setReviewDecisionStatus(reviewDecisionStatusByObject, status);
        }
    }

    return reviewDecisionStatusByObject;
};

/**
 * Builds the review decisions payload returned to the admin review UI.
 * @param reviewDecisions - All review decisions for the interview
 * @param currentUserId - Optional current reviewer user id
 * @returns Review decision lists and aggregated status
 */
export const buildReviewDecisions = (reviewDecisions: ReviewDecision[], currentUserId?: number): ReviewDecisions => ({
    reviewDecisions,
    reviewDecisionsByObject: reviewDecisionsArrayToReviewDecisionsByObject(reviewDecisions),
    reviewDecisionStatusByObject: computeReviewDecisionStatusByObject(reviewDecisions, currentUserId)
});
