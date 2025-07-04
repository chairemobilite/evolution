/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router';
import { ThunkDispatch } from 'redux-thunk';
import { Action } from 'redux';

import FormErrors from 'chaire-lib-frontend/lib/components/pageParts/FormErrors';
import { startByFieldLogin } from '../../../actions/Auth';
import Button from 'chaire-lib-frontend/lib/components/input/Button';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { RootState } from 'chaire-lib-frontend/lib/store/configureStore';
import { InterviewContext } from '../../../contexts/InterviewContext';
import CaptchaComponent from 'chaire-lib-frontend/lib/components/captcha/CaptchaComponent';
import { SurveyContext } from '../../../contexts/SurveyContext';
import { ValidationFunction } from 'evolution-common/lib/services/questionnaire/types';
import { translateString } from 'evolution-common/lib/utils/helpers';

type ByFieldLoginFormProps = {
    headerText?: string;
    buttonText?: string;
    accessCodeField?: string;
    postalCodeField?: string;
};

// This function validates a value using the provided validation function. The
// function comes from the survey widget and, as such, depends on an interview
// value, which we don't have now. But the fields used for login should be
// simple fields whose validations do not depend on other answers. If that is
// not the case, then the field should not be used for login, but we have no way
// of knowing except catching the error.
const validateValueFromInterview = (validations: ValidationFunction, value: string, i18n) => {
    try {
        const validationResult = validations(value, undefined, {} as any, '');
        const resultWithError = validationResult.find((result) => result.validation === true);
        if (resultWithError) {
            return translateString(resultWithError.errorMessage, i18n, {} as any, '');
        }
        return undefined;
    } catch (error) {
        console.error('Error validating value from interview:', error);
        // Return `undefined` in this case, as there is an exception in the
        // validation function and we don't want to block login.
        return undefined;
    }
};

