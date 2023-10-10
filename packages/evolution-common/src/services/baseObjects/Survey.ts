/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Uuidable } from './Uuidable';

/**
 * A specific survey for which a questionnaire is built. Can have single or multiple sample(s).
 */

type SurveyAttributes = {

    _uuid?: string;

    name: string;
    shortname: string;
    description?: string;
    startDate: Date;
    endDate: Date;

}

type ExtendedSurveyAttributes = SurveyAttributes & { [key: string]: any };

class Survey extends Uuidable {

    name: string;
    shortname: string;
    description?: string;
    startDate: Date;
    endDate: Date;

    constructor(params: SurveyAttributes | ExtendedSurveyAttributes) {

        super(params._uuid);

        this.name = params.name;
        this.shortname = params.shortname;
        this.description = params.description;
        this.startDate = params.startDate;
        this.endDate = params.endDate;

    }

    /**
     * validates attributes types
     * @param dirtyParams the params input
     * @returns Error[] TODO: specialize this error class
     */
    static validateParams(dirtyParams: { [key: string]: any }): Error[] {

        const errors: Error[] = [];

        // Validate params object:
        if (!dirtyParams || typeof dirtyParams !== 'object') {
            errors.push(new Error('Surevy validateParams: params is undefined or invalid'));
            return errors; // stop now otherwise it will crash because params are not valid
        }

        // validate uuid:
        const uuidErrors: Error[] = Uuidable.validateParams(dirtyParams);
        if (uuidErrors.length > 0) {
            errors.push(...uuidErrors);
        }

        // validate attributes:
        if (dirtyParams.name !== undefined && typeof dirtyParams.name !== 'string') {
            errors.push(new Error('Survey validateParams: name should be a string'));
        } else if (dirtyParams.name === undefined) {
            errors.push(new Error('Survey validateParams: name is required'));
        }
        if (dirtyParams.shortname !== undefined && typeof dirtyParams.shortname !== 'string') {
            errors.push(new Error('Survey validateParams: shortname should be a string'));
        } else if (dirtyParams.shortname === undefined) {
            errors.push(new Error('Survey validateParams: shortname is required'));
        }
        if (dirtyParams.description !== undefined && typeof dirtyParams.description !== 'string') {
            errors.push(new Error('Survey validateParams: description should be a string'));
        }
        if (dirtyParams.startDate !== undefined && (!(dirtyParams.startDate instanceof Date) || isNaN(dirtyParams.startDate.getDate()))) {
            errors.push(new Error('Survey validateParams: invalid startDate'));
        } else if (dirtyParams.startDate === undefined) {
            errors.push(new Error('Survey validateParams: startDate is required'));
        }
        if (dirtyParams.endDate !== undefined && (!(dirtyParams.endDate instanceof Date) || isNaN(dirtyParams.endDate.getDate()))) {
            errors.push(new Error('Survey validateParams: invalid endDate'));
        } else if (dirtyParams.endDate === undefined) {
            errors.push(new Error('Survey validateParams: endDate is required'));
        }

        return errors;

    }

}

export {
    Survey,
    SurveyAttributes,
    ExtendedSurveyAttributes
};
