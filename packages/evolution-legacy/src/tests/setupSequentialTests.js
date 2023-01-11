/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import Dotenv  from 'dotenv';
import Enzyme  from 'enzyme';
import fetch   from 'jest-fetch-mock';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

global.fetch = fetch;
Dotenv.config({ path: '../.env' });

configure({ adapter: new Adapter() });
