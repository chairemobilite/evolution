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
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

/**
 * Generate segments for a trip
 * Populate segments for a trip from the trip's segments attributes
 * @param {SurveyObjectsWithErrors} surveyObjectsWithErrors - Container for created objects with errors
 * @param {Trip} trip - The trip these segments belong to
 * @param {ExtendedTripAttributes} tripAttributes - Trip attributes containing segment data
 * @param {CorrectedResponse} correctedResponse - corrected response
 * @param {SurveyObjectsRegistry} surveyObjectsRegistry - SurveyObjectsRegistry
 * @returns {Promise<void>}
 */
export async function populateSegmentsForTrip(
    surveyObjectsWithErrors: SurveyObjectsWithErrors,
    trip: Trip,
    tripAttributes: ExtendedTripAttributes,
    correctedResponse: CorrectedResponse,
    surveyObjectsRegistry: SurveyObjectsRegistry
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

        // Parse segment attributes if parser is available
        if (projectConfig.surveyObjectParsers?.segment) {
            projectConfig.surveyObjectParsers.segment(segmentAttributes, correctedResponse);
        }

        const segment = Segment.create(segmentAttributes as ExtendedSegmentAttributes, surveyObjectsRegistry);

        if (isOk(segment)) {
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
