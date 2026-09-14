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
import { populateSegmentsForTrip } from './SegmentFactory';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';
import {
    compareSequenceThenUuid,
    hasInvalidOrDuplicateSequences
} from 'evolution-common/lib/services/baseObjects/sequenceUtils';
import {
    computeIsSegmentChainClosed,
    computeIsSegmentChainClosedMoreThanOnce
} from './derivedFlags/segmentChainClosure';
import type { ExtendedSegmentAttributes } from 'evolution-common/lib/services/baseObjects/Segment';
import { AuditLog } from '../audits/auditLog';

/**
 * Generate all trips for a journey
 * Populate trips for a journey from the journey's already-parsed trips attributes
 * @param {SurveyObjectsWithErrors} surveyObjectsWithErrors - Container for created objects with errors
 * @param {Person} person - The person this journey belongs to
 * @param {Journey} journey - The journey to process trips for
 * @param {ExtendedJourneyAttributes} journeyAttributes - Parsed journey attributes containing trips data
 * @param {SurveyObjectsRegistry} surveyObjectsRegistry - SurveyObjectsRegistry
 * @returns {Promise<void>}
 */
export async function populateTripsForJourney(
    surveyObjectsWithErrors: SurveyObjectsWithErrors,
    person: Person,
    journey: Journey,
    journeyAttributes: ExtendedJourneyAttributes,
    surveyObjectsRegistry: SurveyObjectsRegistry
): Promise<void> {
    const tripsAttributes = journeyAttributes?.trips || {};

    // Sort trips by _sequence before processing
    const sortedTripEntries = Object.entries(tripsAttributes).sort(compareSequenceThenUuid);

    for (const [tripUuid, originalCorrectedTripAttributes] of sortedTripEntries) {
        if (tripUuid === 'undefined') {
            continue;
        }

        const tripAttributes = originalCorrectedTripAttributes as ExtendedTripAttributes;

        const trip = Trip.create(
            _omit(tripAttributes as { [key: string]: unknown }, ['segments']) as ExtendedTripAttributes,
            surveyObjectsRegistry
        );

        if (isOk(trip)) {
            // Set origin and destination
            const originUuid = tripAttributes._originVisitedPlaceUuid as string;
            const destinationUuid = tripAttributes._destinationVisitedPlaceUuid as string;
            const origin = person.findVisitedPlaceByUuid(originUuid);
            const destination = person.findVisitedPlaceByUuid(destinationUuid);

            if (origin) trip.result.origin = origin;
            if (destination) trip.result.destination = destination;

            const segmentsByUuid = (tripAttributes.segments ?? {}) as { [uuid: string]: ExtendedSegmentAttributes };
            trip.result.isSegmentChainClosed = computeIsSegmentChainClosed(segmentsByUuid);
            trip.result.isSegmentChainClosedMoreThanOnce = computeIsSegmentChainClosedMoreThanOnce(segmentsByUuid);

            // Associate trip with journey
            journey.addTrip(trip.result);

            // Setup start and end times
            trip.result.setupStartAndEndTimes();

            // Create segments for this trip
            await populateSegmentsForTrip(surveyObjectsWithErrors, trip.result, tripAttributes, surveyObjectsRegistry);

            // Remove walking segments from multimode trips, but only when the raw
            // sequences are sound. Filtering drops segments, which would hide a
            // duplicate or invalid sequence from T_L_InvalidSegmentSequences: keeping
            // the raw segments lets the audit report the problem to the reviewer.
            if (!hasInvalidOrDuplicateSequences(trip.result.segments)) {
                trip.result.segments = trip.result.getSegmentsWithoutWalkingInMultimode();
            }
        } else {
            AuditLog.debug(`Trip ${tripUuid} creation failed with errors count: ${trip.errors?.length || 0}`);
            surveyObjectsWithErrors.errorsByObject.tripsByUuid[tripUuid] = trip.errors;
        }
    }
}
