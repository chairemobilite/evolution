/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { GroupConfig, SegmentSectionConfiguration, WidgetConfig } from '../../../questionnaire/types';
import { getResponse } from '../../../../utils/helpers';
import { TFunction } from 'i18next';
import { WidgetConfigFactory, WidgetFactoryOptions } from '../types';
import { getButtonSaveTripSegmentsConfig } from './buttonSaveTripSegments';
import { getTripSegmentsIntro } from './widgetTripSegmentsIntro';
import { SegmentsGroupConfigFactory } from './groupSegments';

export class PersonTripsGroupConfigFactory implements WidgetConfigFactory {
    constructor(
        private sectionConfig: SegmentSectionConfiguration,
        private options: WidgetFactoryOptions
    ) {
        /** Nothing to do */
    }

    private getGroupWidgetNames = (): string[] => {
        const additionalWidgetNames = this.sectionConfig.additionalTripsWidgetNames || [];
        const personTripsWidgetNames = [
            // Hard-coded, mandatory questions
            'segmentIntro',
            'segments',
            // Add custom widgets before save button
            ...additionalWidgetNames,
            'buttonSaveTrip'
        ];
        return Array.from(new Set(personTripsWidgetNames));
    };

    private getTripsGroupConfig = (): GroupConfig => {
        return {
            type: 'group',
            // FIXME Why do we have the full path here, but a relative path in the segments group? This should be consistent, but it's probably how evolution is structured
            path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.trips',
            title: (t: TFunction) => t(['customSurvey:segments:TripsTitle', 'segments:TripsTitle']),
            filter: function (interview, groupedObjects) {
                // Only the active trip should be shown with its widgets, if no active trip, return an empty object
                const activeTripId = getResponse(interview, '_activeTripId', null);
                if (typeof activeTripId === 'string' && groupedObjects[activeTripId]) {
                    return { [activeTripId]: groupedObjects[activeTripId] };
                }
                return {};
            },
            showTitle: false,
            showGroupedObjectDeleteButton: false,
            showGroupedObjectAddButton: false,
            widgets: this.getGroupWidgetNames()
        };
    };

    getWidgetConfigs = (): Record<string, WidgetConfig> => {
        const segmentGroupConfig = new SegmentsGroupConfigFactory(this.sectionConfig, this.options);
        return {
            personTrips: this.getTripsGroupConfig(),
            segmentIntro: getTripSegmentsIntro(this.options),
            ...segmentGroupConfig.getWidgetConfigs(),
            buttonSaveTrip: getButtonSaveTripSegmentsConfig(this.options)
        };
    };
}
