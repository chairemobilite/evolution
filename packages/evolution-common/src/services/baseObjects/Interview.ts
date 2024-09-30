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
import { YesNoDontKnow, yesNoDontKnowValues } from './attributeTypes/GenericAttributes';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { Result, createErrors, createOk } from '../../types/Result.type';

/*
We need to set these arrays to be able to split attributes and custom attributes during initialization.
Using keyof do not work because constructor is run-time and keyof is typescript only.
*/
const interviewAttributes = [
    '_uuid',
    '_id',
    '_participant_id',

    'accessCode',
    'assignedDate',
    'contactPhoneNumber',
    'helpContactPhoneNumber',
    'contactEmail',
    'helpContactEmail',
    'wouldLikeToParticipateInOtherSurveys',

    'respondentComments',
    'interviewerComments',
    'validatorComments',

    'durationRange',
    'durationRespondentEstimationMin',
    'interestRange',
    'difficultyRange',
    'burdenRange',
    'consideredToAbandonRange',

    '_startedAt',
    '_updatedAt',
    '_completedAt',

    '_isValid',
    '_isCompleted',
    '_isQuestionable',

    '_source',
    '_personsRandomSequence',

    '_languages',
    '_browsers',
    '_sections'
];

const interviewAttributesWithComposedAttributes = [
    ...interviewAttributes,
    'household',
    'person',
    'organization'
];

export type InterviewAttributes = {
    _uuid?: string;
    _id?: number; // integer primary key from db
    _participant_id?: number; // integer respondent/participan/user primary key id from db, TODO: update the User class to use this Interview class instead

    accessCode?: string; // accessCode used when starting an interview in most survey. This could be the code sent in a letter for households to be pre-geolocalized
    // TODO: consider using the new luxon package to deal with dates instead of momentJS
    assignedDate?: string; // string, YYYY-MM-DD, the assigned date for the survey (trips date most of the time)
    contactPhoneNumber?: string; // phone number to use to contact the respondent
    helpContactPhoneNumber?: string; // phone number used for help by interviewer/validator only
    contactEmail?: string; // email to use to contact the respondent
    helpContactEmail?: string; // email used for help by interviewer/validator only
    wouldLikeToParticipateInOtherSurveys?: boolean; // boolean, use contactEmail or contactPhoneNumber to add to the mailing list

    respondentComments?: string; // comments on the interview by the respondent
    interviewerComments?: string; // comments on the interview made by the interviewer (phone or in-person)
    validatorComments?: string; // comments on the interview by the validator/admin: TODO: move this to a validation class?

    // for all ranges, negative numbers should be set to undefined/non responded (TODO):
    durationRange?: number; // respondent appreciation of the interview duration (range from short to long)
    durationRespondentEstimationMin?: number; // respondent estimation of the interview duration in minutes
    interestRange?: number; // respondent appreciation of the interview interestfulness (range from boring to very interesting)
    difficultyRange?: number; // respondent appreciation of the interview difficulty (range from very easy to very difficult)
    burdenRange?: number; // respondent appreciation of the interview burden (range from very light to very heavy)
    consideredToAbandonRange?: YesNoDontKnow; // yes/no/dontKnow if the respondent considered to abandon the interview

    _startedAt?: number; // unix epoch timestamp;
    _updatedAt?: number; // unix epoch timestamp;
    _completedAt?: number; // unix epoch timestamp; updated at the end of the interview. Needs auditing before assuming the interview is really completed.

    _isValid?: boolean; // whether the interview is valid (legit) and must be kept for export (true by default, must be set to false by a validator)
    _isCompleted?: boolean; // whether the interview is completed (false by default, changed by validators)
    _isQuestionable?: boolean; // whether the interview is doubtful or could be non genuine, changed by validator

    _source?: string; // source for the interview (web, phone, social, etc.)
    // In a household survey, we need to ask trips for each persons in random order to reduce biases
    _personsRandomSequence?: string[]; // array of person uuids (household members)

    /*
    For languages and browsers, each time a new browser/language is detected, we add the start and end timestamps and
    the language string / browser data.
    */
    _languages?: IAttr.Language[]; // two-letter ISO 639-1 code
    _browsers?: IAttr.Browser[];

    // each time a section is opened, we add a new SectionMetadata object with timestamps
    // TODO: move this to a Log/Metadata class?
    _sections?: { [sectionShortname: string]: IAttr.SectionMetadata[] };
} & UuidableAttributes &
    ValidatebleAttributes;

