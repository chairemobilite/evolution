/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';

const count = process.argv[2] || 1;

for (let i = 0; i < count; i++)
{
  console.log(uuidV4());
}

process.exit();