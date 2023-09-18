/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { connect } from 'react-redux';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { WithTranslation, withTranslation } from 'react-i18next';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import FormErrors from 'chaire-lib-frontend/lib/components/pageParts/FormErrors';
import { addConsent } from '../../actions/Survey';

export type ConsentAndStartFormProps = {
    hasConsented: boolean;
    afterClicked: () => void;
    addConsent: (consented: boolean) => void;
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
            <label
                htmlFor="surveyConsent"
                onClick={() => {
                    onChange;
                    setUpdateKey(updateKey + 1);
                }}
            >
                <span>{props.text}</span>
            </label>
        </React.Fragment>
    );
};

const ConsentAndStartForm = (props: ConsentAndStartFormProps & WithTranslation) => {
    const [showError, setShowError] = React.useState(false);
    const color = config.startButtonColor ? config.startButtonColor : 'green';
    const agreementText = props.t(['survey:homepage:AgreementText', 'main:AgreementText']);
    React.useEffect(() => {
        if (_isBlank(agreementText)) {
            props.addConsent(true);
        }
    }, [agreementText]);
    const onButtonClicked = () => {
        if (!props.hasConsented) {
            setShowError(true);
        } else {
            props.afterClicked();
        }
    };
    const onAgreementChange = (hasAgreed) => {
        setShowError(false);
        props.addConsent(hasAgreed);
    };
    return (
        <div className="survey-section__button-agreement">
            {!_isBlank(agreementText) && (
                <AgreementCheckbox
                    isChecked={props.hasConsented === true}
                    text={agreementText}
                    onChange={onAgreementChange}
                />
            )}
            {showError && (
                <FormErrors
                    errors={[props.t(['survey:homepage:ErrorNotAgreed', 'main:ErrorNotAgreed'])]}
                    errorType="Error"
                />
            )}
            <div className="center">
                <button
                    type="button"
                    className={`survey-section__button button ${color} large`}
                    onClick={onButtonClicked}
                >
                    {props.t(['survey:homepage:start', 'auth:Start'])}
                </button>
            </div>
        </div>
    );
};

const mapStateToProps = (state) => ({
    hasConsented: !!state.survey.hasConsent
});

const mapDispatchToProps = (dispatch) => ({
    addConsent: (consented) => dispatch(addConsent(consented))
});

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(ConsentAndStartForm));
