/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { GroupConfig, SegmentSectionConfiguration, WidgetConfig } from '../../../questionnaire/types';
import { getResponse } from '../../../../utils/helpers';
import type { TFunction } from 'i18next';
import type { Segment } from '../../types';
import type { WidgetConfigFactory, WidgetFactoryOptions } from '../types';
import { getSameAsReverseTripWidgetConfig } from './widgetSameAsReverseTrip';
import { getModePreWidgetConfig } from './widgetSegmentModePre';
import { getModeWidgetConfig } from './widgetSegmentMode';
import { getSegmentHasNextModeWidgetConfig } from './widgetSegmentHasNextMode';
import { getSegmentDriverWidgetConfig } from './widgetDriver';

export class SegmentsGroupConfigFactory implements WidgetConfigFactory {
    constructor(
        private sectionConfig: SegmentSectionConfiguration,
        private options: WidgetFactoryOptions
    ) {
        /** Nothing to do */
    }

    private getGroupWidgetNames = (): string[] => {
        const additionalWidgetNames = this.sectionConfig.additionalSegmentWidgetNames || [];
        const optionalWidgetNames = Object.keys(this.getOptionalWidgetConfigs());
        const segmentGroupWidgetNames = [
            // Hard-coded, mandatory questions
            'segmentSameModeAsReverseTrip',
            'segmentModePre',
            'segmentMode',
            // Optional questions based on configuration
            ...optionalWidgetNames,
            // Additional custom widgets are added here
            ...additionalWidgetNames,
            'segmentHasNextMode'
        ];
        return Array.from(new Set(segmentGroupWidgetNames));
    };

    private getSegmentsGroupConfig = (): GroupConfig => {
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
            widgets: this.getGroupWidgetNames()
        };
    };

    getDefaultWidgetConfigs = (): Record<string, WidgetConfig> => ({
        segments: this.getSegmentsGroupConfig(),
        segmentSameModeAsReverseTrip: getSameAsReverseTripWidgetConfig(this.options),
        segmentModePre: getModePreWidgetConfig(this.sectionConfig, this.options),
        segmentMode: getModeWidgetConfig(this.sectionConfig, this.options),
        segmentHasNextMode: getSegmentHasNextModeWidgetConfig(this.options)
    });

    getOptionalWidgetConfigs(): Record<string, WidgetConfig> {
        const additionalWidgets = {};
        if (this.sectionConfig.askSegmentDriver) {
            additionalWidgets['segmentDriver'] = getSegmentDriverWidgetConfig(this.sectionConfig, this.options);
        }
        return additionalWidgets;
    }

    getWidgetConfigs = (): Record<string, WidgetConfig> =>
        Object.assign({}, this.getDefaultWidgetConfigs(), this.getOptionalWidgetConfigs());
}
