/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { ButtonWidgetConfig } from '../../../questionnaire/types';
import { TFunction } from 'i18next';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { ButtonAction } from '../../types';

/**
 * Get the configuration for a button that will call the `validateButtonAction`
 * provided in the options when clicked.
 *
 * @param translatableLabel The text to use for this button. It should be a
 * translatable string key, automatically, its custom version in the
 * customSurvey namespace will be added to the call
 * @param options
 * @returns
 */
export const getButtonValidateAndGotoNextSection = (
    translatableLabel: string,
    // FIXME: Type this when there is a few more widgets implemented
    options: {
        context?: () => string;
        buttonActions: { validateButtonAction: ButtonAction };
        iconMapper: { [iconName: string]: IconProp };
    }
): ButtonWidgetConfig => {
    return {
        type: 'button',
        // FIXME Is the path important for a button? Should it be configurable, like the text?
        path: 'buttonValidateGotoNextSection',
        color: 'green',
        label: (t: TFunction) => t([`customSurvey:${translatableLabel}`, translatableLabel]),
        hideWhenRefreshing: true,
        icon: options.iconMapper['check-circle'],
        align: 'center',
        action: options.buttonActions.validateButtonAction
    };
};
