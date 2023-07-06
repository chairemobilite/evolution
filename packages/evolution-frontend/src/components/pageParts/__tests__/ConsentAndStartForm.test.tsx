/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { mount } from 'enzyme';

import ConsentAndStartForm from '../ConsentAndStartForm';

// Mock the react-i18next to control the translated string (see )
let translatedString = '';
jest.mock('react-i18next', () => ({
    // this mock makes sure any components using the translate HoC receive the t function as a prop
    withTranslation: () => Component => {
      Component.defaultProps = { ...Component.defaultProps, t: (str: string | string[]) => typeof str === 'string' ? str : str.findIndex(s => s.includes('AgreementText')) !== -1 ? translatedString : str[0] };
      return Component;
    },
}));


describe('Render ConsentAndStartForm', () => {

    test('Without consent checkbox', () => {
        translatedString = '';
        const wrapper = TestRenderer.create(
            <ConsentAndStartForm
                afterClicked={jest.fn()}
            />
        );
        expect(wrapper).toMatchSnapshot();
    });

    test('With consent checkbox', () => {
        translatedString = 'I agree';
        const wrapper = TestRenderer.create(
            <ConsentAndStartForm
                afterClicked={jest.fn()}
            />
        );
        expect(wrapper).toMatchSnapshot();
    });
    
});


describe('Button click', () => {

    test('Without consent', () => {
        const afterClick = jest.fn();
        translatedString = '';
        const consentAndStartForm = mount( <ConsentAndStartForm
            afterClicked={afterClick}
        />);
    
        // Click on button and make sure it accepts the change
        const formButton = consentAndStartForm.find(`.survey-section__button`).at(0);
        formButton.simulate('click');

        // Check that the callback has been called
        expect(afterClick).toHaveBeenCalled();
    });

    test('With consent, not checked', () => {
        const afterClick = jest.fn();
        translatedString = 'I agree';
        const consentAndStartForm = mount( <ConsentAndStartForm
            afterClicked={afterClick}
        />);
    
        // Click on button, it should not agree
        const formButton = consentAndStartForm.find(`.survey-section__button`).at(0);
        formButton.simulate('click');
        

        // Make sure the callback was not called and the error message appears
        expect(afterClick).not.toHaveBeenCalled();
        consentAndStartForm.update();
        const errors = consentAndStartForm.find(`.apptr__form-errors-container`).at(0);
        expect(errors.length).toEqual(1);
    });

    test('With consent, checked', () => {
        const afterClick = jest.fn();
        translatedString = 'I agree';
        const consentAndStartForm = mount( <ConsentAndStartForm
            afterClicked={afterClick}
        />);
    
        // Check the checkbox
        const consentCheckbox = consentAndStartForm.find(`#surveyConsent`).at(0);
        consentCheckbox.simulate('change');
        consentAndStartForm.update();

        // Click on button and make sure it accepts the change
        const formButton = consentAndStartForm.find(`.survey-section__button`).at(0);

        // Check the period and validate the choices
        formButton.simulate('click');
        expect(afterClick).toHaveBeenCalled();
    });

});
