/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import thunk from 'redux-thunk';
import { mount } from 'enzyme';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

import ConsentAndStartForm from '../ConsentAndStartForm';
import { addConsent } from '../../../actions/Survey';

// Mock the react-i18next to control the translated string (see )
let translatedString = '';
jest.mock('react-i18next', () => ({
    // this mock makes sure any components using the translate HoC receive the t function as a prop
    withTranslation: () => Component => {
      Component.defaultProps = { ...Component.defaultProps, t: (str: string | string[]) => typeof str === 'string' ? str : str.findIndex(s => s.includes('AgreementText')) !== -1 ? translatedString : str[0] };
      return Component;
    },
}));

const mockStore = configureStore([thunk]);
jest.mock('../../../actions/Survey', () => ({
    addConsent: jest.fn().mockImplementation((consented: boolean) => ({
        type: 'ADD_CONSENT',
        consented
    }))
}));
const mockAddConsent = addConsent as jest.MockedFunction<typeof addConsent>;

let store;

beforeEach(() => {
    mockAddConsent.mockClear();
    store = mockStore({
        survey: {
            hasConsent: false,
        }
    });
});

describe('Render ConsentAndStartForm', () => {

    test('Without consent checkbox', () => {
        translatedString = '';
        const wrapper = TestRenderer.create(
            <Provider store={store}>
                <ConsentAndStartForm
                    afterClicked={jest.fn()}
                />
            </Provider>
            
        );
        expect(wrapper).toMatchSnapshot();
    });

    test('With consent checkbox', () => {
        translatedString = 'I agree';
        const wrapper = TestRenderer.create(
            <Provider store={store}>
                <ConsentAndStartForm
                    afterClicked={jest.fn()}
                />
            </Provider>
        );
        expect(wrapper).toMatchSnapshot();
    });
    
});


describe('Button click', () => {

    test('With consent true', () => {
        store = mockStore({
            survey: {
                hasConsent: true,
            }
        });

        const afterClick = jest.fn();
        translatedString = '';
        const consentAndStartForm = mount(<Provider store={store}>
            <ConsentAndStartForm
                afterClicked={afterClick}
            />
        </Provider>);
    
        // Click on button and make sure it accepts the change
        const formButton = consentAndStartForm.find(`.survey-section__button`).at(0);
        formButton.simulate('click');

        // Check that the callback has been called
        expect(afterClick).toHaveBeenCalled();
    });

    test('With consent false', () => {
        store = mockStore({
            survey: {
                hasConsent: false,
            }
        });

        const afterClick = jest.fn();
        translatedString = 'I agree';
        const consentAndStartForm = mount(<Provider store={store}>
            <ConsentAndStartForm
                afterClicked={afterClick}
            />
        </Provider>);
    
        // Click on button, it should not agree
        const formButton = consentAndStartForm.find(`.survey-section__button`).at(0);
        formButton.simulate('click');
        
        // Make sure the callback was not called and the error message appears
        expect(afterClick).not.toHaveBeenCalled();
        consentAndStartForm.update();
        const errors = consentAndStartForm.find(`.apptr__form-errors-container`).at(0);
        expect(errors.length).toEqual(1);
    });

});

describe('State update', () => {

    test('No consent', () => {
        // no consent box, the consent should be set automatically
        const afterClick = jest.fn();
        translatedString = '';
        const consentAndStartForm = mount(<Provider store={store}>
            <ConsentAndStartForm
                afterClicked={afterClick}
            />
        </Provider>);
    
        // the addConsent survey action should have been called
        expect(mockAddConsent).toHaveBeenCalledTimes(1);
        expect(mockAddConsent).toHaveBeenCalledWith(true);
    });

    test('With consent, not initially checked, check the box', () => {
        store = mockStore({
            survey: {
                hasConsent: false,
            }
        });
        const afterClick = jest.fn();
        translatedString = 'I agree';
        const consentAndStartForm = mount(<Provider store={store}>
            <ConsentAndStartForm
                afterClicked={afterClick}
            />
        </Provider>);

        // the addConsent survey action should not have been called yet
        expect(mockAddConsent).not.toHaveBeenCalled();

        // Check the checkbox
        const consentCheckbox = consentAndStartForm.find(`#surveyConsent`).at(0);
        consentCheckbox.simulate('change');
        consentAndStartForm.update();

        // the addConsent survey action should have been called
        expect(mockAddConsent).toHaveBeenCalledTimes(1);
        expect(mockAddConsent).toHaveBeenCalledWith(true);
    
    });

    test('With consent, initially checked, then unchecked', () => {
        store = mockStore({
            survey: {
                hasConsent: true,
            }
        });

        const afterClick = jest.fn();
        translatedString = 'I agree';
        const consentAndStartForm = mount(<Provider store={store}>
            <ConsentAndStartForm
                afterClicked={afterClick}
            />
        </Provider>);
    
        // the addConsent survey action should not have been called yet
        expect(mockAddConsent).not.toHaveBeenCalled();

        // Check the checkbox
        const consentCheckbox = consentAndStartForm.find(`#surveyConsent`).at(0);
        consentCheckbox.simulate('change');
        consentAndStartForm.update();

        // the addConsent survey action should have been called
        expect(mockAddConsent).toHaveBeenCalledTimes(1);
        expect(mockAddConsent).toHaveBeenCalledWith(false);
    });

});
