/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * A journey is a group of trips/trip chains used for a long-distance travel, or a surveyed day of travel.
 * Journeys must be used for travel surveys when a specific household is part of a panel and is interviewed
 * multiple times in the survey period. It can also be used if in a single survey, the questionnaire asks
 * for trips made on mutiple distinct days.
 */

import { OptionalValidity, IValidatable } from './Validatable';
import { Weightable, Weight, validateWeights } from './Weight';
import { Uuidable } from './Uuidable';
import { parseDate } from '../../utils/DateUtils';

type BaseJourneyAttributes = {
    _uuid?: string;

    startDate?: Date | string;
    startTime?: number;
    endDate?: Date | string;
    endTime?: number;
    name?: string;

} & Weightable;

type ExtendedJourneyAttributes = BaseJourneyAttributes & { [key: string]: any };

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IBaseJourneyAttributes extends BaseJourneyAttributes {}

class BaseJourney extends Uuidable implements IBaseJourneyAttributes, IValidatable {
    _isValid: OptionalValidity;
    _weights?: Weight[];

    startDate?: Date;
    startTime?: number;
    endDate?: Date;
    endTime?: number;
    name?: string;

    _confidentialAttributes: string[] = [
        // these attributes should be hidden when exporting
    ];

    constructor(params: BaseJourneyAttributes | ExtendedJourneyAttributes) {
        super(params._uuid);

        this._isValid = undefined;
        this._weights = params._weights;

        this.startDate = parseDate(params.startDate);
        this.startTime = params.startTime;
        this.endDate = parseDate(params.endDate);
        this.endTime = params.endTime;
        this.name = params.name;
    }

    // params must be sanitized and must be valid:
    static unserialize(params: BaseJourneyAttributes): BaseJourney {
        return new BaseJourney(params);
    }

    validate(): OptionalValidity {
        // TODO: implement:
        this._isValid = true;
        return true;
    }

    isValid(): OptionalValidity {
        return this._isValid;
    }

    /**
     * Factory that validates input from an interview and makes
     * sure types and required fields are valid before returning a new object
     * @param dirtyParams
     * @returns BaseJourney | Error[]
     */
    static create(dirtyParams: { [key: string]: any }): BaseJourney | Error[] {
        const errors = BaseJourney.validateParams(dirtyParams);
        return errors.length > 0 ? errors : new BaseJourney(dirtyParams as ExtendedJourneyAttributes);
    }

    /**
     * Validates attributes types for BaseJourney.
     * @param dirtyParams The parameters to validate.
     * @returns Error[] TODO: specialize this error class
     */
    static validateParams(dirtyParams: { [key: string]: any }): Error[] {
        const errors: Error[] = [];

        dirtyParams.startDate = parseDate(dirtyParams.startDate);
        dirtyParams.endDate = parseDate(dirtyParams.endDate);

        // Validate params object:
        if (!dirtyParams || typeof dirtyParams !== 'object') {
            errors.push(new Error('BaseJourney validateParams: params is undefined or invalid'));
            return errors; // stop now otherwise it will crash because params are not valid
        }

        // Validate UUID
        const uuidErrors: Error[] = Uuidable.validateParams(dirtyParams);
        if (uuidErrors.length > 0) {
            errors.push(...uuidErrors);
        }

        // Validate weights:
        const weightsErrors = validateWeights(dirtyParams._weights);
        if (weightsErrors.length > 0) {
            errors.push(...weightsErrors);
        }

        // Validate startDate
        if (
            dirtyParams.startDate !== undefined &&
            (!(dirtyParams.startDate instanceof Date) || isNaN(dirtyParams.startDate.getDate()))
        ) {
            errors.push(new Error('BaseJourney validateParams: startDate is required and should be a valid date'));
        }

        // Validate startTime
        if (
            dirtyParams.startTime !== undefined &&
            (typeof dirtyParams.startTime !== 'number' || dirtyParams.startTime < 0)
        ) {
            errors.push(
                new Error('BaseJourney validateParams: startTime is required and should be a non-negative number')
            );
        }

        // Validate endDate
        if (
            dirtyParams.endDate !== undefined &&
            (!(dirtyParams.endDate instanceof Date) || isNaN(dirtyParams.endDate.getDate()))
        ) {
            errors.push(new Error('BaseJourney validateParams: endDate is required and should be a valid date'));
        }

        // Validate endTime
        if (dirtyParams.endTime !== undefined && (typeof dirtyParams.endTime !== 'number' || dirtyParams.endTime < 0)) {
            errors.push(
                new Error('BaseJourney validateParams: endTime is required and should be a non-negative number')
            );
        }

        // Validate name (if provided)
        if (dirtyParams.name !== undefined && typeof dirtyParams.name !== 'string') {
            errors.push(new Error('BaseJourney validateParams: name should be a string'));
        }

        return errors;
    }
}

export { BaseJourney, BaseJourneyAttributes, ExtendedJourneyAttributes };
