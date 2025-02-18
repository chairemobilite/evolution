/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons/faExclamationTriangle';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type ValidationErrorProps = {
    errors: {
        errors: string[];
        warnings: string[];
    };
};

const ValidationErrors: React.FC<ValidationErrorProps> = ({ errors }) => {
    const { t } = useTranslation('survey');

    const errorMessages = (errors.errors || errors || []).map((errorId: string, i: number) => (
        <p key={`error_${i}`} className={'_error _red _strong'}>
            <FontAwesomeIcon icon={faExclamationTriangle} className="faIconLeft" />
            {t(`survey:validations:${errorId}`)}
        </p>
    ));
    const warningMessages = (errors.warnings || []).map((warningId: string, i: number) => (
        <p key={`warning_${i}`} className={'_warning _orange _strong'}>
            <FontAwesomeIcon icon={faExclamationTriangle} className="faIconLeft" />
            {t(`survey:validations:${warningId}`)}
        </p>
    ));

    return (
        <>
            <div className="admin-errors-container">{errorMessages}</div>
            <div className="admin-warnings-container">{warningMessages}</div>
        </>
    );
};

export default ValidationErrors;
