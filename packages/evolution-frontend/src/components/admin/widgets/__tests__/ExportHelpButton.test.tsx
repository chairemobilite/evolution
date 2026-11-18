/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ExportHelpButton from '../ExportHelpButton';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: { exportName: string }) => `${key}:${options?.exportName}`
    })
}));

// The modal has its own tests, and its markdown dependencies are not supported by jest
jest.mock('../../../modal/SimpleModal', () => ({
    __esModule: true,
    default: ({ title, text, closeModal }: { title: string; text: string; closeModal: () => void }) => (
        <div>
            <h3>{title}</h3>
            <p>{text}</p>
            <button onClick={closeModal}>close</button>
        </div>
    )
}));

describe('ExportHelpButton', () => {
    const helpButtonLabel = 'admin:export:ShowExportHelp:Survey objects export';

    test('opens and closes the help of the export', () => {
        const { getByLabelText, getByText, queryByText } = render(
            <ExportHelpButton exportName="Survey objects export" helpText="What the export contains" />
        );
        // The help is closed at first
        expect(queryByText('What the export contains')).toBeNull();

        fireEvent.click(getByLabelText(helpButtonLabel));
        expect(getByText('Survey objects export')).toBeTruthy();
        expect(getByText('What the export contains')).toBeTruthy();

        fireEvent.click(getByText('close'));
        expect(queryByText('What the export contains')).toBeNull();
    });
});
