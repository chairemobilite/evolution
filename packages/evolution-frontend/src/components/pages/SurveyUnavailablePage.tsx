/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

// This page is shown when a survey participant tries to access a survey that is no longer available (frozen by an admin)
export const SurveyUnavailablePage: React.FunctionComponent = () => {
    const { t } = useTranslation(['main']);

    return (
        <div className="survey" id="surveyUnavailablePage">
            <div className="apptr__form">
                <div className="survey-page-container">
                    <h2 className="survey-page-title">{t('main:SurveyUnavailableTitle')}</h2>
                    <p>{t('main:SurveyUnavailableDefaultReason')}</p>
                    <img
                        src="dist/images/page_images/undraw_access-denied_krem.svg"
                        alt={t('main:SurveyUnavailableTitle')}
                        className="survey-page-image"
                    />
                </div>
            </div>
        </div>
    );
};

export default SurveyUnavailablePage;
