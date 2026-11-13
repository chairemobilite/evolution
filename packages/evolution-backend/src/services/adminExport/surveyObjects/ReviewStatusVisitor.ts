/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type {
    InterviewVisitContext,
    JourneyVisitContext,
    PersonVisitContext,
    SegmentVisitContext,
    SurveyObjectVisitor,
    TripVisitContext
} from 'evolution-common/lib/services/baseObjects/walkSurveyObjects';
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import type { ReviewDecision, ReviewDecisionEffectiveStatus } from 'evolution-common/lib/services/reviews/types';
import { computeReviewDecisionStatusForObject } from '../../reviews/ReviewDecisionUtils';
import { getExportedReviewStatus } from './exportedReviewStatus';

/** Review of a survey object, as exported */
export type ExportedReview = {
    /** Status of the object, see {@link getExportedReviewStatus} */
    reviewStatus: ReviewDecisionEffectiveStatus;
    /**
     * Whether a reviewer decision rejects at least one object contained in
     * this one, at any depth. The status that the contained objects inherit
     * from their parent does not count.
     */
    hasRejectedDescendant: boolean;
};

type VisitedObject = { uuid?: string };

/**
 * Visitor computing the exported review of each survey object of an
 * interview, from the review decisions of this interview. An object can be
 * approved while it contains a rejected object, for example a household with
 * a rejected person: the export keeps the decision taken on each object and
 * tells which objects contain a rejected one.
 *
 * The review of an object depends on its ancestors (inherited status) and on
 * its descendants (rejected descendant), so the interview must be fully
 * visited before calling {@link ReviewStatusVisitor.getReview}.
 */
export class ReviewStatusVisitor implements SurveyObjectVisitor {
    private readonly reviewDecisions: ReviewDecision[];
    /**
     * Review of the visited objects. The objects themselves are the keys, as
     * the home and household have the uuid of the interview.
     */
    private readonly reviewByObject = new Map<VisitedObject, ExportedReview>();

    /**
     * @param {ReviewDecision[]} reviewDecisions - All the review decisions of the interview
     */
    constructor(reviewDecisions: ReviewDecision[]) {
        this.reviewDecisions = reviewDecisions;
    }

    visitInterview = (interview: VisitedObject) => this.visit('interview', interview, []);

    visitHome = (home: VisitedObject, { interview }: InterviewVisitContext) => this.visit('home', home, [interview]);

    visitHousehold = (household: VisitedObject, { interview }: InterviewVisitContext) =>
        this.visit('household', household, [interview]);

    visitPerson = (person: VisitedObject, { household, interview }: PersonVisitContext) =>
        this.visit('person', person, [household, interview]);

    visitJourney = (journey: VisitedObject, { person, household, interview }: JourneyVisitContext) =>
        this.visit('journey', journey, [person, household, interview]);

    visitVisitedPlace = (visitedPlace: VisitedObject, { journey, person, household, interview }: TripVisitContext) =>
        this.visit('visitedPlace', visitedPlace, [journey, person, household, interview]);

    visitTrip = (trip: VisitedObject, { journey, person, household, interview }: TripVisitContext) =>
        this.visit('trip', trip, [journey, person, household, interview]);

    visitSegment = (segment: VisitedObject, { trip, journey, person, household, interview }: SegmentVisitContext) =>
        this.visit('segment', segment, [trip, journey, person, household, interview]);

    /**
     * Get the exported review of a visited object
     *
     * @param {VisitedObject} object - A survey object of the visited interview
     * @returns {ExportedReview} The review of the object
     * @throws If the object was not visited
     */
    getReview(object: VisitedObject): ExportedReview {
        const review = this.reviewByObject.get(object);
        if (review === undefined) {
            throw new Error(`The review of the survey object ${object.uuid} is requested before the object is visited`);
        }
        return review;
    }

    /**
     * Compute the review of an object. Its ancestors are already visited, as
     * parents are visited before their children.
     *
     * @param {SurveyObjectName} objectType - Type of the object
     * @param {VisitedObject} object - The visited object
     * @param {VisitedObject[]} ancestors - Ancestors of the object, from its parent to the interview
     */
    private visit(objectType: SurveyObjectName, object: VisitedObject, ancestors: VisitedObject[]): void {
        const status =
            object.uuid === undefined
                ? 'notReviewed'
                : computeReviewDecisionStatusForObject(this.reviewDecisions, objectType, object.uuid).effectiveStatus;
        if (status === 'rejected') {
            ancestors.forEach((ancestor) => {
                this.getReview(ancestor).hasRejectedDescendant = true;
            });
        }
        const parentStatus = ancestors.length === 0 ? undefined : this.getReview(ancestors[0]).reviewStatus;
        this.reviewByObject.set(object, {
            reviewStatus: getExportedReviewStatus(status, parentStatus),
            hasRejectedDescendant: false
        });
    }
}
