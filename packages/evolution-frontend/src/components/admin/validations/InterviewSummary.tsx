/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import ValidationOnePageSummary from './ValidationOnePageSummary';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import {
    startSetValidateInterview,
    startUpdateSurveyValidateInterview,
    startResetValidateInterview
} from '../../../actions/SurveyAdmin';
import ValidationLinks from './ValidationLinks';
import AdminErrorBoundary from '../hoc/AdminErrorBoundary';
import FormErrors from 'chaire-lib-frontend/lib/components/pageParts/FormErrors';
import { RootState } from '../../../store/configureStore';
import { ThunkDispatch } from 'redux-thunk';
import { SurveyAction } from '../../../store/survey';

type InterviewSummaryProps = {
    prevInterviewUuid?: string;
    nextInterviewUuid?: string;
    handleInterviewSummaryChange: (uuid: string | null) => void;
};

const InterviewSummary = (props: InterviewSummaryProps) => {
    const { t } = useTranslation();
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, SurveyAction>>();
    const interview = useSelector((state: RootState) => state.survey.interview);
    const user = useSelector((state: RootState) => state.auth.user);
    const validationDataDirty = interview?.validationDataDirty;

    const refreshInterview = useCallback(() => {
        dispatch(startSetValidateInterview(interview.uuid));
    }, [dispatch, interview.uuid]);

    const resetInterview = useCallback(() => {
        dispatch(startResetValidateInterview(interview.uuid));
    }, [dispatch, interview.uuid]);

    const updateValuesByPath = useCallback(
        (valuesByPath, e) => {
            if (e && e.preventDefault) {
                e.preventDefault();
            }
            dispatch(
                startUpdateSurveyValidateInterview('validationOnePager', valuesByPath, undefined, undefined, () => {
                    /* nothing to do */
                })
            );
        },
        [dispatch]
    );

    if (!interview) {
        surveyHelperNew.devLog('%c rendering empty survey', 'background: rgba(0,0,0,0.1);');
        return (
            <div className="admin-widget-container">
                <LoadingPage />
            </div>
        );
    }

    return (
        <div className="admin-widget-container">
            <div className="survey validation">
                <div className="admin__stats-container">
                    <ValidationLinks
                        handleInterviewSummaryChange={props.handleInterviewSummaryChange}
                        updateValuesByPath={updateValuesByPath}
                        interviewIsValid={interview.is_valid}
                        interviewIsQuestionable={interview.is_questionable}
                        interviewIsComplete={interview.is_completed}
                        interviewIsValidated={interview.is_validated}
                        interviewUuid={interview.uuid}
                        prevInterviewUuid={props.prevInterviewUuid}
                        nextInterviewUuid={props.nextInterviewUuid}
                        refreshInterview={refreshInterview}
                        resetInterview={resetInterview}
                        user={user}
                        t={t}
                    />
                    {validationDataDirty && (
                        <FormErrors errors={[t(['admin:ValidationDataDirty'])]} errorType="Warning" />
                    )}
                </div>
                <AdminErrorBoundary>
                    <ValidationOnePageSummary key={interview.uuid} />
                </AdminErrorBoundary>
            </div>
        </div>
    );
};

export default InterviewSummary;
