/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { GroupConfig } from '../../widgets';
import { Segment } from '../../interviews/interview';
import { getResponse } from '../../../utils/helpers';
import { TFunction } from 'i18next';

export const getSegmentsGroupConfig = (
    // FIXME: Type this when there is a few more widgets implemented
    options: { context?: () => string } = {}
): GroupConfig => {
    // TODO These should be some configuration receive here to fine-tune the section's content
    return {
        type: 'group',
        path: 'segments',
        title: (t: TFunction) => t(['customSurvey:segments:GroupTitle', 'segments:GroupTitle']),
        name: (t: TFunction, _groupedObject, sequence) =>
            t(['customSurvey:segments:GroupName', 'segments:GroupName'], { sequence }),
        showTitle: false,
        showGroupedObjectDeleteButton: function (interview, path) {
            const segment = getResponse(interview, path, null) as Segment | null;
            return segment !== null && segment['_sequence'] > 1;
        },
        showGroupedObjectAddButton: function (interview, path) {
            const segments = getResponse(interview, path, {}) as { [segmentId: string]: Segment };
            const segmentsArray = Object.values(segments).sort((segmentA, segmentB) => {
                return segmentA['_sequence'] - segmentB['_sequence'];
            });
            const segmentsCount = segmentsArray.length;
            const lastSegment = segmentsArray[segmentsCount - 1];
            return segmentsCount === 0 || (lastSegment && lastSegment.hasNextMode === true);
        },
        groupedObjectAddButtonLabel: (t: TFunction, interview, path) => {
            const segments = getResponse(interview, path, {}) as { [segmentId: string]: Segment };
            const segmentsCount = Object.keys(segments).length;
            return t(['customSurvey:segments:AddButtonLabel', 'segments:AddButtonLabel'], { count: segmentsCount });
        },
        addButtonLocation: 'bottom' as const,
        widgets: [
            // TODO Those widget names do not link to anything! They should accompany their actual widgets somewhere
            // Hard-coded, mandatory questions
            'segmentSameModeAsReverseTrip',
            'segmentModePre',
            'segmentMode',
            'segmentHasNextMode'
            // TODO Add more configurable widgets here, either custom or depending on the segments section configuration
        ]
    };
};
