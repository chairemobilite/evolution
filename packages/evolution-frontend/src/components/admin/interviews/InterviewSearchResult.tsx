/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';

import { getInterviewSearchResultClassName } from '../../../services/admin/reviewDecisionStatusHelper';

interface InterviewProps extends WithTranslation {
    interview: { [key: string]: any };
    key: string;
}

const InterviewSearchResult: React.FunctionComponent<InterviewProps> = (props: InterviewProps) => {
    const interviewUrl = `/survey/edit/${props.interview.uuid}/`;
    return (
        <li
            title={props.interview.uuid}
            key={props.key}
            className={getInterviewSearchResultClassName({
                reviewStatus: props.interview.reviewStatus,
                isCompleted: props.interview.isCompleted
            })}
        >
            {props.t('admin:interviewSearch:InterviewUser')}
            {': '}
            {props.interview.email ||
                props.interview.username ||
                (props.interview.facebook
                    ? props.t('admin:interviewSearch:FromFacebook')
                    : props.interview.google
                        ? props.t('admin:interviewSearch:FromGoogle')
                        : props.t('admin:interviewSearch:UnknownUser'))}{' '}
            •{' '}
            {props.interview.isCompleted === true
                ? props.t('admin:CompletedFemSingular')
                : props.interview.isCompleted === false
                    ? props.t('admin:NotCompletedFemSingular')
                    : props.t('admin:UnknownCompletionFemSingular')}{' '}
            • {props.t(`admin:reviewStatus:${props.interview.reviewStatus}`)} •{' '}
            {props.interview.home.address || props.t('admin:interviewSearch:UnknownAddress')},{' '}
            {props.interview.home.city || ''} •{' '}
            <a
                href={interviewUrl}
                id={`interviewButtonList_${props.interview.uuid}`}
                data-uuid={props.interview.uuid}
                target="_blank"
                rel="noreferrer"
            >
                {props.t('admin:interviewSearch:Open')}
            </a>
        </li>
    );
};

export default withTranslation(['admin', 'main'])(InterviewSearchResult);