const ByFieldLoginForm: React.FC<ByFieldLoginFormProps> = ({
    headerText,
    buttonText,
    accessCodeField = 'accessCode',
    postalCodeField = 'postalCode'
}) => {
    const { t, i18n } = useTranslation(['auth', 'survey']);
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, Action>>();
    const submitButtonRef = React.useRef<HTMLButtonElement>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { dispatch: interviewDispatch } = React.useContext(InterviewContext);
    const [{ isCaptchaValid, captchaToken }, setCaptchaResult] = React.useState<{
        isCaptchaValid: boolean;
        captchaToken: unknown;
    }>({ isCaptchaValid: false, captchaToken: null });

    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
    const login = useSelector((state: RootState) => state.auth.login);
    const { widgets } = useContext(SurveyContext);

    // Get the access code and postal code formatters from the widgets configuration
    const formatAccessCode = React.useMemo(() => widgets[accessCodeField]?.inputFilter, [widgets]);
    const formatPostalCode = React.useMemo(() => widgets[postalCodeField]?.inputFilter, [widgets]);
    const accessCodeValidations: ValidationFunction | undefined = React.useMemo(
        () => widgets[accessCodeField]?.validations,
        [widgets]
    );
    const postalCodeValidations: ValidationFunction | undefined = React.useMemo(
        () => widgets[postalCodeField]?.validations,
        [widgets]
    );

    const [formState, setFormState] = React.useState({
        accessCode: '',
        postalCode: '',
        error: undefined as string | undefined,
        confirmCredentials: undefined as boolean | undefined
    });

    // Validate access code and return error message if invalid
    const validateAccessCode = (accessCode: string): string | undefined => {
        if (!accessCode) {
            return 'auth:MissingAccessCode';
        }
        return accessCodeValidations ? validateValueFromInterview(accessCodeValidations, accessCode, i18n) : undefined;
    };

    // Validate postal code and return error message if invalid
    const validatePostalCode = (postalCode: string): string | undefined => {
        if (!postalCode) {
            return 'auth:MissingPostalCode';
        }
        return postalCodeValidations ? validateValueFromInterview(postalCodeValidations, postalCode, i18n) : undefined;
    };

    const handleAccessCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const accessCode = e.target.value;
        const formattedAccessCode = formatAccessCode ? formatAccessCode(accessCode) : accessCode;
        setFormState((prev) => ({ ...prev, accessCode: formattedAccessCode }));
    };

    const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const postalCode = e.target.value;
        const formattedPostalCode = formatPostalCode ? formatPostalCode(postalCode) : postalCode;
        setFormState((prev) => ({ ...prev, postalCode: formattedPostalCode }));
    };

    const handleSubmit = () => {
        // Validate both fields
        const accessCodeError = validateAccessCode(formState.accessCode);
        const postalCodeError = validatePostalCode(formState.postalCode);

        if (accessCodeError) {
            setFormState((prev) => ({ ...prev, error: accessCodeError }));
            return;
        }

        if (postalCodeError) {
            setFormState((prev) => ({ ...prev, error: postalCodeError }));
            return;
        }

        if (hasInvalidCredentials && !isCaptchaValid) {
            setFormState((prev) => ({ ...prev, error: 'auth:captchaRequired' }));
            return;
        }

        // Pass the access code to the interview context
        interviewDispatch({ type: 'enter', queryData: new URLSearchParams(`?accessCode=${formState.accessCode}`) });

        // Clear any errors and submit the form
        setFormState((prev) => ({ ...prev, error: undefined }));
        dispatch(
            startByFieldLogin(
                {
                    accessCode: formState.accessCode,
                    postalCode: formState.postalCode,
                    confirmCredentials: formState.confirmCredentials,
                    captchaToken: captchaToken
                },
                location,
                navigate
            )
        );
    };

    const handleKeyUp = (e: React.KeyboardEvent) => {
        // Submit form on 'Enter' key
        if (e.key === 'Enter') {
            submitButtonRef.current?.click();
        }
    };

    const hasInvalidCredentials = login && !isAuthenticated;

    return (
        <form className="apptr__form apptr__form-auth" onSubmit={(e) => e.preventDefault()}>
            <div className="apptr__form-label-container">
                <div className="apptr__form__label-standalone no-question">
                    <p>{headerText}</p>
                </div>
                {formState.error && <FormErrors errors={[formState.error]} />}
            </div>

            <div className="apptr__form-container question-empty">
                <div className="apptr__form-input-container">
                    <label htmlFor="accessCode" className="_flex">
                        {t('auth:AccessCode')}
                    </label>
                    <input
                        name="accessCode"
                        id="accessCode"
                        type="text"
                        placeholder={t('auth:AccessCodePlaceholder')}
                        className="apptr__form-input apptr__form-input-string apptr__input apptr__input-string"
                        value={formState.accessCode}
                        onChange={handleAccessCodeChange}
                        onKeyUp={handleKeyUp}
                        autoComplete="off"
                    />
                </div>

                {/* Spacer for extra vertical spacing between inputs */}
                <div style={{ marginBottom: '20px' }} className="apptr__form-input-container"></div>

                <div className="apptr__form-input-container">
                    <label htmlFor="postalCode" className="_flex">
                        {t('auth:PostalCode')}
                    </label>
                    <input
                        name="postalCode"
                        id="postalCode"
                        type="text"
                        placeholder={t('auth:PostalCodePlaceholder')}
                        className="apptr__form-input apptr__form-input-string apptr__input apptr__input-string"
                        value={formState.postalCode}
                        onChange={handlePostalCodeChange}
                        onKeyUp={handleKeyUp}
                        autoComplete="postal-code"
                    />
                </div>
                {hasInvalidCredentials && (
                    <div className="apptr__form-input-container">
                        <label htmlFor="confirmCredentials" className="_flex">
                            <input
                                type="checkbox"
                                id="confirmCredentials"
                                name="confirmCredentials"
                                onChange={(e) =>
                                    setFormState((prev) => ({ ...prev, confirmCredentials: e.target.checked }))
                                }
                            />
                            {t('auth:ConfirmCredentials')}
                        </label>
                        <CaptchaComponent
                            onCaptchaValid={(isValid, captchaToken) => {
                                setCaptchaResult({ isCaptchaValid: isValid, captchaToken });
                            }}
                        />
                    </div>
                )}
            </div>

            <Button
                type="submit"
                isVisible={true}
                onClick={handleSubmit}
                inputRef={submitButtonRef as React.RefObject<HTMLButtonElement>}
                label={!_isBlank(buttonText) ? buttonText : t('auth:Login')}
            />
        </form>
    );
};

export default ByFieldLoginForm;
