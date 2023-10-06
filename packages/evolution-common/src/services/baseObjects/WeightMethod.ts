/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Uuidable } from './Uuidable';

export type WeightMethodAttributes = {

    _uuid: string;

    shortname: string;
    name: string;
    description?: string;

}

/**
 * Used to weight a sample using one or multiple attributes. A survey can have mutiple weight methods.
 * TODO: add needed and optinal attributes
 */

export class WeightMethod extends Uuidable {

    shortname: string;
    name: string;
    description?: string;

    constructor(params: WeightMethodAttributes) {

        super(params._uuid);
        this.name = params.name;
        this.shortname = params.shortname;
        this.description = params.description;

    }

}
