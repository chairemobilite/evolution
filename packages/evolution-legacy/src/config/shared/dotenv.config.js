/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// TODO This file should be replaced with the chaire-lib's dotenv
const path = require('path');

if (!process.env.NODE_ENV)
{
  process.env.NODE_ENV = 'development';
}
require('dotenv').config({ path: path.join(__dirname, '../../../../..', '.env') });
