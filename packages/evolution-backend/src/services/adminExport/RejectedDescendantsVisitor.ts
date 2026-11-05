/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type {
    SurveyObjectVisitor,
    SurveyObjectVisitContext
} from 'evolution-common/lib/services/baseObjects/walkSurveyObjects';
import type { GetReviewStatus } from './exportedReviewStatus';
import { ExportedObjectType, getAncestorKeys, getObjectKey } from './exportedSurveyObjectParents';

/** Function returning whether an object of the interview being visited has a rejected descendant */
export type HasRejectedDescendant = (objectType: ExportedObjectType, objectUuid: string) => boolean;

type VisitedObject = { uuid?: string };

/**
 * Visitor finding the objects of one interview that contain a rejected
 * object among their descendants, for example a household with a rejected
 * person. Only the decisions taken on the descendants count, not the status
 * they inherit from their parent.
 *
 * Children are visited after their parent, so an interview must be fully
 * visited before calling {@link RejectedDescendantsVisitor.hasRejectedDescendant}.
 */
export class RejectedDescendantsVisitor implements SurveyObjectVisitor {
    /** Keys of the objects with a rejected descendant, see {@link getObjectKey} */
    private readonly objectsWithRejectedDescendant = new Set<string>();

    private readonly getReviewStatus: GetReviewStatus;

    /**
     * @param {GetReviewStatus} getReviewStatus - Get the review status of an object of the
     * interview being visited
     */
    constructor(getReviewStatus: GetReviewStatus) {
        this.getReviewStatus = getReviewStatus;
    }

    visitInterview = (object: VisitedObject, context: SurveyObjectVisitContext) =>
        this.visit('interview', object, context);
    visitHome = (object: VisitedObject, context: SurveyObjectVisitContext) => this.visit('home', object, context);
    visitHousehold = (object: VisitedObject, context: SurveyObjectVisitContext) =>
        this.visit('household', object, context);
    visitPerson = (object: VisitedObject, context: SurveyObjectVisitContext) => this.visit('person', object, context);
    visitJourney = (object: VisitedObject, context: SurveyObjectVisitContext) => this.visit('journey', object, context);
    visitVisitedPlace = (object: VisitedObject, context: SurveyObjectVisitContext) =>
        this.visit('visitedPlace', object, context);
    visitTrip = (object: VisitedObject, context: SurveyObjectVisitContext) => this.visit('trip', object, context);
    visitSegment = (object: VisitedObject, context: SurveyObjectVisitContext) => this.visit('segment', object, context);

    /**
     * Whether a visited object has a rejected descendant
     *
     * @param {ExportedObjectType} objectType - Type of the object
     * @param {string} objectUuid - Uuid of the object
     * @returns {boolean} True when at least one descendant of the object is rejected
     */
    hasRejectedDescendant: HasRejectedDescendant = (objectType, objectUuid) =>
        this.objectsWithRejectedDescendant.has(getObjectKey(objectType, objectUuid));

    private visit(objectType: ExportedObjectType, object: VisitedObject, context: SurveyObjectVisitContext): void {
        if (object.uuid !== undefined && this.getReviewStatus(objectType, object.uuid) === 'rejected') {
            getAncestorKeys(objectType, context).forEach((ancestorKey) =>
                this.objectsWithRejectedDescendant.add(ancestorKey)
            );
        }
    }
}
