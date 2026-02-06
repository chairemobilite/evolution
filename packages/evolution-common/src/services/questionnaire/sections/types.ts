/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { ButtonAction, SectionConfig, WidgetConfig } from '../types';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

/**
 * Interface for a factory that creates widget configurations. Builtin widgets
 * may choose to implement this interface, for example if they provide more than
 * one widget configuration, like a group widget with its child widgets.
 */
export interface WidgetConfigFactory {
    /**
     * Get a map of widget names to their builtin configurations, as they will
     * be used in the various sections.
     */
    getWidgetConfigs(): Record<string, WidgetConfig>;
}

/**
 * Interface for a factory that creates a section configurations. Builtin
 * sections can use a class that implements this interface to provide their
 * configuration and widgets.
 */
export interface SectionConfigFactory extends WidgetConfigFactory {
    /**
     * Get the configuration for the section.
     */
    getSectionConfig(): SectionConfig;
}

/**
 * Options that can be provided to widget factories to customize the created
 * widget configurations. Many widget will require some of these options that
 * will typically come from the frontend, but can be mocked in backend or tests.
 *
 * FIXME See if we can do without any of those
 */
export type WidgetFactoryOptions = {
    /**
     * A function to get the context. Used mostly for interviewers, to get CATI.
     *
     * FIXME When we revisit interviewer flow, it may not be necessary
     * (https://github.com/chairemobilite/evolution/issues/1362)
     *
     * @param context The context name
     * @returns The context string
     */
    context?: (context?: string) => string;
    /**
     * Formats a date string to a display string, in the appropriate format. The
     * frontend will provide this function.
     * @param date The date string to format
     * @returns The formatted date string
     */
    getFormattedDate: (date: string) => string;
    /**
     * Actions for buttons that may be used in widgets. These often contain
     * frontend code, so they can be mapped to each button action when creating
     * the survey.
     */
    buttonActions: {
        /**
         * When the button is clicked, this action will try to navigate to the
         * next section and submit the current one, or display the errors of the
         * current section if any.  This is the action to use for buttons that
         * complete a section.
         */
        validateButtonActionWithCompleteSection: ButtonAction;
        /**
         * When the button is clicked, this action will simply submit the
         * current data and call a callback provided by the widget. This is the
         * action to use for buttons that would not trigger section change, but
         * have actions, for example to complete a group and go to the next.
         */
        validateButtonAction: ButtonAction;
    };
    /**
     * Map an icon name to its FontAwesome icon definition.
     *
     * FIXME Can we do without the icon mapper here? we could use some other
     * type of manage icons differently.
     */
    iconMapper: { [iconName: string]: IconProp };
};
