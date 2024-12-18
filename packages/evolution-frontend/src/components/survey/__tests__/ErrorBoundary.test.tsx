/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import React from 'react';
import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import configureStore from '../../../store/configureStore';
import { logClientSideMessage } from '../../../services/errorManagement/errorHandling';

import ErrorBoundary from '../ErrorBoundary';

jest.mock('../../../services/errorManagement/errorHandling', () => ({
    logClientSideMessage: jest.fn()
}));
const logClientSideMessageMock = logClientSideMessage as jest.MockedFunction<typeof logClientSideMessage>;

let store = configureStore();
beforeEach(() => {
    jest.clearAllMocks();
    // Initialise store with interview id
    store = configureStore({
        survey: {
            interview: {
                id: 1
            }
        }
    } as any);
});

test('Render child widget if no error', () => {
    const NormalComponent = () => <div>Normal component</div>;
    const { container } = render(
        <Provider store={store}>
            <MemoryRouter>
                <ErrorBoundary>
                    <NormalComponent />
                </ErrorBoundary>
            </MemoryRouter>
        </Provider>
    );
    expect(container).toMatchSnapshot();
});

test('Render error page if widget has error', () => {
    const error = new Error('Error component');
    const ErrorComponent = () => {
        throw error;
    };
    const { container } = render(
        <Provider store={store}>
            <MemoryRouter>
                <ErrorBoundary>
                    <ErrorComponent />
                </ErrorBoundary>
            </MemoryRouter>
        </Provider>
    );
    expect(container).toMatchSnapshot();

    // Verify that the error was logged
    expect(logClientSideMessageMock).toHaveBeenCalledTimes(1);
    expect(logClientSideMessageMock).toHaveBeenCalledWith(error, { interviewId: 1 });
});

test('Reset the error boundary when clicking', async () => {
    let shouldThrow = true
    const ErrorComponent = () => {
        if (shouldThrow) {
            throw new Error('Error component');
        }
        return <div>Correct component</div>;
    };

    // Add initial keys for snapshots to work with enzyme without random keys (https://github.com/remix-run/react-router/issues/5579)
    const { container } = render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[ { pathname: '/', key: 'testKey' } ]}>
                <ErrorBoundary>
                    <ErrorComponent />
                </ErrorBoundary>
            </MemoryRouter>
        </Provider>
    );
    const user = userEvent.setup();

    // This snapshot should be the error page
    expect(container.querySelector('#surveyErrorPage')).toBeInTheDocument();
    expect(container).toMatchSnapshot();

    // Verify that the error was logged
    expect(logClientSideMessageMock).toHaveBeenCalledTimes(1);
    expect(logClientSideMessageMock).toHaveBeenCalledWith(expect.anything(), { interviewId: 1 });

    // Make sure next render is the correct component
    shouldThrow = false;

    // Find and click on the link in the error page
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/survey');
    await user.click(link);

    expect(container.querySelector('#surveyErrorPage')).not.toBeInTheDocument();
    expect(container).toMatchSnapshot();

    // Make sure there was no more error logs than before
    expect(logClientSideMessageMock).toHaveBeenCalledTimes(1);
});
