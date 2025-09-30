/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';

export const SurveyFrozenPage: React.FunctionComponent<WithTranslation> = (props) => (
    <div className="survey" id="surveyFrozenPage">
        <div className="apptr__form">
            <div className="survey-frozen-container">
                <h2 className='survey-frozen-title'>{props.t('main:SurveyFrozenTitle')}</h2>
                <p>{props.t('main:SurveyFrozenDefaultReason')}</p>
                <img
                    src="dist/images/page_images/undraw_access-denied_krem.svg"
                    alt={props.t('main:SurveyFrozenTitle')}
                    className="survey-frozen-image"
                />
            </div>
        </div>
    </div>
);

export default withTranslation(['main'])(SurveyFrozenPage);
