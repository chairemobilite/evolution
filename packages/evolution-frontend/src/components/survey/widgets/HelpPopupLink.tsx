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

interface HelpPopupLinkProps {
    containsHtml: boolean;
    /** Text shown on the link and title of the modal */
    title: string;
    /** Text displayed in the help modal, function because it will only be retrieved on demand */
    content: () => string;
}

export const HelpPopupLink = (props: HelpPopupLinkProps) => {
    const [modalIsOpened, setModalIsOpened] = React.useState(false);
    return (
        <div>
            {modalIsOpened && (
                <SimpleModal
                    isOpen={true}
                    closeModal={() => setModalIsOpened(false)}
                    text={props.content()}
                    title={props.title}
                    containsHtml={props.containsHtml}
                />
            )}
            <button
                type="button"
                className="button helper-popup blue small"
                onClick={() => setModalIsOpened(true)}
            >
                <FontAwesomeIcon icon={faQuestionCircle} className="faIconLeft" />
                {props.title}
            </button>
        </div>
    );
};

export default HelpPopupLink;
