/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import InterviewsCreateLink from '../interviews/InterviewsCreateLink';

export const InterviewsPage: React.FunctionComponent<WithTranslation> = (props: WithTranslation) => {
    const location = useLocation();
    const urlSearch = new URLSearchParams(location.search);
    return (
        <div className="admin">
            <div className="survey-section__content apptr__form-container">
                <h1>{props.t('admin:interviewers:InterviewsSearchAndEdit')}</h1>
                <Link to={'/interviews/byCode'}>{props.t('admin:interviewSearch:SearchByCode')}</Link>
                <InterviewsCreateLink queryData={urlSearch} />
            </div>
        </div>
    );
};

export default withTranslation(['admin'])(InterviewsPage);
