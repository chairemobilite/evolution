/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';

import ConsentAndStartForm from '../ConsentAndStartForm';
import { addConsent } from '../../../actions/Survey';
import { configureStore } from '../../../store/configureStore';

// Mock the react-i18next's useTranslation function to control the translated string
let translatedString = '';
jest.mock('react-i18next', () => ({
    ...jest.requireActual('react-i18next'),
    useTranslation: () => ({
        t: (str: string | string[]) => typeof str === 'string' ? str : str.findIndex((s) => s.includes('AgreementText')) !== -1 ? translatedString : str[0] 
    })
}));

let store = configureStore();
jest.mock('../../../actions/Survey', () => ({
    addConsent: jest.fn().mockImplementation((consented: boolean) => ({
        type: 'ADD_CONSENT',
        consented
    }))
}));
const mockAddConsent = addConsent as jest.MockedFunction<typeof addConsent>;


beforeEach(() => {
    mockAddConsent.mockClear();
    store = configureStore();
});

describe('Render ConsentAndStartForm', () => {

    test('Without consent checkbox', () => {
        translatedString = '';
        const { container } = render(
            <Provider store={store}>
                <ConsentAndStartForm
                    afterClicked={jest.fn()}
                />
            </Provider>

        );
        expect(container).toMatchSnapshot();
    });

    test('With consent checkbox', () => {
        translatedString = 'I agree';
        const { container } = render(
            <Provider store={store}>
                <ConsentAndStartForm
                    afterClicked={jest.fn()}
                />
            </Provider>
        );
        expect(container).toMatchSnapshot();
    });

});

describe('Button click', () => {

    test('With consent true', async () => {
        store = configureStore({
            survey: {
                hasConsent: true,
            }
        } as any);

        const afterClick = jest.fn();
        translatedString = '';
        render(<Provider store={store}>
            <ConsentAndStartForm
                afterClicked={afterClick}
            />
        </Provider>);
        const user = userEvent.setup();

        // Click on button and make sure it accepts the change
        expect(screen.getByRole('button')).toBeInTheDocument();
        await user.click(screen.getByRole('button'));

        // Check that the callback has been called
        expect(afterClick).toHaveBeenCalled();
    });

    test('With consent false', async () => {
        store = configureStore({
            survey: {
                hasConsent: false,
            }
        } as any);

        const afterClick = jest.fn();
        translatedString = 'I agree';
        const { container } = render(<Provider store={store}>
            <ConsentAndStartForm
                afterClicked={afterClick}
            />
        </Provider>);
        const user = userEvent.setup();

        // Click on button, it should not agree
        expect(screen.getByRole('button')).toBeInTheDocument();
        await user.click(screen.getByRole('button'));

        // Make sure the callback was not called and the error message appears
        expect(afterClick).not.toHaveBeenCalled();
        const errorElement = container.querySelectorAll('.apptr__form-errors-container');
        expect(errorElement.length).toBe(1);
    });

});

describe('State update', () => {

    test('No consent', () => {
        // no consent box, the consent should be set automatically
        const afterClick = jest.fn();
        translatedString = '';
        render(<Provider store={store}>
            <ConsentAndStartForm
                afterClicked={afterClick}
            />
        </Provider>);

        // the addConsent survey action should have been called
        expect(mockAddConsent).toHaveBeenCalledTimes(1);
        expect(mockAddConsent).toHaveBeenCalledWith(true);
    });

    test('With consent, not initially checked, check the box', async () => {
        store = configureStore({
            survey: {
                hasConsent: false,
            }
        } as any);
        const afterClick = jest.fn();
        translatedString = 'I agree';
        render(<Provider store={store}>
            <ConsentAndStartForm
                afterClicked={afterClick}
            />
        </Provider>);
        const user = userEvent.setup();

        // the addConsent survey action should not have been called yet
        expect(mockAddConsent).not.toHaveBeenCalled();

        // Click on button, it should not agree
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
        await user.click(screen.getByRole('checkbox'));

        // the addConsent survey action should have been called
        expect(mockAddConsent).toHaveBeenCalledTimes(1);
        expect(mockAddConsent).toHaveBeenCalledWith(true);
    });

    test('With consent, initially checked, then unchecked', async () => {
        store = configureStore({
            survey: {
                hasConsent: true,
            }
        } as any);

        const afterClick = jest.fn();
        translatedString = 'I agree';
        render(<Provider store={store}>
            <ConsentAndStartForm
                afterClicked={afterClick}
            />
        </Provider>);
        const user = userEvent.setup();

        // the addConsent survey action should not have been called yet
        expect(mockAddConsent).not.toHaveBeenCalled();

        // Click on button, it should not agree
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
        await user.click(screen.getByRole('checkbox'));

        // the addConsent survey action should have been called
        expect(mockAddConsent).toHaveBeenCalledTimes(1);
        expect(mockAddConsent).toHaveBeenCalledWith(false);
    });

});
