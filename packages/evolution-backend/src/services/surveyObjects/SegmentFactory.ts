/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { Trip, ExtendedTripAttributes } from 'evolution-common/lib/services/baseObjects/Trip';
import { Segment, ExtendedSegmentAttributes } from 'evolution-common/lib/services/baseObjects/Segment';
import { isOk } from 'evolution-common/lib/types/Result.type';
import projectConfig from '../../config/projectConfig';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

/**
 * Generate segments for a trip
 * Creates all Segment objects for a trip and associates them with the trip
 * @param {SurveyObjectsWithErrors} surveyObjectsWithErrors - Container for created objects with errors
 * @param {Trip} trip - The trip these segments belong to
 * @param {ExtendedTripAttributes} tripAttributes - Trip attributes containing segment data
 * @param {InterviewAttributes} interviewAttributes - Interview attributes containing segment data
 * @returns {Promise<void>}
 */
export async function createSegmentsForTrip(
    surveyObjectsWithErrors: SurveyObjectsWithErrors,
    trip: Trip,
    tripAttributes: ExtendedTripAttributes,
    interviewAttributes: InterviewAttributes
): Promise<void> {
    const segmentsAttributes = tripAttributes?.segments || {};

    // Sort segments by _sequence before processing
    const sortedSegmentEntries = Object.entries(segmentsAttributes).sort(([, a], [, b]) => {
        const sequenceA = (a as ExtendedSegmentAttributes)?._sequence || 0;
        const sequenceB = (b as ExtendedSegmentAttributes)?._sequence || 0;
        return sequenceA - sequenceB;
    });

    for (const [segmentUuid, segmentAttributes] of sortedSegmentEntries) {
        if (segmentUuid === 'undefined') {
            continue;
        }

        console.log(`          ==== Segment ${segmentUuid} creation ====`);

        // Parse segment attributes if parser is available
        if (projectConfig.surveyObjectParsers?.segment) {
            projectConfig.surveyObjectParsers.segment(segmentAttributes, interviewAttributes);
        }

        const segment = Segment.create(segmentAttributes as ExtendedSegmentAttributes);

        if (isOk(segment)) {
            console.log(`          ==== Segment ${segmentUuid} created successfully ====`);

            // Associate segment with trip
            trip.addSegment(segment.result);
        } else {
            console.log(
                `          ==== Segment ${segmentUuid} creation failed with errors count: ${segment.errors?.length || 0} ====`
            );
            surveyObjectsWithErrors.errorsByObject.segmentsByUuid[segmentUuid] = segment.errors;
        }
    }
}
