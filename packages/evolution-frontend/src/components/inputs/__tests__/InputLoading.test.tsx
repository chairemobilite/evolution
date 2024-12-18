/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import InputLoading from '../InputLoading';

test('Should correctly render Input Loading', () =>{
    const { container } = render(<InputLoading />);
    expect(container).toMatchSnapshot();
});
