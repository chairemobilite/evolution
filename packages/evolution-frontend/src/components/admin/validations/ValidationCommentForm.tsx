/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import InputText from 'chaire-lib-frontend/lib/components/input/InputText';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { useDispatch } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { SurveyAction } from '../../../store/survey';
import { RootState } from '../../../store/configureStore';
import { startUpdateSurveyCorrectedInterview } from '../../../actions/SurveyAdmin';

interface ValidationCommentFormProps {
    interview: UserInterviewAttributes;
}

const ValidationCommentForm = ({ interview }: ValidationCommentFormProps) => {
    const { t } = useTranslation('admin');
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, SurveyAction>>();

    const onValueChange = (e) => {
        if (e && e.stopPropagation) {
            e.stopPropagation();
        }

        const valuesByPath = {
            'response._validationComment': e.target.value
        };
        dispatch(
            startUpdateSurveyCorrectedInterview({ valuesByPath }, () => {
                /* parameter required, but nothing to do */
            })
        );
    };

    return (
        <React.Fragment>
            <label htmlFor={'surveyValidationComment'}>{t('admin:validatorComment')}</label>
            <br />
            <InputText
                id={'surveyValidationComment'}
                value={interview.response._validationComment}
                onValueChange={onValueChange}
            />
        </React.Fragment>
    );
};

export default ValidationCommentForm;