export type InterviewWithComposedAttributes = InterviewAttributes & {
    household?: Optional<ExtendedHouseholdAttributes>; // TODO: test when Household will be updated to replace BaseHousehold
    person?: Optional<ExtendedPersonAttributes>; // TODO: test when Person will be updated to replace BasePerson
    organization?: Optional<ExtendedOrganizationAttributes>; // TODO: test when Organization will be updated to replace BaseOrganization
};

export type ExtendedInterviewAttributes = InterviewWithComposedAttributes & { [key: string]: unknown };

/**
 * The Interview class represents an interview with metadata.
 * An interview can be associated with an household, a person or an organization. TODO: should we also accept a Vehicle interview?
 * Almost all interview attributes should not be changed during validation/auditing. TODO: make sure they can't be changed while validating/auditing
 * Exceptions: access code, phone numbers, email addresses, validator comments
 */
export class Interview extends Uuidable implements IValidatable {
    private _attributes: InterviewAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _household?: Optional<Household>;
    private _person?: Optional<Person>;
    private _organization?: Optional<Organization>;

    static _confidentialAttributes: string[] = [
        // do not export these attributes except for admins
        '_id', // only the uuid should be exported
        '_participant_id',
        'accessCode', // only keep in admin exports
        'contactPhoneNumber',
        'helpContactPhoneNumber',
        'contactEmail',
        'helpContactEmail',
        'wouldLikeToParticipateInOtherSurveys', // only for analysis/admin exports
        'respondentComments', // only for admin exports
        'interviewerComments', // only for admin exports
        'validatorComments', // only for admin exports
        'durationRange', // only for analysis/admin exports
        'durationRespondentEstimationMin', // only for analysis/admin exports
        'interestRange', // only for analysis/admin exports
        'difficultyRange', // only for analysis/admin exports
        'burdenRange', // only for analysis/admin exports
        'consideredToAbandonRange', // only for analysis/admin exports
        '_isValid', // metadata, only valid interviews should be exported (except for admin exports)
        '_isCompleted', // metadata
        '_isQuestionable', // metadata
        '_startedAt', // metadata
        '_updatedAt', // metadata
        '_completedAt', // metadata
        '_personsRandomSequence', // metadata
        '_languages', // metadata, only choose the most used language during the interview (longest duration) (TODO)
        '_browsers', // metadata, only some of this metadata should be exported, like the device and/or os and/or browser name (TODO)
        '_sections' // metadata
    ];

