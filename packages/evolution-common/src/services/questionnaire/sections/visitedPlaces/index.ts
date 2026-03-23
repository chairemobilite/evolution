/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { VisitedPlacesSectionConfiguration, WidgetConfig } from '../../types';
import type { WidgetConfigFactory, WidgetFactoryOptions } from '../types';
import { getActivityWidgetConfig } from './widgetActivity';
import { getActivityCategoryWidgetConfig } from './widgetActivityCategory';

export class ActivityWidgetFactory implements WidgetConfigFactory {
    constructor(
        private sectionConfig: VisitedPlacesSectionConfiguration,
        private options: WidgetFactoryOptions
    ) {
        /** Nothing to do */
    }

    getWidgetConfigs = (): Record<string, WidgetConfig> => {
        // TODO Consider skipping the activityCategory widget if the number of
        // activities in the filter is low (for stripped down versions of
        // location activities for example). This would require updating the
        // activity conditionals that currently depend on the category
        return {
            activityCategory: getActivityCategoryWidgetConfig(this.sectionConfig, this.options),
            activity: getActivityWidgetConfig(this.sectionConfig, this.options)
        };
    };
}
