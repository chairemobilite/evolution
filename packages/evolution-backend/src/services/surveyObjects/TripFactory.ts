/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _omit from 'lodash/omit';

import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Journey, ExtendedJourneyAttributes } from 'evolution-common/lib/services/baseObjects/Journey';
import { Trip, ExtendedTripAttributes } from 'evolution-common/lib/services/baseObjects/Trip';
import { isOk } from 'evolution-common/lib/types/Result.type';
import { createSegmentsForTrip } from './SegmentFactory';
import projectConfig from '../../config/projectConfig';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

/**
 * Generate all trips for a journey
 * Processes all trips in the journey, creating Trip objects and associating them with the journey
 * @param {SurveyObjectsWithErrors} surveyObjectsWithErrors - Container for created objects with errors
 * @param {Person} person - The person this journey belongs to
 * @param {Journey} journey - The journey to process trips for
 * @param {ExtendedJourneyAttributes} journeyAttributes - Journey attributes containing trips data
 * @param {InterviewAttributes} interviewAttributes - Interview attributes containing trip data
 * @returns {Promise<void>}
 */
export async function createTripsForJourney(
    surveyObjectsWithErrors: SurveyObjectsWithErrors,
    person: Person,
    journey: Journey,
    journeyAttributes: ExtendedJourneyAttributes,
    interviewAttributes: InterviewAttributes
): Promise<void> {
    const tripsAttributes = journeyAttributes?.trips || {};

    // Sort trips by _sequence before processing
    const sortedTripEntries = Object.entries(tripsAttributes).sort(([, a], [, b]) => {
        const sequenceA = (a as ExtendedTripAttributes)?._sequence || 0;
        const sequenceB = (b as ExtendedTripAttributes)?._sequence || 0;
        return sequenceA - sequenceB;
    });

    for (const [tripUuid, tripAttributes] of sortedTripEntries) {
        if (tripUuid === 'undefined') {
            continue;
        }

        console.log(`        ==== Trip ${tripUuid} creation ====`);

        // Parse trip attributes if parser is available
        if (projectConfig.surveyObjectParsers?.trip) {
            projectConfig.surveyObjectParsers.trip(tripAttributes, interviewAttributes);
        }

        const trip = Trip.create(
            _omit(tripAttributes as { [key: string]: unknown }, ['segments']) as ExtendedTripAttributes
        );

        if (isOk(trip)) {
            console.log(`        ==== Trip ${tripUuid} created successfully ====`);

            // Set origin and destination
            const tripAttrs = tripAttributes as ExtendedTripAttributes;
            const originUuid = tripAttrs._originVisitedPlaceUuid as string;
            const destinationUuid = tripAttrs._destinationVisitedPlaceUuid as string;
            const origin = person.findVisitedPlaceByUuid(originUuid);
            const destination = person.findVisitedPlaceByUuid(destinationUuid);

            if (origin) trip.result.origin = origin;
            if (destination) trip.result.destination = destination;

            // Remove walking from multimode and update sequences
            trip.result.segments = trip.result.getSegmentsWithoutWalkingInMultimode();

            // Associate trip with journey
            journey.addTrip(trip.result);

            // Setup start and end times
            trip.result.setupStartAndEndTimes();

            // Create segments for this trip
            await createSegmentsForTrip(
                surveyObjectsWithErrors,
                trip.result,
                tripAttributes as ExtendedTripAttributes,
                interviewAttributes
            );
        } else {
            console.log(
                `        ==== Trip ${tripUuid} creation failed with errors count: ${trip.errors?.length || 0} ====`
            );
            surveyObjectsWithErrors.errorsByObject.tripsByUuid[tripUuid] = trip.errors;
        }
    }
}
