/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Uuidable } from './Uuidable';
import { parseDate } from '../../utils/DateUtils';

/**
 * A specific survey for which a questionnaire is built. Can have single or multiple sample(s).
 */

type SurveyAttributes = {
    _uuid?: string;

    name?: string;
    shortname: string;
    description?: string;
    startDate?: Date | string;
    endDate?: Date | string;
};

type ExtendedSurveyAttributes = SurveyAttributes & { [key: string]: any };

class Survey extends Uuidable {
    name?: string;
    shortname: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;

    constructor(params: SurveyAttributes | ExtendedSurveyAttributes) {
        super(params._uuid);

        this.name = params.name;
        this.shortname = params.shortname;
        this.description = params.description;
        this.startDate = parseDate(params.startDate);
        this.endDate = parseDate(params.endDate);
    }

    // params must be sanitized and must be valid:
    static unserialize(params: SurveyAttributes): Survey {
        return new Survey(params);
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

        dirtyParams.startDate = parseDate(dirtyParams.startDate);
        dirtyParams.endDate = parseDate(dirtyParams.endDate);

        // validate attributes:
        if (dirtyParams.name !== undefined && typeof dirtyParams.name !== 'string') {
            errors.push(new Error('Survey validateParams: name should be a string'));
        }
        if (dirtyParams.shortname !== undefined && typeof dirtyParams.shortname !== 'string') {
            errors.push(new Error('Survey validateParams: shortname should be a string'));
        } else if (dirtyParams.shortname === undefined) {
            errors.push(new Error('Survey validateParams: shortname is required'));
        }
        if (dirtyParams.description !== undefined && typeof dirtyParams.description !== 'string') {
            errors.push(new Error('Survey validateParams: description should be a string'));
        }
        if (
            dirtyParams.startDate !== undefined &&
            (!(dirtyParams.startDate instanceof Date) || isNaN(dirtyParams.startDate.getTime()))
        ) {
            errors.push(new Error('Survey validateParams: invalid startDate'));
        }
        if (
            dirtyParams.endDate !== undefined &&
            (!(dirtyParams.endDate instanceof Date) || isNaN(dirtyParams.endDate.getTime()))
        ) {
            errors.push(new Error('Survey validateParams: invalid endDate'));
        }

        return errors;
    }
}

export { Survey, SurveyAttributes, ExtendedSurveyAttributes };
