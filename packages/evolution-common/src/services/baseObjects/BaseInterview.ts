/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { parsePhoneNumber } from 'libphonenumber-js';
import { OptionalValidity, IValidatable } from './Validatable';
import { Surveyable, SurveyableAttributes } from './Surveyable';
import { Uuidable } from './Uuidable';
import { BasePerson } from './BasePerson';
import { BaseHousehold } from './BaseHousehold';
import { BaseOrganization } from './BaseOrganization';
import { _isEmail } from 'chaire-lib-common/lib/utils/LodashExtensions';

export const devices = [
    'tablet',
    'mobile',
    'desktop',
    'other',
    'unknown'
] as const;

export type Device = typeof devices[number];

export type BaseInterviewAttributes = {

    _uuid?: string;

    accessCode?: string;
    assignedDate?: Date; // date, the assigned date for the survey (trips date most of the time)
    contactPhoneNumber?: string; // phone number
    contactEmail?: string; // email

    _startedAt?: Date;
    _updatedAt?: Date;
    _completedAt?: Date;

    baseHousehold?: BaseHousehold; // for household-based surveys
    basePerson?: BasePerson; // for person-based with no household data surveys
    baseOrganization?: BaseOrganization; // for organization-based surveys

    _language?: string; // two-letter ISO 639-1 code
    _source?: string; // source for the interview (web, phone, social, etc.)
    _isCompleted?: boolean;

    _device?: Device;

} & SurveyableAttributes;

export type ExtendedInterviewAttributes = BaseInterviewAttributes & { [key: string]: any };

export class BaseInterview extends Surveyable implements IValidatable {

    _isValid: OptionalValidity;

    baseHousehold?: BaseHousehold;
    basePerson?: BasePerson;
    baseOrganization?: BaseOrganization;

    accessCode?: string;
    assignedDate?: Date; // date, the assigned date for the survey (trips date most of the time)
    contactPhoneNumber?: string; // phone number
    contactEmail?: string; // email

    _startedAt?: Date;
    _updatedAt?: Date;
    _completedAt?: Date;

    _language?: string; // two-letter ISO 639-1 code
    _source?: string; // source for the interview (web, phone, social, etc.)
    _isCompleted?: boolean;

    _device?: Device;

    constructor(params: BaseInterviewAttributes | ExtendedInterviewAttributes) {

        super(params.survey, params.sample, params.sampleBatchNumber, params._uuid);

        this.baseHousehold = params.baseHousehold;
        this.basePerson = params.basePerson;
        this.baseOrganization = params.baseOrganization;

        this.accessCode = params.accessCode;
        this.assignedDate = params.assignedDate;
        this.contactPhoneNumber = params.contactPhoneNumber;
        this.contactEmail = params.contactEmail;

        this._startedAt = params._startedAt;
        this._updatedAt = params._updatedAt;
        this._completedAt = params._completedAt;

        this._language = params._language;
        this._source = params._source;
        this._isCompleted = params._isCompleted;

        this._device = params._device;

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

        // Validate accessCode (if provided)
        if (dirtyParams.accessCode !== undefined && typeof dirtyParams.accessCode !== 'string') {
            errors.push(new Error('BaseInterview validateParams: accessCode should be a string'));
        }

        // Validate _language (if provided)
        if (dirtyParams._language !== undefined && (typeof dirtyParams._language !== 'string' || /^[a-zA-Z]{2}$/.test(dirtyParams._language) === false)) {
            errors.push(new Error('BaseInterview validateParams: _language should be a string of two letters'));
        }

        // Validate _source (if provided)
        if (dirtyParams._source !== undefined && typeof dirtyParams._source !== 'string') {
            errors.push(new Error('BaseInterview validateParams: _source should be a string'));
        }

        // Validate _isCompleted (if provided)
        if (dirtyParams._isCompleted !== undefined && typeof dirtyParams._isCompleted !== 'boolean') {
            errors.push(new Error('BaseInterview validateParams: _isCompleted should be a boolean'));
        }

        // Validate assignedDate (if provided)
        if (dirtyParams.assignedDate !== undefined && (!(dirtyParams.assignedDate instanceof Date) || isNaN(dirtyParams.assignedDate.getDate()))) {
            errors.push(new Error('BaseInterview validateParams: invalid assignedDate'));
        }

        // Validate _startedAt (if provided)
        if (dirtyParams._startedAt !== undefined && (!(dirtyParams._startedAt instanceof Date) || isNaN(dirtyParams._startedAt.getDate()))) {
            errors.push(new Error('BaseInterview validateParams: invalid _startedAt'));
        }

        // Validate _completedAt (if provided)
        if (dirtyParams._completedAt !== undefined && (!(dirtyParams._completedAt instanceof Date) || isNaN(dirtyParams._completedAt.getDate()))) {
            errors.push(new Error('BaseInterview validateParams: invalid _completedAt'));
        }

        // Validate _updatedAt (if provided)
        if (dirtyParams._updatedAt !== undefined && (!(dirtyParams._updatedAt instanceof Date) || isNaN(dirtyParams._updatedAt.getDate()))) {
            errors.push(new Error('BaseInterview validateParams: invalid _updatedAt'));
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

        // Validate contactPhoneNumber (if provided):
        if (dirtyParams.contactPhoneNumber !== undefined) {
            try {
                const parsedPhoneNumber = parsePhoneNumber(dirtyParams.contactPhoneNumber, 'CA');
                if (!parsedPhoneNumber.isValid()) {
                    errors.push(new Error('BaseInterview validateParams: contactPhoneNumber is a phone number but is invalid'));
                }
            } catch (e) {
                errors.push(new Error('BaseInterview validateParams: contactPhoneNumber is not a phone number'));
            }
        }

        // Validate contactEmail (if provided):
        if (dirtyParams.contactEmail !== undefined && !_isEmail(dirtyParams.contactEmail)) {
            errors.push(new Error('BaseInterview validateParams: contactEmail is invalid'));
        }

        // Validate _device (if provided):
        if (dirtyParams._device !== undefined) {
            if (!devices.includes(dirtyParams._device)) {
                errors.push(new Error('BaseInterview validateParams: _device is invalid'));
            }
        }

        return errors;
    }

    // TODO: methods to get started and completed date/time with any format using moment or DateTime



}
