/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CaptchaComponent from 'chaire-lib-frontend/lib/components/captcha/CaptchaComponent';

interface SupportFormData {
    email: string;
    message: string;
    currentUrl?: string;
}

const SupportForm: React.FC = () => {
    const { t } = useTranslation(['survey', 'main']);
    const [formData, setFormData] = useState<SupportFormData>({
        email: '',
        message: ''
    });
    const [errors, setErrors] = useState<Partial<SupportFormData> & { captcha?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<{
        success: boolean;
        message: string;
    } | null>(null);
    const [{ isCaptchaValid, captchaToken }, setCaptchaResult] = useState<{
        isCaptchaValid: boolean;
        captchaToken: unknown;
    }>({ isCaptchaValid: false, captchaToken: null });
    const [captchaReloadKey, setCaptchaReloadKey] = useState<number>(0);

    // Function to send the email and message to the server and receive the response
    const sendSupportRequest = React.useCallback(
        async (email: string, message: string, captchaToken: unknown) => {
            try {
                setIsSubmitting(true);
                setSubmitStatus(null);

                // Capture the current URL when submitting the form
                const currentUrl = window.location.href;

                const response = await fetch('/public/supportRequest', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email,
                        message,
                        captchaToken,
                        currentUrl
                    })
                });

                if (response.status === 200) {
                    const jsonData = await response.json();
                    if (jsonData.status === 'success') {
                        setSubmitStatus({
                            success: true,
                            message: t('survey:support.submitSuccess')
                        });
                        // Reset form after successful submission
                        setFormData({ email: '', message: '' });
                    } else {
                        setSubmitStatus({
                            success: false,
                            message: t('survey:support.submitError')
                        });
                    }
                } else {
                    console.error('Invalid response code from server: ', response.status);
                    setSubmitStatus({
                        success: false,
                        message: t('survey:support.submitError')
                    });
                    // Reload captcha in case of error
                    setCaptchaReloadKey((prevKey) => prevKey + 1); // Reload captcha on error
                }
            } catch (error) {
                console.error(`Error sending support request to server: ${error}`);
                setSubmitStatus({
                    success: false,
                    message: t('survey:support.submitError')
                });
                // Reload captcha in case of error
                setCaptchaReloadKey((prevKey) => prevKey + 1); // Reload captcha on error
            } finally {
                setIsSubmitting(false);
            }
        },
        [t]
    );

    const validateForm = (): boolean => {
        const newErrors: Partial<SupportFormData> & { captcha?: string } = {};

        // Message is required
        if (!formData.message.trim()) {
            newErrors.message = t('survey:support.messageRequired');
        }

        // Email is optional but must be valid if provided
        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = t('survey:support.invalidEmail');
        }

        if (!isCaptchaValid) {
            newErrors.captcha = t('survey:support.captchaRequired');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        sendSupportRequest(formData.email, formData.message, captchaToken);
    };

    return (
        <div className="support-form-container">
            <h2 className="support-form-title">{t('survey:support.title')}</h2>

            {submitStatus && (
                <div className={`notification ${submitStatus.success ? 'success' : 'error'}`}>
                    {submitStatus.message}
                </div>
            )}

            {/* Only render the form if there is no successful submission */}
            {(!submitStatus || !submitStatus.success) && (
                <form className="apptr__form" onSubmit={handleSubmit} noValidate>
                    <div className="apptr__form-row">
                        <label htmlFor="email" className="apptr__form-label">
                            {t('survey:support.emailLabel')}
                        </label>
                        <div className="apptr__form-field-container">
                            <div className="apptr__form-helper-text">{t('survey:support.emailHelper')}</div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                className={`apptr__form-input ${errors.email ? 'invalid' : ''}`}
                                value={formData.email}
                                onChange={handleChange}
                                placeholder={t('survey:support.emailPlaceholder')}
                            />
                            {errors.email && <div className="question-invalid">{errors.email}</div>}
                        </div>
                    </div>

                    <div className="apptr__form-row">
                        <label htmlFor="message" className="apptr__form-label">
                            {t('survey:support.messageLabel')}*
                        </label>
                        <div className="apptr__form-field-container">
                            <div className="apptr__form-helper-text">{t('survey:support.messageHelper')}</div>
                            <textarea
                                id="message"
                                name="message"
                                className={`apptr__form-textarea ${errors.message ? 'invalid' : ''}`}
                                rows={3}
                                value={formData.message}
                                onChange={handleChange}
                                placeholder={t('survey:support.messagePlaceholder')}
                                required
                            />
                            {errors.message && <div className="question-invalid">{errors.message}</div>}
                        </div>
                    </div>

                    <div className="apptr__form-row">
                        <CaptchaComponent
                            onCaptchaValid={(isValid, captchaToken) => {
                                setCaptchaResult({ isCaptchaValid: isValid, captchaToken });
                            }}
                            reloadKey={captchaReloadKey}
                        />
                        {errors.captcha && <div className="question-invalid">{errors.captcha}</div>}
                    </div>

                    <div className="apptr__form-row form-buttons-container">
                        <button type="submit" className="button blue" disabled={isSubmitting}>
                            {isSubmitting ? t('survey:support.submitting') : t('survey:support.submitButton')}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default SupportForm;
