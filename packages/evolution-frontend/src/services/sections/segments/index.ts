/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SegmentSectionConfig } from "evolution-common/lib/services/sections/segmentSection";
import { ISurveySection } from "../AbstractSection";
import { getModePreWidgetConfig } from "./widgetSegmentModePre";

export class SegmentSection implements ISurveySection {
   
    constructor(private sectionConfig: SegmentSectionConfig) {

    }

    /**
     * Get the widget config for the segment group questions
     * 
     * @returns 
     */
    getWidgetConfigs = (/* TODO Add extra data, like the extra label context for interviewers */) => {

        // TODO Prepare the persons trips group widget

        // TODO Prepare the segments intro widget

        // TODO Prepare the segments group widget

        // Prepare the mode category selection widget
        const modePreWidget = getModePreWidgetConfig(this.sectionConfig);

        // Prepare the mode selection widget

        // TODO Prepare the question to ask if there is another mode

        // TODO Prepare the question to ask if the mode is the same as the reverse trip

        // TODO Prepare the trips save button widget
        
        return {
            // Example widget configuration
            /* widget1: {
                sequence: 1,
                config: {
                    // Widget configuration properties
                }
            }, */
        };
    };
}