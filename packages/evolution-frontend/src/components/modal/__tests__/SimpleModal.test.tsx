/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import SimpleModal from '../SimpleModal';
import { stripHtml, stripUnsafeHtml } from '../../../services/display/frontendHelper';

// Mock react-markdown and remark-gfm as they use syntax not supported by jest
jest.mock('react-markdown', () => 'Markdown');
jest.mock('remark-gfm', () => 'remark-gfm');

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key
    })
}));
// Mock frontend helper to avoid undefined config error
jest.mock('../../../services/display/frontendHelper', () => ({
    stripHtml: jest.fn((str) => `stripped:(${str})`),
    stripUnsafeHtml: jest.fn((str) => `strippedUnsafe:(${str})`)
}));
const mockStripHtml = stripHtml as jest.MockedFunction<typeof stripHtml>;
const mockStripUnsafeHtml = stripUnsafeHtml as jest.MockedFunction<typeof stripUnsafeHtml>;


test('Test simple modal with action on close', () =>{
    const handleClose = jest.fn();
    const action = jest.fn();
    const title = 'Simple modal title';
    const baseText = 'Text in the simple modal';
    const text = `${baseText} <b>bold</b>`;
    const { queryByText, getByText } = render(
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
    expect(mockStripUnsafeHtml).toHaveBeenCalledWith(text);
    // Get the inner most node, which is the bold text and validate its text and tag
    const innerMostNode = queryByText('bold');
    expect(innerMostNode).toBeTruthy();
    expect(innerMostNode?.tagName).toEqual('B');
    // Get the parent node, which should be the whole text string
    const parentNode = innerMostNode?.parentNode;
    expect(parentNode?.textContent).toEqual('strippedUnsafe:(Text in the simple modal bold)');
    // Validat other strings present
    expect(queryByText(title)).toBeTruthy();
    expect(queryByText(text)).toBeFalsy();

    // Click on the close button
    const button = queryByText(/main:Ok/i);
    expect(button).toBeTruthy();
    fireEvent.click(button as any);
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledTimes(1);
});

test('Test simple modal with containsHtml `false`', () =>{
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
            containsHtml={false}
            action={action}
        />
    );
    // Make sure the stripHtml function has been called
    expect(mockStripHtml).toHaveBeenCalledWith(text);
});

test('Test simple modal with minimal parameters', () =>{
    const handleClose = jest.fn();
    const text = 'Text in the simple modal <b>bold</b>';
    // Does not contain html by default, so should be stripped of html
    const expectedText = 'stripped:(Text in the simple modal <b>bold</b>)'
    const title = 'Simple modal title';
    const { getByText } = render(
        <SimpleModal
            isOpen={true}
            closeModal={handleClose}
            text={text}
            title={title}
        />
    );
    expect(getByText(expectedText)).toBeTruthy();
    expect(getByText(title)).toBeTruthy();

    // Click on the close button
    fireEvent.click(getByText(/main:Ok/i));
    expect(handleClose).toHaveBeenCalledTimes(1);
});