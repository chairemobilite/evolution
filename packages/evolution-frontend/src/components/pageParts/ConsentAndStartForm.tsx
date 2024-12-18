/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { useTranslation } from 'react-i18next';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import FormErrors from 'chaire-lib-frontend/lib/components/pageParts/FormErrors';
import { addConsent } from '../../actions/Survey';
import { SurveyContext } from '../../contexts/SurveyContext';
import { ThunkDispatch } from 'redux-thunk';
import { RootState } from '../../store/configureStore';
import { Action } from 'redux';

export type ConsentAndStartFormProps = {
    afterClicked: () => void;
};

type AgreementCheckboxProps = {
    isChecked: boolean;
    text: string;
    onChange: (isChecked: boolean) => void;
};

const AgreementCheckbox = (props: AgreementCheckboxProps) => {
    const [checked, setChecked] = React.useState(props.isChecked);
    const [updateKey, setUpdateKey] = React.useState(0);
    const onChange = (_e) => {
        const newChecked = !checked;
        setChecked(newChecked);
        props.onChange(newChecked);
    };

    return (
        <React.Fragment>
            <input
                type="checkbox"
                id="surveyConsent"
                key={`surveyConsentIdx${updateKey}`}
                className={'_input-checkbox'}
                value="agree"
                checked={checked}
                onChange={onChange}
            />
            <label htmlFor="surveyConsent" onClick={() => setUpdateKey(updateKey + 1)}>
                <span>{props.text}</span>
            </label>
        </React.Fragment>
    );
};

const ConsentAndStartForm = (props: ConsentAndStartFormProps) => {
    const { t } = useTranslation();
    const [showError, setShowError] = React.useState(false);
    const { appContext } = React.useContext(SurveyContext);
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, Action>>();
    const hasConsented = useSelector((state: RootState) => !!state.survey.hasConsent);

    const color = config.startButtonColor ? config.startButtonColor : 'green';
    const agreementText = t(['survey:homepage:AgreementText', 'main:AgreementText'], { context: appContext });
    React.useEffect(() => {
        if (_isBlank(agreementText)) {
            dispatch(addConsent(true));
        }
    }, [agreementText]);
    const onButtonClicked = () => {
        if (!hasConsented) {
            setShowError(true);
        } else {
            props.afterClicked();
        }
    };
    const onAgreementChange = (hasAgreed) => {
        setShowError(false);
        dispatch(addConsent(hasAgreed));
    };
    return (
        <div className="survey-section__button-agreement">
            {!_isBlank(agreementText) && (
                <AgreementCheckbox
                    isChecked={hasConsented === true}
                    text={agreementText}
                    onChange={onAgreementChange}
                />
            )}
            {showError && (
                <FormErrors
                    errors={[t(['survey:homepage:ErrorNotAgreed', 'main:ErrorNotAgreed'], { context: appContext })]}
                    errorType="Error"
                />
            )}
            <div className="center">
                <button
                    type="button"
                    className={`survey-section__button button ${color} large`}
                    onClick={onButtonClicked}
                >
                    {t(['survey:homepage:start', 'auth:Start'], { context: appContext })}
                </button>
            </div>
        </div>
    );
};

export default ConsentAndStartForm;
