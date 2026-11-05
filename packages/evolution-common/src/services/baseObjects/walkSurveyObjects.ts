/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { Interview } from './interview/Interview';
import type { Home } from './Home';
import type { Household } from './Household';
import type { Person } from './Person';
import type { Journey } from './Journey';
import type { VisitedPlace } from './VisitedPlace';
import type { Trip } from './Trip';
import type { Segment } from './Segment';
import type { ParentSurveyObjects } from './types';

/**
 * Context of the visited object: the interview-level objects (interview, home
 * and household, when they exist) and the ancestors of the visited object
 * among person, journey and trip (e.g. `trip` is only set for segments).
 */
export type SurveyObjectVisitContext = {
    interview: Interview;
    home?: Home;
    household?: Household;
    person?: Person;
    journey?: Journey;
    trip?: Trip;
};

type VisitMethod<T> = (object: T, context: SurveyObjectVisitContext) => void | Promise<void>;

/**
 * Operation to run on each survey object of an interview. Implement only the
 * methods for the object types of interest; the others are skipped.
 */
export interface SurveyObjectVisitor {
    visitInterview?: VisitMethod<Interview>;
    visitHome?: VisitMethod<Home>;
    visitHousehold?: VisitMethod<Household>;
    visitPerson?: VisitMethod<Person>;
    visitJourney?: VisitMethod<Journey>;
    visitVisitedPlace?: VisitMethod<VisitedPlace>;
    visitTrip?: VisitMethod<Trip>;
    visitSegment?: VisitMethod<Segment>;
}

/**
 * Walk the survey objects of an interview, parents before children, and call
 * the matching method of the visitor for each object. Visits are sequential,
 * so a visitor can rely on the order: interview, home, household, then for
 * each person: the person, then for each journey: the journey, its visited
 * places, then each trip followed by its segments.
 *
 * Nothing is visited if the interview is undefined.
 *
 * @param {ParentSurveyObjects} surveyObjects - The root survey objects of the interview
 * @param {SurveyObjectVisitor} visitor - The operation to run on each object
 * @returns {Promise<void>}
 */
export const walkSurveyObjects = async (
    surveyObjects: ParentSurveyObjects,
    visitor: SurveyObjectVisitor
): Promise<void> => {
    const { interview, home, household } = surveyObjects;
    if (!interview) {
        return;
    }
    const interviewContext: SurveyObjectVisitContext = { interview, home, household };
    await visitor.visitInterview?.(interview, interviewContext);
    if (home) {
        await visitor.visitHome?.(home, interviewContext);
    }
    if (!household) {
        return;
    }
    await visitor.visitHousehold?.(household, interviewContext);
    for (const person of household.members ?? []) {
        await visitor.visitPerson?.(person, interviewContext);
        const personContext = { ...interviewContext, person };
        for (const journey of person.journeys ?? []) {
            await visitor.visitJourney?.(journey, personContext);
            const journeyContext = { ...personContext, journey };
            for (const visitedPlace of journey.visitedPlaces ?? []) {
                await visitor.visitVisitedPlace?.(visitedPlace, journeyContext);
            }
            for (const trip of journey.trips ?? []) {
                await visitor.visitTrip?.(trip, journeyContext);
                const tripContext = { ...journeyContext, trip };
                for (const segment of trip.segments ?? []) {
                    await visitor.visitSegment?.(segment, tripContext);
                }
            }
        }
    }
};
