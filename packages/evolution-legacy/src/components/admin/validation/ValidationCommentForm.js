/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// NOTE: no legacy import, can be moved to evolution-frontend
import React from 'react';
import { withTranslation } from 'react-i18next';
import InputText            from 'evolution-frontend/lib/components/inputs/InputText';

/*
interface ValidationCommentFormProps extends WithTranslation {
    interview: InterviewListAttributes;
    // TODO Type better, this is a redux action to update interview
    startUpdateInterview: () => any;
}
*/

const ValidationCommentForm = ({ interview, startUpdateInterview, t }) => {
    const inputRef = React.createRef();
    const onValueChange = (e) =>
    {
        if (e && e.stopPropagation) {
            e.stopPropagation();
        }

        const valuesByPath = {
            'responses._validationComment': e.target.value
        }
        startUpdateInterview(undefined, valuesByPath, null, null);

    }
    return <p>ValidationCommentForm.js legacy (to be replaced)</p>;
    return (
        <React.Fragment>
            <label htmlFor={`surveyValidationComment`}>{t('admin:validatorComment')}</label><br/>
            <InputText
                id={`surveyValidationComment`}
                value={interview.responses._validationComment}
                onValueChange={onValueChange}
                inputRef={inputRef}
                widgetConfig={{}}

                shortname={t('admin:validatorComment')}
            />
        </React.Fragment>
    );
};

export default withTranslation(['admin', 'main'])(ValidationCommentForm);
