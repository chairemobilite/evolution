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

process.env.PROJECT_SHORTNAME     = 'test';
process.env.OSRM_DIRECTORY_PREFIX = 'test_env';
process.env.APP_NAME              = 'transition';

configure({ adapter: new Adapter() });
