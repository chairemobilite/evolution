/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AdminGeneratorPage from '../AdminGeneratorPage';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key
    })
}));

jest.mock('sonner', () => ({
    toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() }
}));

const mockFetchResult = (result: Record<string, unknown>) => {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok', result })
    }) as jest.Mock;
};

const verifyExcelFile = async () => {
    const user = userEvent.setup();
    render(<AdminGeneratorPage />);
    const file = new File(['dummy'], 'survey.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    await user.upload(screen.getByLabelText('admin:generator:GeneratorFileLabel'), file);
    await user.click(screen.getByRole('button', { name: 'admin:generator:GeneratorButton' }));
    return user;
};

const getPanel = (title: string): HTMLElement | null =>
    screen.queryByText(title)?.closest<HTMLElement>('.admin-generator-verify-error') ?? null;

describe('AdminGeneratorPage verification messages', () => {
    test.each([
        {
            description: 'passing check with warnings',
            result: { integrityOk: true, warnings: ['Widgets sheet has 5000 empty rows'] },
            expectedErrors: null,
            expectedWarnings: ['Widgets sheet has 5000 empty rows']
        },
        {
            description: 'failing check with warnings',
            result: { integrityOk: false, errors: ['Invalid data'], warnings: ['Labels sheet has 200 empty columns'] },
            expectedErrors: ['Invalid data'],
            expectedWarnings: ['Labels sheet has 200 empty columns']
        },
        {
            description: 'passing check without warnings',
            result: { integrityOk: true, warnings: [] },
            expectedErrors: null,
            expectedWarnings: null
        },
        {
            description: 'failing check from a server sending no warnings',
            result: { integrityOk: false, errors: ['Invalid data'] },
            expectedErrors: ['Invalid data'],
            expectedWarnings: null
        }
    ])('Shows the errors and warnings: $description', async ({ result, expectedErrors, expectedWarnings }) => {
        mockFetchResult(result);
        await verifyExcelFile();

        const panelsToCheck = [
            { title: 'admin:generator:GeneratorVerifyErrorTitle', expectedMessages: expectedErrors, role: 'alert' },
            { title: 'admin:generator:GeneratorVerifyWarningTitle', expectedMessages: expectedWarnings, role: 'status' }
        ];
        for (const { title, expectedMessages, role } of panelsToCheck) {
            const panel = getPanel(title);
            if (expectedMessages === null) {
                expect(panel).toBeNull();
            } else {
                expect(panel).toHaveAttribute('role', role);
                // The role sets how the panel is announced (assertive for alert, polite for status).
                expect(panel).not.toHaveAttribute('aria-live');
                expect(within(panel as HTMLElement).getAllByRole('listitem').map((item) => item.textContent)).toEqual(
                    expectedMessages
                );
            }
        }
    });

    test('Dismisses the warnings without dismissing the errors', async () => {
        mockFetchResult({ integrityOk: false, errors: ['Invalid data'], warnings: ['Labels sheet has 200 empty columns'] });
        const user = await verifyExcelFile();

        const warningsPanel = getPanel('admin:generator:GeneratorVerifyWarningTitle') as HTMLElement;
        await user.click(within(warningsPanel).getByRole('button', { name: 'admin:generator:GeneratorVerifyErrorDismiss' }));

        expect(getPanel('admin:generator:GeneratorVerifyWarningTitle')).toBeNull();
        expect(getPanel('admin:generator:GeneratorVerifyErrorTitle')).not.toBeNull();
    });

    test.each([
        {
            description: 'file replaced',
            changeFile: async (user: ReturnType<typeof userEvent.setup>) => {
                const otherFile = new File(['other'], 'other.xlsx', {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                await user.upload(screen.getByLabelText('admin:generator:GeneratorFileLabel'), otherFile);
            }
        },
        {
            description: 'file removed',
            changeFile: async (user: ReturnType<typeof userEvent.setup>) => {
                await user.click(screen.getByRole('button', { name: 'admin:generator:GeneratorRemoveFile' }));
            }
        }
    ])('Ignores the verification of a file changed while it was pending: $description', async ({ changeFile }) => {
        let resolveFetch: (response: unknown) => void = () => undefined;
        global.fetch = jest.fn().mockReturnValue(
            new Promise((resolve) => {
                resolveFetch = resolve;
            })
        ) as jest.Mock;
        const user = await verifyExcelFile();

        await changeFile(user);
        await act(async () => {
            resolveFetch({
                ok: true,
                json: async () => ({
                    status: 'ok',
                    result: { integrityOk: false, errors: ['Invalid data'], warnings: ['Widgets sheet has 5000 empty rows'] }
                })
            });
        });

        expect(getPanel('admin:generator:GeneratorVerifyErrorTitle')).toBeNull();
        expect(getPanel('admin:generator:GeneratorVerifyWarningTitle')).toBeNull();
        expect(screen.getByRole('button', { name: 'admin:generator:GeneratorButton' })).toBeEnabled();
    });
});
