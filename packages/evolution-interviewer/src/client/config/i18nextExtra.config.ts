/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
/** This file adds functions to get additional contexts for i18next translate
 * function. This context comes from the interviewMode preference, which can be
 * either an interviewer or participant mode */
import Preferences from 'chaire-lib-common/lib/config/Preferences';
import i18n from 'evolution-frontend/lib/config/i18n.config';

const getContextParticipant = (context?: string) => context;
const getContextInterviewer = (context?: string) => (context === undefined ? 'cati' : `cati_${context}`);

export const setCurrentI18nFunction = (mode: 'participant' | 'interviewer') =>
    (currentContextFct = mode === 'interviewer' ? getContextInterviewer : getContextParticipant);

let currentContextFct =
    Preferences.get('interviewMode', 'participant') === 'interviewer' ? getContextInterviewer : getContextParticipant;
Preferences.addChangeListener((updatedPrefs) => {
    if (updatedPrefs.interviewMode !== undefined) {
        setCurrentI18nFunction(updatedPrefs.interviewMode);
        // force a reload of the translations
        i18n.changeLanguage(i18n.language);
    }
});

export const getI18nContext = (context?: string) => currentContextFct(context);