    constructor(params: ExtendedInterviewAttributes) {
        super(params._uuid);

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

    get _id(): Optional<number> {
        // no setter, comes from the db
        return this._attributes._id;
    }

    get _participant_id(): Optional<number> {
        // no setter, comes from the db
        return this._attributes._participant_id;
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

    get contactEmail(): Optional<string> {
        return this._attributes.contactEmail;
    }

    set contactEmail(value: Optional<string>) {
        this._attributes.contactEmail = value;
    }

    get helpContactEmail(): Optional<string> {
        return this._attributes.helpContactEmail;
    }

    set helpContactEmail(value: Optional<string>) {
        this._attributes.helpContactEmail = value;
    }

    get contactPhoneNumber(): Optional<string> {
        return this._attributes.contactPhoneNumber;
    }

    set contactPhoneNumber(value: Optional<string>) {
        this._attributes.contactPhoneNumber = value;
    }

    get helpContactPhoneNumber(): Optional<string> {
        return this._attributes.helpContactPhoneNumber;
    }

    set helpContactPhoneNumber(value: Optional<string>) {
        this._attributes.helpContactPhoneNumber = value;
    }

    get wouldLikeToParticipateInOtherSurveys(): Optional<boolean> {
        return this._attributes.wouldLikeToParticipateInOtherSurveys;
    }

    set wouldLikeToParticipateInOtherSurveys(value: Optional<boolean>) {
        this._attributes.wouldLikeToParticipateInOtherSurveys = value;
    }

    get respondentComments(): Optional<string> {
        return this._attributes.respondentComments;
    }

    set respondentComments(value: Optional<string>) {
        this._attributes.respondentComments = value;
    }

    get interviewerComments(): Optional<string> {
        return this._attributes.interviewerComments;
    }

    set interviewerComments(value: Optional<string>) {
        this._attributes.interviewerComments = value;
    }

    get validatorComments(): Optional<string> {
        return this._attributes.validatorComments;
    }

    set validatorComments(value: Optional<string>) {
        this._attributes.validatorComments = value;
    }

    get durationRange(): Optional<number> {
        return this._attributes.durationRange;
    }

    set durationRange(value: Optional<number>) {
        this._attributes.durationRange = value;
    }

    get durationRespondentEstimationMin(): Optional<number> {
        return this._attributes.durationRespondentEstimationMin;
    }

    set durationRespondentEstimationMin(value: Optional<number>) {
        this._attributes.durationRespondentEstimationMin = value;
    }

    get interestRange(): Optional<number> {
        return this._attributes.interestRange;
    }

    set interestRange(value: Optional<number>) {
        this._attributes.interestRange = value;
    }

    get difficultyRange(): Optional<number> {
        return this._attributes.difficultyRange;
    }

    set difficultyRange(value: Optional<number>) {
        this._attributes.difficultyRange = value;
    }

    get burdenRange(): Optional<number> {
        return this._attributes.burdenRange;
    }

    set burdenRange(value: Optional<number>) {
        this._attributes.burdenRange = value;
    }

    get consideredToAbandonRange(): Optional<string> {
        return this._attributes.consideredToAbandonRange;
    }

    set consideredToAbandonRange(value: Optional<string>) {
        this._attributes.consideredToAbandonRange = value;
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

    get _isValid(): Optional<boolean> {
        return this._attributes._isValid;
    }

    set _isValid(value: Optional<boolean>) {
        this._attributes._isValid = value;
    }

    get _isCompleted(): Optional<boolean> {
        return this._attributes._isCompleted;
    }

    set _isCompleted(value: Optional<boolean>) {
        this._attributes._isCompleted = value;
    }

    get _isQuestionable(): Optional<boolean> {
        return this._attributes._isQuestionable;
    }

    set _isQuestionable(value: Optional<boolean>) {
        this._attributes._isQuestionable = value;
    }

    get _source(): Optional<string> {
        return this._attributes._source;
    }

    set _source(value: Optional<string>) {
        this._attributes._source = value;
    }

    get _personsRandomSequence(): Optional<string[]> {
        return this._attributes._personsRandomSequence;
    }

    set _personsRandomSequence(value: Optional<string[]>) {
        this._attributes._personsRandomSequence = value;
    }

    get _languages(): Optional<IAttr.Language[]> {
        return this._attributes._languages || [];
    }

    set _languages(value: Optional<IAttr.Language[]>) {
        this._attributes._languages = value || [];
    }

    get _browsers(): Optional<IAttr.Browser[]> {
        return this._attributes._browsers || [];
    }

    set _browsers(value: Optional<IAttr.Browser[]>) {
        this._attributes._browsers = value || [];
    }

    get _sections(): Optional<{ [sectionShortname: string]: IAttr.SectionMetadata[] }> {
        return this._attributes._sections || {};
    }

    set _sections(value: Optional<{ [sectionShortname: string]: IAttr.SectionMetadata[] }>) {
        this._attributes._sections = value || {};
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

    static unserialize(params: ExtendedInterviewAttributes): Interview {
        return new Interview(params);
    }

    static create(dirtyParams: { [key: string]: unknown }): Result<Interview> {
        const errors = Interview.validateParams(dirtyParams);
        const interview = errors.length === 0 ? new Interview(dirtyParams as ExtendedInterviewAttributes) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(interview as Interview);
    }

    // TODO: add getDevice/s() which takes data from browser.platform.type

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

        errors.push(...ParamsValidatorUtils.isPositiveNumber('_id', dirtyParams._id, displayName));
        errors.push(
            ...ParamsValidatorUtils.isPositiveNumber('_participant_id', dirtyParams._participant_id, displayName)
        );

        errors.push(...ParamsValidatorUtils.isString('accessCode', dirtyParams.accessCode, displayName));
        errors.push(...ParamsValidatorUtils.isDateString('assignedDate', dirtyParams.assignedDate, displayName));
        errors.push(
            ...ParamsValidatorUtils.isString('contactPhoneNumber', dirtyParams.contactPhoneNumber, displayName)
        );
        errors.push(
            ...ParamsValidatorUtils.isString('helpContactPhoneNumber', dirtyParams.helpContactPhoneNumber, displayName)
        );
        // TODO: we should test for valid email format, but we first need to make sure the email validation is correct in the frontend
        errors.push(...ParamsValidatorUtils.isString('contactEmail', dirtyParams.contactEmail, displayName));
        errors.push(...ParamsValidatorUtils.isString('helpContactEmail', dirtyParams.helpContactEmail, displayName));
        errors.push(
            ...ParamsValidatorUtils.isBoolean(
                'wouldLikeToParticipateInOtherSurveys',
                dirtyParams.wouldLikeToParticipateInOtherSurveys,
                displayName
            )
        );
        errors.push(...ParamsValidatorUtils.isString('respondentComments', dirtyParams.respondentComments, displayName));
        errors.push(
            ...ParamsValidatorUtils.isString(
                'interviewerComments',
                dirtyParams.interviewerComments,
                displayName
            )
        );
        errors.push(
            ...ParamsValidatorUtils.isString(
                'validatorComments',
                dirtyParams.validatorComments,
                displayName
            )
        );

        errors.push(...ParamsValidatorUtils.isPositiveInteger('durationRange', dirtyParams.durationRange, displayName));
        errors.push(...ParamsValidatorUtils.isPositiveInteger('durationRespondentEstimationMin', dirtyParams.durationRespondentEstimationMin, displayName));
        errors.push(...ParamsValidatorUtils.isPositiveInteger('interestRange', dirtyParams.interestRange, displayName));
        errors.push(...ParamsValidatorUtils.isPositiveInteger('difficultyRange', dirtyParams.difficultyRange, displayName));
        errors.push(...ParamsValidatorUtils.isPositiveInteger('burdenRange', dirtyParams.burdenRange, displayName));
        errors.push(...ParamsValidatorUtils.isIn('consideredToAbandonRange', dirtyParams.consideredToAbandonRange, displayName, yesNoDontKnowValues, 'YesNoDontKnow'));

        // TODO: also check if start/end timestamps are inside the survey period:
        errors.push(...ParamsValidatorUtils.isPositiveInteger('_startedAt', dirtyParams._startedAt, displayName));
        errors.push(...ParamsValidatorUtils.isPositiveInteger('_updatedAt', dirtyParams._updatedAt, displayName));
        errors.push(...ParamsValidatorUtils.isPositiveInteger('_completedAt', dirtyParams._completedAt, displayName));

        errors.push(...ParamsValidatorUtils.isBoolean('_isValid', dirtyParams._isValid, displayName));
        errors.push(...ParamsValidatorUtils.isBoolean('_isCompleted', dirtyParams._isCompleted, displayName));
        errors.push(...ParamsValidatorUtils.isBoolean('_isQuestionable', dirtyParams._isQuestionable, displayName));

        errors.push(...ParamsValidatorUtils.isString('_source', dirtyParams._source, displayName));
        errors.push(
            ...ParamsValidatorUtils.isArrayOfStrings(
                '_personsRandomSequence',
                dirtyParams._personsRandomSequence,
                displayName
            )
        );

        errors.push(...ParamsValidatorUtils.isArray('_languages', dirtyParams._languages, displayName));
        for (let i = 0; i < (dirtyParams._languages as any[] || []).length; i++) {
            const language = (dirtyParams._languages as any[])[i];
            errors.push(...ParamsValidatorUtils.isString(`_languages.[${i}].language`, language.language, displayName));
            errors.push(
                ...ParamsValidatorUtils.isPositiveInteger(
                    `_languages.[${i}].startTimestamp`,
                    language.startTimestamp,
                    displayName
                )
            );
            errors.push(
                ...ParamsValidatorUtils.isPositiveInteger(
                    `_languages.[${i}].endTimestamp`,
                    language.endTimestamp,
                    displayName
                )
            );
        }
        errors.push(...ParamsValidatorUtils.isArray('_browsers', dirtyParams._browsers, displayName));
        for (let i = 0; i < (dirtyParams._browsers as any[] || []).length; i++) {
            const browser = (dirtyParams._browsers as any[])[i];
            errors.push(...ParamsValidatorUtils.isString(`_browsers.[${i}]._ua`, browser._ua, displayName));
            if (browser.browser) {
                errors.push(
                    ...ParamsValidatorUtils.isString(`_browsers.[${i}].browser.name`, browser.browser.name, displayName)
                );
                errors.push(
                    ...ParamsValidatorUtils.isString(
                        `_browsers.[${i}].browser.version`,
                        browser.browser.version,
                        displayName
                    )
                );
            }
            if (browser.engine) {
                errors.push(
                    ...ParamsValidatorUtils.isString(`_browsers.[${i}].engine.name`, browser.engine.name, displayName)
                );
                errors.push(
                    ...ParamsValidatorUtils.isString(
                        `_browsers.[${i}].engine.version`,
                        browser.engine.version,
                        displayName
                    )
                );
            }
            if (browser.os) {
                errors.push(...ParamsValidatorUtils.isString(`_browsers.[${i}].os.name`, browser.os.name, displayName));
                errors.push(
                    ...ParamsValidatorUtils.isString(`_browsers.[${i}].os.version`, browser.os.version, displayName)
                );
                errors.push(
                    ...ParamsValidatorUtils.isString(
                        `_browsers.[${i}].os.versionName`,
                        browser.os.versionName,
                        displayName
                    )
                );
            }
            if (browser.platform) {
                errors.push(
                    ...ParamsValidatorUtils.isString(
                        `_browsers.[${i}].platform.model`,
                        browser.platform.model,
                        displayName
                    )
                );
                errors.push(
                    ...ParamsValidatorUtils.isString(
                        `_browsers.[${i}].platform.type`,
                        browser.platform.type,
                        displayName
                    )
                );
                errors.push(
                    ...ParamsValidatorUtils.isString(
                        `_browsers.[${i}].platform.vendor`,
                        browser.platform.vendor,
                        displayName
                    )
                );
            }
            errors.push(
                ...ParamsValidatorUtils.isPositiveInteger(
                    `_browsers.[${i}].startTimestamp`,
                    browser.startTimestamp,
                    displayName
                )
            );
            errors.push(
                ...ParamsValidatorUtils.isPositiveInteger(
                    `_browsers.[${i}].endTimestamp`,
                    browser.endTimestamp,
                    displayName
                )
            );
        }

        errors.push(...ParamsValidatorUtils.isObject('_sections', dirtyParams._sections, displayName));
        for (const sectionShortname in dirtyParams._sections as any[]) {
            const sections = dirtyParams._sections?.[sectionShortname] || [];
            if (sections) {
                for (let i = 0; i < sections.length; i++) {
                    const section = sections[i];
                    // TODO: check that section shortnames are indeed valid for the survey
                    errors.push(
                        ...ParamsValidatorUtils.isObject(
                            `_sections.${sectionShortname}.[${i}].widgets`,
                            section.widgets,
                            displayName
                        )
                    );
                    errors.push(
                        ...ParamsValidatorUtils.isPositiveInteger(
                            `_sections.${sectionShortname}.[${i}].startTimestamp`,
                            section.startTimestamp,
                            displayName
                        )
                    );
                    errors.push(
                        ...ParamsValidatorUtils.isPositiveInteger(
                            `_sections.${sectionShortname}.[${i}].endTimestamp`,
                            section.endTimestamp,
                            displayName
                        )
                    );
                    for (const widgetShortname in section.widgets as any[]) {
                        const widgets = section.widgets[widgetShortname] || [];
                        if (widgets) {
                            for (let j = 0; j < widgets.length; j++) {
                                const widget = widgets[j];
                                // TODO: check that widget shortnames/paths? are indeed valid for the survey
                                errors.push(
                                    ...ParamsValidatorUtils.isPositiveInteger(
                                        `_sections.${sectionShortname}.[${i}].widgets.${widgetShortname}.[${j}].startTimestamp`,
                                        widget.startTimestamp,
                                        displayName
                                    )
                                );
                                errors.push(
                                    ...ParamsValidatorUtils.isPositiveInteger(
                                        `_sections.${sectionShortname}.[${i}].widgets.${widgetShortname}.[${j}].endTimestamp`,
                                        widget.endTimestamp,
                                        displayName
                                    )
                                );
                            }
                        }
                    }
                }
            }
        }

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
