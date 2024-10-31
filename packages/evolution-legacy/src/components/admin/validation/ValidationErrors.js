/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// NOTE: no legacy import, can be moved to evolution-frontend
import React from 'react';
import { withTranslation } from 'react-i18next';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons/faExclamationTriangle';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default withTranslation()(function({ errors, t}) {

    const errorMessages = (errors.errors || errors || []).map(function (errorId, i) {
        return (<p key={`error_${i}`} className={`_error _red _strong`}><FontAwesomeIcon icon={faExclamationTriangle} className="faIconLeft" />{t(`survey:validations:${errorId}`)}</p>);
    });
    const warningMessages = (errors.warnings || []).map(function (warningId, i) {
        return (<p key={`warning_${i}`} className={`_warning _orange _strong`}><FontAwesomeIcon icon={faExclamationTriangle} className="faIconLeft" />{t(`survey:validations:${warningId}`)}</p>);
    });

    return <p>ValidationErrors.js legacy (to be replaced)</p>;
    return (
        <React.Fragment>
            <div className="admin-errors-container">
                {errorMessages}
            </div>
            <div className="admin-warnings-container">
                {warningMessages}
            </div>
        </React.Fragment>
    );

})
