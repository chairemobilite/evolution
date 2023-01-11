/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export const InterviewsPage: React.FunctionComponent<WithTranslation> = (props: WithTranslation) => (
    <div className="admin">
        {props.t('admin:interviewers:InterviewersPage')} -{' '}
        <Link to={'/interviews/byCode'}>{props.t('admin:interviewSearch:SearchByCode')}</Link>
    </div>
);

export default withTranslation(['admin'])(InterviewsPage);
