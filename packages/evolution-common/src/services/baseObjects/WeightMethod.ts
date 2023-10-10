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

    /**
     * Validates attribute types for Sample.
     * @param dirtyParams The parameters to validate.
     * @returns Error[] TODO: specialize this error class
     */
    static validateParams(dirtyParams: { [key: string]: any }): Error[] {
        const errors: Error[] = [];

        // Validate params object:
        if (!dirtyParams || typeof dirtyParams !== 'object') {
            errors.push(new Error('WeightMethod validateParams: params is undefined or invalid'));
            return errors; // stop now otherwise it will crash because params are not valid
        }

        // Validate UUID
        const uuidErrors: Error[] = Uuidable.validateParams(dirtyParams);
        if (uuidErrors.length > 0) {
            errors.push(...uuidErrors);
        }

        // Validate attributes
        if (dirtyParams.name !== undefined && typeof dirtyParams.name !== 'string') {
            errors.push(new Error('WeightMethod validateParams: name should be a string'));
        } else if (dirtyParams.name === undefined) {
            errors.push(new Error('WeightMethod validateParams: name is required'));
        }
        if (dirtyParams.shortname !== undefined && typeof dirtyParams.shortname !== 'string') {
            errors.push(new Error('WeightMethod validateParams: shortname should be a string'));
        } else if (dirtyParams.shortname === undefined) {
            errors.push(new Error('WeightMethod validateParams: shortname is required'));
        }
        if (dirtyParams.description !== undefined && typeof dirtyParams.description !== 'string') {
            errors.push(new Error('WeightMethod validateParams: description should be a string'));
        }

        return errors;
    }

}
