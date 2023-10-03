/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Uuidable } from './Uuidable';

/**
 * A sample is a group of objects/households/persons, etc. drawn from a population.
 */
export type SampleAttributes = {

    _uuid?: string;

    name: string;
    shortname: string;
    description?: string;

};
export class Sample extends Uuidable {

    name: string;
    shortname: string;
    description?: string;

    constructor(params: SampleAttributes) {

        super(params._uuid);
        this.name = params.name;
        this.shortname = params.shortname;
        this.description = params.description;

    }

}
