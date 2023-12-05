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

    /**
     * Validates attribute types for Sample.
     * @param dirtyParams The parameters to validate.
     * @returns Error[] TODO: specialize this error class
     */
    static validateParams(dirtyParams: { [key: string]: any }): Error[] {
        const errors: Error[] = [];

        // Validate params object:
        if (!dirtyParams || typeof dirtyParams !== 'object') {
            errors.push(new Error('Sample validateParams: params is undefined or invalid'));
            return errors; // stop now otherwise it will crash because params are not valid
        }

        // Validate UUID
        const uuidErrors: Error[] = Uuidable.validateParams(dirtyParams);
        if (uuidErrors.length > 0) {
            errors.push(...uuidErrors);
        }

        // Validate attributes
        if (dirtyParams.name !== undefined && typeof dirtyParams.name !== 'string') {
            errors.push(new Error('Sample validateParams: name should be a string'));
        } else if (dirtyParams.name === undefined) {
            errors.push(new Error('Sample validateParams: name is required'));
        }
        if (dirtyParams.shortname !== undefined && typeof dirtyParams.shortname !== 'string') {
            errors.push(new Error('Sample validateParams: shortname should be a string'));
        } else if (dirtyParams.shortname === undefined) {
            errors.push(new Error('Sample validateParams: shortname is required'));
        }
        if (dirtyParams.description !== undefined && typeof dirtyParams.description !== 'string') {
            errors.push(new Error('Sample validateParams: description should be a string'));
        }

        return errors;
    }
}
