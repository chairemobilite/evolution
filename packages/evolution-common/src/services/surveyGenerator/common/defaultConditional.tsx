/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Conditional } from '../types/inputTypes';

// Accept all the time
const defaultConditional: Conditional = () => [true, null];

export default defaultConditional;
