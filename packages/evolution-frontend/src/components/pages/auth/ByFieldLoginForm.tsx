/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
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

type ByFieldLoginFormProps = {
    headerText?: string;
    buttonText?: string;
};

const ByFieldLoginForm: React.FC<ByFieldLoginFormProps> = ({ headerText, buttonText }) => {
    const { t } = useTranslation(['auth', 'survey']);
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
        // FIXME The format is also checked in the backend, ideally the backend
        // should be the only place that checks and the frontend receives the
        // error message, but we currently have no way to pass message between
        // backend and frontend during authentication.
        const accessCodeRegex = /^\d{4}-\d{4}$/;
        if (!accessCodeRegex.test(accessCode)) {
            return 'auth:InvalidAccessCodeFormat';
        }
        return undefined;
    };

    // Validate postal code and return error message if invalid
    const validatePostalCode = (postalCode: string): string | undefined => {
        if (!postalCode) {
            return 'auth:MissingPostalCode';
        }
        // FIXME The format is also checked in the backend, ideally the backend
        // should be the only place that checks and the frontend receives the
        // error message, but we currently have no way to pass message between
        // backend and frontend during authentication.
        if (!/^[ghjk][0-9][abceghj-nprstv-z]( )?[0-9][abceghj-nprstv-z][0-9]\s*$/i.test(postalCode)) {
            return 'auth:InvalidPostalCodeFormat';
        }

        return undefined;
    };

    const handleAccessCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let accessCode = e.target.value;
        accessCode = accessCode.replace('_', '-'); // change _ to -
        accessCode = accessCode.replace(/[^-\d]/g, ''); // Remove everything but numbers and -
        // Get only the digits. If we have 8, we can automatically format the access code.
        const digits = accessCode.replace(/\D+/g, '');
        if (digits.length === 8) {
            accessCode = digits.slice(0, 4) + '-' + digits.slice(4);
        }
        // Prevent entering more than 9 characters (8 digit access code and a dash)
        accessCode = accessCode.slice(0, 9);
        setFormState((prev) => ({ ...prev, accessCode }));
    };

    const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const postalCode = e.target.value.toUpperCase(); // Postal codes are typically uppercase
        setFormState((prev) => ({ ...prev, postalCode }));
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
