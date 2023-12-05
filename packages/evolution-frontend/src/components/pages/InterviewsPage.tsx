/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { Link, RouteComponentProps } from 'react-router-dom';
import InterviewsCreateLink from '../pageParts/interviews/InterviewsCreateLink';

export const InterviewsPage: React.FunctionComponent<WithTranslation & RouteComponentProps> = (
    props: WithTranslation & RouteComponentProps
) => {
    const urlSearch = new URLSearchParams(props.location.search);
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
