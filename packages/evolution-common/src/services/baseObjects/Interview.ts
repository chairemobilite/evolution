/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../types/Optional.type';
import { IValidatable, ValidatebleAttributes } from './IValidatable';
import { Uuidable, UuidableAttributes } from './Uuidable';
import { Household, ExtendedHouseholdAttributes } from './Household';
import { Person, ExtendedPersonAttributes } from './Person';
import { Organization, ExtendedOrganizationAttributes } from './Organization';
import * as IAttr from './attributeTypes/InterviewAttributes';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';

export const interviewAttributes = [
    '_isValid',
    '_uuid',
    'accessCode',
    'assignedDate',
    'contactPhoneNumber',
    'contactEmail',
    'wouldLikeToParticipateInOtherSurveys',
    '_startedAt',
    '_updatedAt',
    '_completedAt',
    '_language',
    '_source',
    '_isCompleted',
    '_device'
];

export const interviewAttributesWithComposedAttributes = [
    ...interviewAttributes,
    'household',
    'person',
    'organization'
];

export type InterviewAttributes = {
    accessCode?: string;
    assignedDate?: string; // string, YYYY-MM-DD, the assigned date for the survey (trips date most of the time)
    contactPhoneNumber?: string; // phone number
    contactEmail?: string; // email
    wouldLikeToParticipateInOtherSurveys?: boolean; // boolean

    _startedAt?: number; // timestamp;
    _updatedAt?: number; // timestamp;
    _completedAt?: number; // timestamp;

    _language?: string; // two-letter ISO 639-1 code
    _source?: string; // source for the interview (web, phone, social, etc.)
    _isCompleted?: boolean;

    _device?: IAttr.Device;
} & UuidableAttributes &
    ValidatebleAttributes;

export type InterviewWithComposedAttributes = InterviewAttributes & {
    household?: Optional<ExtendedHouseholdAttributes>;
    person?: Optional<ExtendedPersonAttributes>;
    organization?: Optional<ExtendedOrganizationAttributes>;
};

export type ExtendedInterviewAttributes = InterviewWithComposedAttributes & { [key: string]: unknown };

/**
 * The Interview class represents an interview with metadata.
 * An interview can be asociated with an household, a person or an organization.
 */
export class Interview implements IValidatable {
    private _attributes: InterviewAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _household?: Optional<Household>;
    private _person?: Optional<Person>;
    private _organization?: Optional<Organization>;

    static _confidentialAttributes = ['contactPhoneNumber', 'contactEmail'];

    constructor(params: ExtendedInterviewAttributes) {
        params._uuid = Uuidable.getUuid(params._uuid);

        this._attributes = {} as InterviewAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            params,
            interviewAttributes,
            interviewAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.household = ConstructorUtils.initializeComposedAttribute(params.household, Household.unserialize);

        this.person = ConstructorUtils.initializeComposedAttribute(params.person, Person.unserialize);

        this.organization = ConstructorUtils.initializeComposedAttribute(params.organization, Organization.unserialize);
    }

    get attributes(): InterviewAttributes {
        return this._attributes;
    }

    get customAttributes(): { [key: string]: unknown } {
        return this._customAttributes;
    }

    get _uuid(): Optional<string> {
        return this._attributes._uuid;
    }

    get _isValid(): Optional<boolean> {
        return this._attributes._isValid;
    }

    set _isValid(value: Optional<boolean>) {
        this._attributes._isValid = value;
    }

    get accessCode(): Optional<string> {
        return this._attributes.accessCode;
    }

    set accessCode(value: Optional<string>) {
        this._attributes.accessCode = value;
    }

    get assignedDate(): Optional<string> {
        return this._attributes.assignedDate;
    }

    set assignedDate(value: Optional<string>) {
        this._attributes.assignedDate = value;
    }

    get contactPhoneNumber(): Optional<string> {
        return this._attributes.contactPhoneNumber;
    }

    set contactPhoneNumber(value: Optional<string>) {
        this._attributes.contactPhoneNumber = value;
    }

    get contactEmail(): Optional<string> {
        return this._attributes.contactEmail;
    }

    set contactEmail(value: Optional<string>) {
        this._attributes.contactEmail = value;
    }

    get wouldLikeToParticipateInOtherSurveys(): Optional<boolean> {
        return this._attributes.wouldLikeToParticipateInOtherSurveys;
    }

    set wouldLikeToParticipateInOtherSurveys(value: Optional<boolean>) {
        this._attributes.wouldLikeToParticipateInOtherSurveys = value;
    }

