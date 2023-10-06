/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { WeightMethod } from './WeightMethod';

/**
 * This is for interview objects that can be individually weighted after validation, using a specific weight method.
 */

export type Weight = {

    weight: number;
    method: WeightMethod;

}

export type Weightable = {

    _weight?: Weight;

}
