/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';

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
            className={`
                ${props.interview.isValid === true && props.interview.isCompleted === true ? '_dark-green _strong' : ''}
                ${
        props.interview.isValidated === true &&
                    props.interview.isValid === true &&
                    props.interview.isCompleted === true
            ? '_green _strong _active-background'
            : ''
        }
                ${props.interview.isValid === true && props.interview.isCompleted === false ? '_orange _strong' : ''}
                ${props.interview.isValid === false ? '_dark-red _strong' : ''}
                `}
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
            •{' '}
            {props.interview.isValid === true
                ? props.t('admin:Valid')
                : props.interview.isValid === false
                    ? props.t('admin:Invalid')
                    : props.t('admin:UnknownValidity')}{' '}
            • {props.interview.home.address || props.t('admin:interviewSearch:UnknownAddress')},{' '}
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
