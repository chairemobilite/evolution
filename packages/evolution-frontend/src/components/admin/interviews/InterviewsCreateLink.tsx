/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';
import InterviewsCreateNew from './InterviewsCreateNew';
import { InterviewContext } from '../../../contexts/InterviewContext';
import { URLSearchParams } from 'url';
import { INTERVIEWER_PARTICIPANT_PREFIX } from 'evolution-common/lib/services/interviews/interview';

type InterviewCreateLinkProps = {
    queryData: URLSearchParams;
};

const InterviewCreateLink: React.FunctionComponent<WithTranslation & InterviewCreateLinkProps> = (
    props: WithTranslation & InterviewCreateLinkProps
) => {
    const { state, dispatch } = React.useContext(InterviewContext);

    if (state.status !== 'creating') {
        return (
            <a
                href=""
                id={'interviewByResponseList_new'}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                    e.preventDefault();
                    dispatch({
                        type: 'createNew',
                        username: `${INTERVIEWER_PARTICIPANT_PREFIX}_${(Math.ceil(Math.random() * 8999) + 1000).toString()}`,
                        queryData: props.queryData
                    });
                }}
            >
                {props.t('admin:interviewSearch:CreateNew')}
            </a>
        );
    } else {
        return <InterviewsCreateNew />;
    }
};

/** Component used to add a link to create a new interview */
export default withTranslation(['admin', 'main'])(InterviewCreateLink);
