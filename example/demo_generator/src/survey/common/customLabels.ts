/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { type TFunction } from 'i18next';
import { type I18nData } from 'evolution-common/lib/services/questionnaire/types/Data';
import * as odSurveyHelpers from 'evolution-common/lib/services/odSurvey/helpers';

// This is a custom label for the personSchoolType widget.
export const personSchoolTypeCustomLabels: I18nData = (t: TFunction, interview, path) => {
    const activePerson = odSurveyHelpers.getPerson({ interview, path });
    const activePersonAge = activePerson?.age;

    // Log a warning if the active person age is invalid.
    if (activePersonAge === undefined || activePersonAge === null || typeof activePersonAge !== 'number' || !Number.isFinite(activePersonAge)) {
        console.log('The active person age is invalid, it is undefined, null, not a number, or not finite');
    }

    if (activePersonAge < 5) {
        // For children under 5, we use the young child type.
        return t('household:personSchoolTypeYoungChild');
    } else {
        // For children 5 and older, we use the older person type.
        return t('household:personSchoolTypeOlderPerson');
    }
};
