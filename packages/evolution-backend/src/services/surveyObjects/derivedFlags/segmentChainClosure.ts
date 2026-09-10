/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { compareSequenceThenUuid } from 'evolution-common/lib/services/baseObjects/sequenceUtils';
import { ExtendedSegmentAttributes } from 'evolution-common/lib/services/baseObjects/Segment';

const getSortedSegments = (
    segmentsByUuid?: { [uuid: string]: ExtendedSegmentAttributes } | null
): ExtendedSegmentAttributes[] => {
    return Object.entries(segmentsByUuid ?? {})
        .filter(([, segment]) => !_isBlank(segment))
        .sort(compareSequenceThenUuid)
        .map(([, segment]) => segment);
};

/**
 * Whether the last questionnaire segment closed the trip's segment chain.
 *
 * Closed means the last segment (by `_sequence`) answers `hasNextMode === false`.
 * A missing `hasNextMode` is treated as not closed: every segment is expected
 * to answer that question.
 *
 * @param segmentsByUuid - Questionnaire segments keyed by uuid
 * @returns `true` when the last segment closes the chain, otherwise `false`
 */
export const computeIsSegmentChainClosed = (
    segmentsByUuid?: { [uuid: string]: ExtendedSegmentAttributes } | null
): boolean => {
    const segments = getSortedSegments(segmentsByUuid);
    if (segments.length === 0) {
        return false;
    }
    return segments[segments.length - 1].hasNextMode === false;
};

/**
 * Whether more than one questionnaire segment closed the trip's segment chain.
 *
 * A close is `hasNextMode === false`.
 *
 * @param segmentsByUuid - Questionnaire segments keyed by uuid
 * @returns `true` when more than one segment answers `hasNextMode === false`
 */
export const computeIsSegmentChainClosedMoreThanOnce = (
    segmentsByUuid?: { [uuid: string]: ExtendedSegmentAttributes } | null
): boolean => {
    const segments = getSortedSegments(segmentsByUuid);
    return segments.filter((segment) => segment.hasNextMode === false).length > 1;
};
