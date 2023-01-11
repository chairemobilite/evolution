/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';

import InputLoading from '../InputLoading';

test('Should correctly render Input Loading', () =>{
    const wrapper = TestRenderer.create(<InputLoading />);
    expect(wrapper).toMatchSnapshot();
});
