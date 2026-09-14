/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _omit from 'lodash/omit';

import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { Trip, ExtendedTripAttributes } from 'evolution-common/lib/services/baseObjects/Trip';
import { Segment, ExtendedSegmentAttributes } from 'evolution-common/lib/services/baseObjects/Segment';
import { isOk } from 'evolution-common/lib/types/Result.type';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';
import { AuditLog } from '../audits/auditLog';
import { compareSequenceThenUuid } from 'evolution-common/lib/services/baseObjects/sequenceUtils';

/**
 * Generate segments for a trip
 * Populate segments for a trip from the trip's segments attributes
 * @param {SurveyObjectsWithErrors} surveyObjectsWithErrors - Container for created objects with errors
 * @param {Trip} trip - The trip these segments belong to
 * @param {ExtendedTripAttributes} tripAttributes - Parsed trip attributes containing segment data
 * @param {SurveyObjectsRegistry} surveyObjectsRegistry - SurveyObjectsRegistry
 * @returns {Promise<void>}
 */
export async function populateSegmentsForTrip(
    surveyObjectsWithErrors: SurveyObjectsWithErrors,
    trip: Trip,
    tripAttributes: ExtendedTripAttributes,
    surveyObjectsRegistry: SurveyObjectsRegistry
): Promise<void> {
    const segmentsAttributes = tripAttributes?.segments || {};

    // Sort segments by _sequence before processing
    const sortedSegmentEntries = Object.entries(segmentsAttributes).sort(compareSequenceThenUuid);

    for (const [segmentUuid, originalCorrectedSegmentAttributes] of sortedSegmentEntries) {
        if (segmentUuid === 'undefined') {
            continue;
        }

        const segmentAttributes = originalCorrectedSegmentAttributes as ExtendedSegmentAttributes;

        const segment = Segment.create(
            _omit(segmentAttributes, ['hasNextMode']) as ExtendedSegmentAttributes,
            surveyObjectsRegistry
        );

        if (isOk(segment)) {
            // hasNextMode lives only on the questionnaire segment, not on Segment attributes.
            segment.result.hasNextMode =
                typeof segmentAttributes.hasNextMode === 'boolean' ? segmentAttributes.hasNextMode : undefined;
            // Associate segment with trip
            trip.addSegment(segment.result);
        } else {
            AuditLog.error(`Segment ${segmentUuid} creation failed with errors count: ${segment.errors?.length || 0}`);
            surveyObjectsWithErrors.errorsByObject.segmentsByUuid[segmentUuid] = segment.errors;
        }
    }
}
