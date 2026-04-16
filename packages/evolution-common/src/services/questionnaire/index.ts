/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SegmentsSectionFactory } from './sections/segments/sectionSegments';
import type { WidgetFactoryOptions } from './sections/types';
import { VisitedPlacesSectionFactory } from './sections/visitedPlaces/sectionVisitedPlaces';
import type { QuestionnaireConfiguration, SurveySectionsConfig, WidgetConfig } from './types';

type SectionsAndWidgetConfigs = {
    surveySections: SurveySectionsConfig;
    widgetsConfig: Record<string, WidgetConfig>;
};

export class QuestionnaireFactory {
    constructor(
        private questionnaireConfig: QuestionnaireConfiguration,
        private options: WidgetFactoryOptions
    ) {
        /* Nothing to do */
    }

    private buildTripDiarySectionsAndWidgets = (
        tripDiaryConfig: Exclude<QuestionnaireConfiguration['tripDiary'], undefined>
    ): SectionsAndWidgetConfigs => {
        const sections: SurveySectionsConfig = {};
        const widgets: Record<string, WidgetConfig> = {};

        if (tripDiaryConfig.sections) {
            // Add the visited places section and widgets if the section is configured
            if (tripDiaryConfig.sections.visitedPlaces && tripDiaryConfig.sections.visitedPlaces.enabled) {
                // Build the visited places section and its widgets
                const visitedPlacesSectionFactory = new VisitedPlacesSectionFactory(
                    tripDiaryConfig.sections.visitedPlaces,
                    this.options
                );
                const visitedPlacesSectionConfig = visitedPlacesSectionFactory.getSectionConfig();
                sections['visitedPlaces'] = visitedPlacesSectionConfig;
                Object.assign(widgets, visitedPlacesSectionFactory.getWidgetConfigs());
            }
            // Add the segments section and widgets if the section is configured
            if (tripDiaryConfig.sections.segments && tripDiaryConfig.sections.segments.enabled) {
                // Build the segments section and its widgets
                const segmentSectionFactory = new SegmentsSectionFactory(
                    tripDiaryConfig.sections.segments,
                    this.options
                );
                const segmentSectionConfig = segmentSectionFactory.getSectionConfig();
                sections['segments'] = segmentSectionConfig;
                Object.assign(widgets, segmentSectionFactory.getWidgetConfigs());
            }
        }

        return { surveySections: sections, widgetsConfig: widgets };
    };

    buildSectionsAndWidgets = (): SectionsAndWidgetConfigs => {
        const sections: SurveySectionsConfig = {};
        const widgets: Record<string, WidgetConfig> = {};

        if (this.questionnaireConfig.tripDiary) {
            const tripDiaryConfig = this.questionnaireConfig.tripDiary;

            if (tripDiaryConfig.sections) {
                const { surveySections, widgetsConfig } = this.buildTripDiarySectionsAndWidgets(tripDiaryConfig);
                Object.assign(sections, surveySections);
                Object.assign(widgets, widgetsConfig);
            }
        }
        return { surveySections: sections, widgetsConfig: widgets };
    };
}
