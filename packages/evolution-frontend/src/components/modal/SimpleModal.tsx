/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import Modal from 'react-modal';
import { withTranslation, WithTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface SimpleModalProps {
    isOpen: boolean;
    closeModal: React.MouseEventHandler;
    text: string;
    title: string;
    containsHtml?: boolean;
    action?: React.MouseEventHandler;
}

if (!process.env.IS_TESTING) {
    Modal.setAppElement('#app');
}

/**
 * Modal component displaying a simple text with a single OK button
 *
 * @param props Component props
 * @returns The modal component
 */
export const SimpleModal: React.FunctionComponent<SimpleModalProps & WithTranslation> = (
    props: SimpleModalProps & WithTranslation
) => {
    const close = (ev: React.MouseEvent) => {
        if (typeof props.action === 'function') {
            props.action(ev);
        }
        props.closeModal(ev);
    };

    return (
        <Modal
            isOpen={props.isOpen}
            onRequestClose={props.closeModal}
            className="react-modal"
            overlayClassName="react-modal-overlay"
            contentLabel={props.title}
        >
            <div>
                {props.title && (
                    <h3 className="center">
                        <Markdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]}>{props.title}</Markdown>
                    </h3>
                )}
                {props.containsHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: props.text }} />
                ) : (
                    <Markdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]} className="help-popup">
                        {props.text}
                    </Markdown>
                )}
                <div className="center">
                    <button className="button blue" onClick={close}>
                        {props.t('main:OK')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default withTranslation()(SimpleModal);