    get _startedAt(): Optional<number> {
        return this._attributes._startedAt;
    }

    set _startedAt(value: Optional<number>) {
        this._attributes._startedAt = value;
    }

    get _updatedAt(): Optional<number> {
        return this._attributes._updatedAt;
    }

    set _updatedAt(value: Optional<number>) {
        this._attributes._updatedAt = value;
    }

    get _completedAt(): Optional<number> {
        return this._attributes._completedAt;
    }

    set _completedAt(value: Optional<number>) {
        this._attributes._completedAt = value;
    }

    get _language(): Optional<string> {
        return this._attributes._language;
    }

    set _language(value: Optional<string>) {
        this._attributes._language = value;
    }

    get _source(): Optional<string> {
        return this._attributes._source;
    }

    set _source(value: Optional<string>) {
        this._attributes._source = value;
    }

    get _isCompleted(): Optional<boolean> {
        return this._attributes._isCompleted;
    }

    set _isCompleted(value: Optional<boolean>) {
        this._attributes._isCompleted = value;
    }

    get _device(): Optional<IAttr.Device> {
        return this._attributes._device;
    }

    set _device(value: Optional<IAttr.Device>) {
        this._attributes._device = value;
    }

    get household(): Optional<Household> {
        return this._household;
    }

    set household(value: Optional<Household>) {
        this._household = value;
    }

    get person(): Optional<Person> {
        return this._person;
    }

    set person(value: Optional<Person>) {
        this._person = value;
    }

    get organization(): Optional<Organization> {
        return this._organization;
    }

    set organization(value: Optional<Organization>) {
        this._organization = value;
    }

    static unserialize(params: InterviewWithComposedAttributes): Interview {
        return new Interview(params);
    }

    static create(dirtyParams: { [key: string]: unknown }): Result<Interview> {
        const errors = Interview.validateParams(dirtyParams);
        const interview = errors.length === 0 ? new Interview(dirtyParams) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(interview as Interview);
    }

    validate(): Optional<boolean> {
        this._attributes._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }

    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'Interview'): Error[] {
        const errors: Error[] = [];

        errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
        errors.push(...ParamsValidatorUtils.isObject('params', dirtyParams, displayName));

        errors.push(...Uuidable.validateParams(dirtyParams));

        errors.push(...ParamsValidatorUtils.isBoolean('_isValid', dirtyParams._isValid, displayName));

        errors.push(...ParamsValidatorUtils.isString('accessCode', dirtyParams.accessCode, displayName));

        errors.push(...ParamsValidatorUtils.isDateString('assignedDate', dirtyParams.assignedDate, displayName));

        errors.push(
            ...ParamsValidatorUtils.isString('contactPhoneNumber', dirtyParams.contactPhoneNumber, displayName)
        );

        errors.push(...ParamsValidatorUtils.isString('contactEmail', dirtyParams.contactEmail, displayName));

        errors.push(
            ...ParamsValidatorUtils.isBoolean(
                'wouldLikeToParticipateInOtherSurveys',
                dirtyParams.wouldLikeToParticipateInOtherSurveys,
                displayName
            )
        );

        errors.push(...ParamsValidatorUtils.isPositiveInteger('_startedAt', dirtyParams._startedAt, displayName));

        errors.push(...ParamsValidatorUtils.isPositiveInteger('_updatedAt', dirtyParams._updatedAt, displayName));

        errors.push(...ParamsValidatorUtils.isPositiveInteger('_completedAt', dirtyParams._completedAt, displayName));

        errors.push(...ParamsValidatorUtils.isString('_language', dirtyParams._language, displayName));

        errors.push(...ParamsValidatorUtils.isString('_source', dirtyParams._source, displayName));

        errors.push(...ParamsValidatorUtils.isBoolean('_isCompleted', dirtyParams._isCompleted, displayName));

        errors.push(...ParamsValidatorUtils.isString('_device', dirtyParams._device, displayName));

        const householdAttributes =
            dirtyParams.household !== undefined ? (dirtyParams.household as { [key: string]: unknown }) : {};
        errors.push(...Household.validateParams(householdAttributes, 'Household'));

        const personAttributes =
            dirtyParams.person !== undefined ? (dirtyParams.person as { [key: string]: unknown }) : {};
        errors.push(...Person.validateParams(personAttributes, 'Person'));

        const organizationAttributes =
            dirtyParams.organization !== undefined ? (dirtyParams.organization as { [key: string]: unknown }) : {};
        errors.push(...Organization.validateParams(organizationAttributes, 'Organization'));

        return errors;
    }
}
