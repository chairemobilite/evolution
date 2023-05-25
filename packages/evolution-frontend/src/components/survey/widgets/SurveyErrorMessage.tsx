/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons/faQuestionCircle';

import SimpleModal from '../../modal/SimpleModal';

interface SurveyErrorMessageProps {
    containsHtml: boolean;
    /** Error text to display */
    text: string;
}

export const SurveyErrorMessage = (props: SurveyErrorMessageProps) => {
    const [modalIsOpened, setModalIsOpened] = React.useState(false);
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
