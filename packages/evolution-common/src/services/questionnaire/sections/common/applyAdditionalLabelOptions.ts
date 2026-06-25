/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { TFunction } from 'i18next';
import type { TranslatableStringFunction, UserInterviewAttributes, WidgetConfig } from '../../types';
import type { AdditionalSectionLabelOptionFct } from '../../types';

const widgetI18nField = ['label', 'text'];

const getEnhancedI18nData =
    (
        originalData: TranslatableStringFunction,
        interpolationFunction: AdditionalSectionLabelOptionFct,
        widgetName: string
    ): TranslatableStringFunction =>
        (t: TFunction, interview: UserInterviewAttributes, path: string): string => {
        // Compute the additional options by running the
        // interpolation function
            const additionalOptions = interpolationFunction({
                interview,
                t,
                path
            });

            // Enhance the `t` function to add the additional options to the received options
            const enhancedT = ((...args: any[]) => {
            // No argument passed, this is not supported
                if (args.length === 0) {
                    console.warn('Trying to display a label/text without parameters for ', widgetName);
                    return (t as any)();
                }
                // More than 2 arguments or second argument is a default value string, not supported
                if (args.length > 2 || typeof args[1] === 'string') {
                    console.warn(
                        '`t` function call with default value not supported for label/text with additional options, only calls with key and options as second arguments are supported for widget ',
                        widgetName
                    );
                    return (t as any)(...args);
                }
                const [key, options] = args;
                // Call the original `t` function with additional options passed
                return (t as any)(key, { ...(options || {}), ...additionalOptions });
            }) as TFunction;
            // Call the original label function with the enhanced `t` function that
            // will add the options
            return originalData(enhancedT, interview, path);
        };

/**
 * Internal build time function that changes the label function to add the
 * additional interpolation options to the label call.
 *
 * @param widgetConfigs The widget configs on which to applyt he additional
 * label options
 * @param additionalLabelOptionFunctions Object with the functions that will add
 * the interpolation keys to label. The key is the name of the widget and the
 * value is the function.
 * @param resolveContext A function that will resolve proper context to pass as
 * argument to the label option functions.
 * @returns The updated widget configs, with label functions enhanced to support
 * additional keys
 */
export const applySectionAdditionalLabelOptions = (
    widgetConfigs: Record<string, WidgetConfig>,
    additionalLabelOptionFunctions: { [widgetName: string]: AdditionalSectionLabelOptionFct } | undefined
): Record<string, WidgetConfig> => {
    // Return the widget configs if there are no functions available
    if (!additionalLabelOptionFunctions) {
        return widgetConfigs;
    }

    return Object.fromEntries(
        Object.entries(widgetConfigs).map(([widgetName, widgetConfig]) => {
            const interpolationFunction = additionalLabelOptionFunctions[widgetName];
            // If there is no interpolation function, return the original widget
            if (!interpolationFunction) {
                return [widgetName, widgetConfig];
            }

            let updatedWidgetConfig: WidgetConfig = widgetConfig;
            let hasChanged = false;
            for (const fieldName of widgetI18nField) {
                const originalField = (widgetConfig as any)[fieldName];
                // If the original label is not a function, do not change the
                // label
                if (typeof originalField === 'function') {
                    hasChanged = true;
                    updatedWidgetConfig = {
                        ...updatedWidgetConfig,
                        [fieldName]: getEnhancedI18nData(
                            originalField as TranslatableStringFunction,
                            interpolationFunction,
                            widgetName
                        )
                    };
                }
            }

            return hasChanged ? [widgetName, updatedWidgetConfig] : [widgetName, widgetConfig];
        })
    );
};
