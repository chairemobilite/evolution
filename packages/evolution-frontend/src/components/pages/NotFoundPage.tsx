/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

// This page is shown when a user navigates to a URL that doesn't exist
const NotFoundPage: React.FunctionComponent = () => {
    const { t } = useTranslation(['main']);

    return (
        <div className="survey" id="notFoundPage">
            <div className="apptr__form">
                <div className="survey-unavailable-container">
                    <h2 className="survey-unavailable-title">{t('main:NotFoundPageTitle')}</h2>
                    <p>{t('main:NotFoundPageMessage')}</p>
                    <img
                        src="dist/images/page_images/undraw_location-search_nesh.png"
                        alt={t('main:NotFoundPageTitle')}
                        className="survey-unavailable-image"
                    />
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
