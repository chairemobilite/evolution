/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SupportForm from './SupportForm';

const FloatingSupportForm: React.FC = () => {
    const { t } = useTranslation(['survey', 'main']);
    const [isExpanded, setIsExpanded] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const toggleForm = () => {
        setIsExpanded(!isExpanded);
    };

    // Handle clicks outside the form to close it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isExpanded &&
                formRef.current &&
                buttonRef.current &&
                !formRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isExpanded]);

    return (
        <div className="floating-support-container">
            {isExpanded && (
                <div className="floating-support-panel" ref={formRef} aria-hidden={!isExpanded}>
                    <div className="floating-support-header">
                        <h3>{t('survey:support.title')}</h3>
                        <button
                            className="floating-support-close"
                            onClick={() => setIsExpanded(false)}
                            aria-label={t('survey:support.close')}
                        >
                            &times;
                        </button>
                    </div>
                    <div className="floating-support-content">
                        <SupportForm />
                    </div>
                </div>
            )}

            <button
                className="floating-support-button"
                ref={buttonRef}
                onClick={toggleForm}
                aria-label={t('survey:support.helpButtonLabel')}
                aria-expanded={isExpanded}
            >
                {t('survey:support.helpButton')}
            </button>
        </div>
    );
};

export default FloatingSupportForm;
