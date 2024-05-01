/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { withTranslation, WithTranslation } from 'react-i18next';

export const SurveyErrorPage: React.FunctionComponent<WithTranslation> = (props: WithTranslation) => (
    <div className="survey" style={{ display: 'block' }} id="surveyErrorPage">
        <div className="apptr__form">
            <p className="_large _strong _blue">
                <div dangerouslySetInnerHTML={{ __html: props.t(['survey:AnErrorOccurred', 'AnErrorOccurred']) }} />
            </p>
        </div>
        <div className="apptr__separator"></div>
        <div className="apptr__form">
            <div
                dangerouslySetInnerHTML={{
                    __html: props.t(['survey:MakeSureReliableConnection', 'MakeSureReliableConnection'])
                }}
            />
        </div>
        <div className="apptr__separator"></div>
        <div className="apptr__form">
            <div
                dangerouslySetInnerHTML={{ __html: props.t(['survey:ErrorPersistsWhatToDo', 'ErrorPersistsWhatToDo']) }}
            />
        </div>
        <div className="apptr__separator"></div>
        <div className="apptr__form">
            <Link to="/survey">{props.t(['survey:BackToSurveyPage', 'BackToSurveyPage'])}</Link>
        </div>
    </div>
);

export default withTranslation(['main'])(SurveyErrorPage);
