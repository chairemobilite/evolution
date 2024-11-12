/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { ButtonWidgetConfig } from '../../widgets';
import { Segment, UserInterviewAttributes } from '../../interviews/interview';
import { ButtonAction, getPath, getResponse, InterviewUpdateCallbacks } from '../../../utils/helpers';
import * as odHelpers from '../../odSurvey/helpers';
import { TFunction } from 'i18next';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

export const getButtonSaveTripSegmentsConfig = (
    // FIXME: Type this when there is a few more widgets implemented
    options: {
        context?: () => string;
        buttonActions: { validateButtonAction: ButtonAction };
        iconMapper: { [iconName: string]: IconProp };
    }
): ButtonWidgetConfig => {
    // TODO These should be some configuration receive here to fine-tune the section's content
    return {
        type: 'button',
        color: 'green',
        label: (t: TFunction) => t(['customSurvey:segments:SaveTripLabel', 'segments:SaveTripLabel']),
        hideWhenRefreshing: true,
        path: 'buttonSaveTrip',
        // FIXME This requires dependencies
        icon: options.iconMapper['check-circle'],
        align: 'center',
        action: options.buttonActions.validateButtonAction,
        saveCallback: (callbacks: InterviewUpdateCallbacks, interview: UserInterviewAttributes, path: string) => {
            // Set all segments' _isNew to false and select the next trip ID as the active one
            const updateValuesbyPath = {};
            const segmentsPath = getPath(path, '../segments') as string;
            const segments = getResponse(interview, segmentsPath, {}) as any;
            // set segments as not new:
            for (const segmentUuid in segments) {
                const segment = segments[segmentUuid];
                segment._isNew = false;
                const segmentPath = `${segmentsPath}.${segmentUuid}`;
                updateValuesbyPath[`responses.${segmentPath}._isNew`] = false;
            }
            const journey = odHelpers.getActiveJourney({ interview });
            const nextTrip = journey !== null ? odHelpers.selectNextIncompleteTrip({ journey }) : null;
            updateValuesbyPath['responses._activeTripId'] = nextTrip ? nextTrip._uuid : null;
            callbacks.startUpdateInterview('segments', updateValuesbyPath);
        },
        conditional: function (interview, path) {
            const segments = getResponse(interview, path, {}, '../segments') as { [segmentId: string]: Segment };
            const segmentsArray = Object.values(segments).sort((segmentA, segmentB) => {
                return segmentA['_sequence'] - segmentB['_sequence'];
            });
            const lastSegment = segmentsArray[segmentsArray.length - 1];
            return [lastSegment !== undefined && lastSegment.hasNextMode === false, undefined];
        }
    };
};
