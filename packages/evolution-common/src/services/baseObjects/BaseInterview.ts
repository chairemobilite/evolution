/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { OptionalValidity, IValidatable } from './Validatable';
import { Surveyable, SurveyableAttributes } from './Surveyable';
import { Uuidable } from './Uuidable';
import { BasePerson } from './BasePerson';
import { BaseHousehold } from './BaseHousehold';
import { BaseOrganization } from './BaseOrganization';

export type BaseInterviewAttributes = {

    _uuid?: string;
    startedDate?: Date;
    startedTime?: number; // secondsSinceMidnight
    completedDate?: Date;
    completedTime?: number; // secondsSinceMidnight

    baseHousehold?: BaseHousehold; // for household-based surveys
    basePerson?: BasePerson; // for person-based with no household data surveys
    baseOrganization?: BaseOrganization; // for organization-based surveys

} & SurveyableAttributes;

export type ExtendedInterviewAttributes = BaseInterviewAttributes & { [key: string]: any };

export class BaseInterview extends Surveyable implements IValidatable {

    _isValid: OptionalValidity;

    baseHousehold?: BaseHousehold;
    basePerson?: BasePerson;
    baseOrganization?: BaseOrganization;

    startedDate?: Date;
    startedTime?: number; // secondsSinceMidnight
    completedDate?: Date;
    completedTime?: number; // secondsSinceMidnight

    constructor(params: BaseInterviewAttributes | ExtendedInterviewAttributes) {

        super(params.survey, params.sample, params.sampleBatchNumber, params._uuid);

        this.baseHousehold = params.baseHousehold;
        this.basePerson = params.basePerson;
        this.baseOrganization = params.baseOrganization;

        this.startedDate = params.startedDate;
        this.startedTime = params.startedTime;
        this.completedDate = params.completedDate;
        this.completedTime = params.completedTime;

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
     * @returns BaseInterview | Error[]
     */
    static create(dirtyParams: { [key: string]: any }): BaseInterview | Error[] {
        const errors = BaseInterview.validateParams(dirtyParams);
        return errors.length > 0 ? errors : new BaseInterview(dirtyParams as ExtendedInterviewAttributes);
    }

    /**
     * Validates attribute types for BaseInterview.
     * @param dirtyParams The parameters to validate.
     * @returns Error[] TODO: specialize this error class
     */
    static validateParams(dirtyParams: { [key: string]: any }): Error[] {
        const errors: Error[] = [];

        // Validate params object:
        if (!dirtyParams || typeof dirtyParams !== 'object') {
            errors.push(new Error('BaseInterview validateParams: params is undefined or invalid'));
            return errors; // Stop now, as the params are not valid.
        }

        // Validate UUID
        const uuidErrors: Error[] = Uuidable.validateParams(dirtyParams);
        if (uuidErrors.length > 0) {
            errors.push(...uuidErrors);
        }

        // Validate startedDate (if provided)
        if (dirtyParams.startedDate !== undefined && (!(dirtyParams.startedDate instanceof Date) || isNaN(dirtyParams.startedDate.getDate()))) {
            errors.push(new Error('BaseInterview validateParams: invalid startedDate'));
        }

        // Validate startedTime (if provided)
        if (dirtyParams.startedTime !== undefined && (typeof dirtyParams.startedTime !== 'number' || dirtyParams.startedTime < 0)) {
            errors.push(new Error('BaseInterview validateParams: startedTime should be a non-negative number'));
        }

        // Validate completedDate (if provided)
        if (dirtyParams.completedDate !== undefined && (!(dirtyParams.completedDate instanceof Date) || isNaN(dirtyParams.completedDate.getDate()))) {
            errors.push(new Error('BaseInterview validateParams: invalid completedDate'));
        }

        // Validate completedTime (if provided)
        if (dirtyParams.completedTime !== undefined && (typeof dirtyParams.completedTime !== 'number' || dirtyParams.completedTime < 0)) {
            errors.push(new Error('BaseInterview validateParams: completedTime should be a non-negative number'));
        }

        // Validate baseHousehold (if provided)
        if (dirtyParams.baseHousehold !== undefined && !(dirtyParams.baseHousehold instanceof BaseHousehold)) {
            errors.push(new Error('BaseInterview validateParams: baseHousehold should be an instance of BaseHousehold'));
        }

        // Validate basePerson (if provided)
        if (dirtyParams.basePerson !== undefined && !(dirtyParams.basePerson instanceof BasePerson)) {
            errors.push(new Error('BaseInterview validateParams: basePerson should be an instance of BasePerson'));
        }

        // Validate baseOrganization (if provided)
        if (dirtyParams.baseOrganization !== undefined && !(dirtyParams.baseOrganization instanceof BaseOrganization)) {
            errors.push(new Error('BaseInterview validateParams: baseOrganization should be an instance of BaseOrganization'));
        }

        return errors;
    }

    // TODO: methods to get started and completed date/time with any format using moment or DateTime



}
