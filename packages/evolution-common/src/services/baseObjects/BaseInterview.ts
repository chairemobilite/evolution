/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../types/Optional.type';
import { IValidatable } from './IValidatable';
import { Surveyable, SurveyableAttributes } from './Surveyable';
import { Survey, SurveyAttributes } from './Survey';
import { Sample, SampleAttributes } from './Sample';
import { Uuidable } from './Uuidable';
import { parseDate } from '../../utils/DateUtils';

export const devices = ['tablet', 'mobile', 'desktop', 'other', 'unknown'] as const;

export type Device = (typeof devices)[number];

export type BaseInterviewAttributes = {
    _uuid?: string;

    accessCode?: string;
    assignedDate?: string; // string, YYYY-MM-DD, the assigned date for the survey (trips date most of the time)
    contactPhoneNumber?: string; // phone number
    contactEmail?: string; // email

    _startedAt?: Date | string;
    _updatedAt?: Date | string;
    _completedAt?: Date | string;

    _language?: string; // two-letter ISO 639-1 code
    _source?: string; // source for the interview (web, phone, social, etc.)
    _isCompleted?: boolean;

    _device?: Device;
};

export type ExtendedInterviewAttributes = BaseInterviewAttributes & { [key: string]: any };

export class BaseInterview extends Surveyable implements IValidatable {
    _isValid: Optional<boolean>;

    accessCode?: string;
    assignedDate?: string; // string YYYY-MM-DD, the assigned date for the survey (trips date most of the time)
    contactPhoneNumber?: string; // phone number
    contactEmail?: string; // email

    _startedAt?: Date;
    _updatedAt?: Date;
    _completedAt?: Date;

    _language?: string; // two-letter ISO 639-1 code
    _source?: string; // source for the interview (web, phone, social, etc.)
    _isCompleted?: boolean;

    _device?: Device;

    _confidentialAttributes: string[] = [
        // these attributes should be hidden when exporting
        'contactPhoneNumber',
        'contactEmail',
        'accessCode'
    ];

    constructor(params: (BaseInterviewAttributes | ExtendedInterviewAttributes) & SurveyableAttributes) {
        super(params.survey, params.sample, params.sampleBatchNumber, params._uuid);

        this.accessCode = params.accessCode;
        this.assignedDate = params.assignedDate; // parseDate(params.assignedDate);
        this.contactPhoneNumber = params.contactPhoneNumber;
        this.contactEmail = params.contactEmail;

        this._startedAt = parseDate(params._startedAt);
        this._updatedAt = parseDate(params._updatedAt);
        this._completedAt = parseDate(params._completedAt);

        this._language = params._language;
        this._source = params._source;
        this._isCompleted = params._isCompleted;

        this._device = params._device;
    }

    // params must be sanitized and must be valid:
    static unserialize(
        params: BaseInterviewAttributes & {
            survey: SurveyAttributes;
            sample: SampleAttributes;
            sampleBatchNumber?: number;
        }
    ): BaseInterview {
        const survey = Survey.unserialize(params.survey);
        const sample = Sample.unserialize(params.sample);
        return new BaseInterview({ ...params, survey, sample, sampleBatchNumber: params.sampleBatchNumber });
    }

    validate(): Optional<boolean> {
        // TODO: implement:
        this._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
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
        return errors.length > 0
            ? errors
            : new BaseInterview(dirtyParams as ExtendedInterviewAttributes & SurveyableAttributes);
    }

    /**
     * Validates attribute types for BaseInterview.
     * Any failing validation should prevent the creation of the object.
     * Validations that should not prevent the creation of the object
     * should be moved to survey audits.
     * @param dirtyParams The parameters to validate.
     * @returns Error[] TODO: specialize this error class
     */
    static validateParams(dirtyParams: { [key: string]: any }): Error[] {
        const errors: Error[] = [];

        dirtyParams._startedAt = parseDate(dirtyParams._startedAt);
        dirtyParams._updatedAt = parseDate(dirtyParams._updatedAt);
        dirtyParams._completedAt = parseDate(dirtyParams._completedAt);

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
        if (
            dirtyParams._language !== undefined &&
            (typeof dirtyParams._language !== 'string' || /^[a-zA-Z]{2}$/.test(dirtyParams._language) === false)
        ) {
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

        const assignedDateObj = parseDate(dirtyParams.assignedDate);
        // Validate assignedDate (if provided)
        if (
            dirtyParams.assignedDate !== undefined &&
            (!(assignedDateObj instanceof Date) || (assignedDateObj !== undefined && isNaN(assignedDateObj.getDate())))
        ) {
            errors.push(new Error('BaseInterview validateParams: assignedDate should be a valid date string'));
        }

        // Validate _startedAt (if provided)
        if (
            dirtyParams._startedAt !== undefined &&
            (!(dirtyParams._startedAt instanceof Date) || isNaN(dirtyParams._startedAt.getDate()))
        ) {
            errors.push(new Error('BaseInterview validateParams: invalid _startedAt'));
        }

        // Validate _completedAt (if provided)
        if (
            dirtyParams._completedAt !== undefined &&
            (!(dirtyParams._completedAt instanceof Date) || isNaN(dirtyParams._completedAt.getDate()))
        ) {
            errors.push(new Error('BaseInterview validateParams: invalid _completedAt'));
        }

        // Validate _updatedAt (if provided)
        if (
            dirtyParams._updatedAt !== undefined &&
            (!(dirtyParams._updatedAt instanceof Date) || isNaN(dirtyParams._updatedAt.getDate()))
        ) {
            errors.push(new Error('BaseInterview validateParams: invalid _updatedAt'));
        }

        // Validate contactPhoneNumber (if provided):
        // Precise phone number validation must be done in audits, because incorrect phone number should not prevent the interview from being created.
        if (dirtyParams.contactPhoneNumber !== undefined && typeof dirtyParams.contactPhoneNumber !== 'string') {
            errors.push(new Error('BaseInterview validateParams: contactPhoneNumber should be a string'));
        }

        // Validate contactEmail (if provided):
        // Regex email validation must be done in audits, because incorrect email should not prevent the interview from being created.
        if (dirtyParams.contactEmail !== undefined && typeof dirtyParams.contactEmail !== 'string') {
            errors.push(new Error('BaseInterview validateParams: contactEmail should be a string'));
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
