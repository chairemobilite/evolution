/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { ButtonWidgetConfig } from '../../../questionnaire/types';
import { getPath, getResponse } from '../../../../utils/helpers';
import * as odHelpers from '../../../odSurvey/helpers';
import { TFunction } from 'i18next';
import { InterviewUpdateCallbacks, Segment, UserInterviewAttributes } from '../../types';
import { WidgetFactoryOptions } from '../types';
import { getValuesByPathForActiveTrip } from './helpers';

export const getButtonSaveTripSegmentsConfig = (options: WidgetFactoryOptions): ButtonWidgetConfig => {
    return {
        type: 'button',
        color: 'green',
        label: (t: TFunction) => t('segments:buttonSaveTrip'),
        hideWhenRefreshing: true,
        path: 'buttonSaveTrip',
        // FIXME This requires dependencies
        icon: options.iconMapper['check-circle'],
        align: 'center',
        action: options.buttonActions.validateButtonAction,
        saveCallback: (callbacks: InterviewUpdateCallbacks, interview: UserInterviewAttributes, path: string) => {
            const journeyContext = odHelpers.getJourneyContextFromPath({ interview, path });
            if (journeyContext === null) {
                throw new Error(
                    'buttonSaveTripSegments: saveCallback function: journey context not found for path ' + path
                );
            }
            // Set all segments' _isNew to false and select the next trip ID as the active one
            const updateValuesbyPath = {};
            const segmentsPath = getPath(path, '../segments') as string;
            const segments = getResponse(interview, segmentsPath, {}) as any;
            // set segments as not new:
            for (const segmentUuid in segments) {
                const segment = segments[segmentUuid];
                segment._isNew = false;
                const segmentPath = `${segmentsPath}.${segmentUuid}`;
                updateValuesbyPath[`response.${segmentPath}._isNew`] = false;
            }
            const activeJourney = odHelpers.getActiveJourney({ interview });
            // Select next active trip if journey is the active one
            const nextTrip =
                journeyContext.journey._uuid === activeJourney?._uuid
                    ? odHelpers.selectNextIncompleteTrip({ journey: journeyContext.journey })
                    : null;
            if (nextTrip !== null) {
                Object.assign(
                    updateValuesbyPath,
                    getValuesByPathForActiveTrip({
                        interview,
                        person: journeyContext.person,
                        journey: journeyContext.journey,
                        trip: nextTrip
                    })
                );
            } else {
                updateValuesbyPath['response._activeTripId'] = null;
            }
            callbacks.startUpdateInterview({ sectionShortname: 'segments', valuesByPath: updateValuesbyPath });
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
