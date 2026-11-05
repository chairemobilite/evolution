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
 * Context of the objects visited at the interview level (interview, home and
 * household): the interview-level objects, when they exist.
 */
export type InterviewVisitContext = {
    interview: Interview;
    home?: Home;
    household?: Household;
};

/** Context of a visited person: its household always exists */
export type PersonVisitContext = InterviewVisitContext & { household: Household };

/** Context of a visited journey: the ancestors of the journey */
export type JourneyVisitContext = PersonVisitContext & { person: Person };

/** Context of a visited place or trip: the ancestors of the journey and the journey */
export type TripVisitContext = JourneyVisitContext & { journey: Journey };

/** Context of a visited segment: all its ancestors */
export type SegmentVisitContext = TripVisitContext & { trip: Trip };

type VisitMethod<T, TContext> = (object: T, context: TContext) => void | Promise<void>;

/**
 * Operation to run on each survey object of an interview. Implement only the
 * methods for the object types of interest; the others are skipped.
 */
export interface SurveyObjectVisitor {
    visitInterview?: VisitMethod<Interview, InterviewVisitContext>;
    visitHome?: VisitMethod<Home, InterviewVisitContext>;
    visitHousehold?: VisitMethod<Household, InterviewVisitContext>;
    visitPerson?: VisitMethod<Person, PersonVisitContext>;
    visitJourney?: VisitMethod<Journey, JourneyVisitContext>;
    visitVisitedPlace?: VisitMethod<VisitedPlace, TripVisitContext>;
    visitTrip?: VisitMethod<Trip, TripVisitContext>;
    visitSegment?: VisitMethod<Segment, SegmentVisitContext>;
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
    const interviewContext: InterviewVisitContext = { interview, home, household };
    await visitor.visitInterview?.(interview, interviewContext);
    if (home) {
        await visitor.visitHome?.(home, interviewContext);
    }
    if (!household) {
        return;
    }
    await visitor.visitHousehold?.(household, interviewContext);
    const householdContext: PersonVisitContext = { ...interviewContext, household };
    for (const person of household.members ?? []) {
        await visitor.visitPerson?.(person, householdContext);
        const personContext: JourneyVisitContext = { ...householdContext, person };
        for (const journey of person.journeys ?? []) {
            await visitor.visitJourney?.(journey, personContext);
            const journeyContext: TripVisitContext = { ...personContext, journey };
            for (const visitedPlace of journey.visitedPlaces ?? []) {
                await visitor.visitVisitedPlace?.(visitedPlace, journeyContext);
            }
            for (const trip of journey.trips ?? []) {
                await visitor.visitTrip?.(trip, journeyContext);
                const tripContext: SegmentVisitContext = { ...journeyContext, trip };
                for (const segment of trip.segments ?? []) {
                    await visitor.visitSegment?.(segment, tripContext);
                }
            }
        }
    }
};
