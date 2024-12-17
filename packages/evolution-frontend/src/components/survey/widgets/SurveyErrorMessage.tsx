/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';

interface SurveyErrorMessageProps {
    containsHtml: boolean;
    /** Error text to display */
    text: string;
}

export const SurveyErrorMessage = (props: SurveyErrorMessageProps) => {
    return (
        <p className="apptr__form-error-message">
            {props.containsHtml ? (
                <span
                    dangerouslySetInnerHTML={{
                        __html: props.text
                    }}
                />
            ) : (
                props.text
            )}
        </p>
    );
};

export default SurveyErrorMessage;
