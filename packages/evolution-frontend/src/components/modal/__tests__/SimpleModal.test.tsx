/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import SimpleModal from '../SimpleModal';

// Mock react-markdown and remark-gfm as they use syntax not supported by jest
jest.mock('react-markdown', () => 'Markdown');
jest.mock('remark-gfm', () => 'remark-gfm');

jest.mock('react-i18next', () => ({
    // this mock makes sure any components using the translate HoC receive the t function as a prop
    withTranslation: () => Component => {
        Component.defaultProps = { ...Component.defaultProps, t: (key) => key };
        return Component;
    },
}));

test('Test simple modal with action on close', () =>{
    const handleClose = jest.fn();
    const action = jest.fn();
    const title = 'Simple modal title';
    const baseText = 'Text in the simple modal';
    const text = `${baseText} <b>bold</b>`;
    const { queryByText } = render(
        <SimpleModal
            isOpen={true}
            closeModal={handleClose}
            text={text}
            title={title}
            containsHtml={true}
            action={action}
        />
    );
    // Html was added, so the complete text is not there, it is actually composed of many texts
    expect(queryByText(baseText)).toBeTruthy();
    expect(queryByText(title)).toBeTruthy();
    expect(queryByText(text)).toBeFalsy();

    // Click on the close button
    const button = queryByText(/main:Ok/i);
    expect(button).toBeTruthy();
    fireEvent.click(button as any);
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledTimes(1);
});

test('Test simple modal with minimal parameters', () =>{
    const handleClose = jest.fn();
    const text = 'Text in the simple modal <b>bold</b>';
    const title = 'Simple modal title';
    const { getByText } = render(
        <SimpleModal
            isOpen={true}
            closeModal={handleClose}
            text={text}
            title={title}
        />
    );
    expect(getByText(text)).toBeTruthy();
    expect(getByText(title)).toBeTruthy();

    // Click on the close button
    fireEvent.click(getByText(/main:Ok/i));
    expect(handleClose).toHaveBeenCalledTimes(1);
});