/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import React from 'react';
import thunk from 'redux-thunk';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import TestRenderer from 'react-test-renderer';
import { mount } from 'enzyme';
import { MemoryRouter } from 'react-router-dom';

import ErrorBoundary from '../ErrorBoundary';

const mockStore = configureStore([thunk]);
let store;
beforeEach(() => {
    jest.clearAllMocks();
    store = mockStore({
        survey: {
            interview: {
                id: 1
            }
        }
    });
});

test('Render child widget if no error', () => {
    const NormalComponent = () => <div>Normal component</div>;
    const wrapper = TestRenderer.create(
        <Provider store={store}>
            <MemoryRouter>
                <ErrorBoundary>
                    <NormalComponent />
                </ErrorBoundary>
            </MemoryRouter>
        </Provider>
    );
    expect(wrapper).toMatchSnapshot();
});

test('Render error page if widget has error', () => {
    const ErrorComponent = () => {
        throw new Error('Error component');
    };
    const wrapper = TestRenderer.create(
        <Provider store={store}>
            <MemoryRouter>
                <ErrorBoundary>
                    <ErrorComponent />
                </ErrorBoundary>
            </MemoryRouter>
        </Provider>
    );
    expect(wrapper).toMatchSnapshot();
});

test('Reset the error boundary when clicking', () => {
    let hasThrown = false
    const ErrorComponent = () => {
        if (!hasThrown) {
            hasThrown = true;
            throw new Error('Error component');
        }
        return <div>Correct component</div>;
    };

    // Add initial keys for snapshots to work with enzyme without random keys (https://github.com/remix-run/react-router/issues/5579)
    const surveyErrorPage = mount(
        <Provider store={store}>
            <MemoryRouter initialEntries={[ { pathname: '/', key: 'testKey' } ]}>
                <ErrorBoundary>
                    <ErrorComponent />
                </ErrorBoundary>
            </MemoryRouter>
        </Provider>
    );

    // This snapshot should be the error page
    expect(surveyErrorPage).toMatchSnapshot();

    // Find and click on the link in the error page
    const link = surveyErrorPage.find('a');
    link.simulate('click');

    // The second snapshot should be the correct component reset by the error boundary
    surveyErrorPage.update();
    expect(surveyErrorPage).toMatchSnapshot();
});
