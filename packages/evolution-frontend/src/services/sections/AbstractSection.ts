/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { WidgetConfig } from "evolution-common/lib/services/widgets";

export interface ISurveySection {

    getWidgetConfigs: () => { [widgetName: string]: {
        sequence: number;
        config: WidgetConfig
    };};

}