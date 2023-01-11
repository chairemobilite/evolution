/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';

import {Text} from '../../../../components/survey/Text';
import {homeIntro} from '../../../fixtures/survey/widgets';

test('Should correctly render text widget', () =>{

    const i18n = {language: 'en'};

    const wrapper = TestRenderer.create(<Text i18n={i18n} widgetConfig={homeIntro} widgetStatus={{}} />);
    expect(wrapper).toMatchSnapshot();
});