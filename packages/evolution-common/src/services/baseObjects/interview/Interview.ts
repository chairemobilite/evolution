/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _omit from 'lodash/omit';

import { Optional } from '../../../types/Optional.type';
import { Uuidable, UuidableAttributes } from '../Uuidable';
import { YesNoDontKnow } from '../attributeTypes/GenericAttributes';
import { ConstructorUtils } from '../../../utils/ConstructorUtils';
import {
    ExtendedInterviewParadataAttributes,
    InterviewParadata,
    InterviewParadataAttributes
} from './InterviewParadata';
import { InterviewAttributes as rawInterviewAttributes } from '../../../services/questionnaire/types';
import { SurveyObjectUnserializer } from '../SurveyObjectUnserializer';
import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';

/*
We need to set these arrays to be able to split attributes and custom attributes during initialization.
Using keyof do not work because constructor is run-time and keyof is typescript only.
*/
const interviewAttributesNames = [
    '_uuid',
    '_id',
    '_participant_id',

    // reviewing flags
    '_isValid',
    '_isCompleted',
    '_isQuestionable',
    '_isValidated',

    'accessCode',
    'assignedDate',
    'contactPhoneNumber',
    'helpContactPhoneNumber',
    'contactEmail',
    'helpContactEmail',
    'acceptToBeContactedForHelp',
    'wouldLikeToParticipateInOtherSurveys',

    'respondentComments',
    'interviewerComments',
    'auditorComments',

    'durationRange',
    'durationRespondentEstimationMin',
    'interestRange',
    'difficultyRange',
    'burdenRange',
    'consideredAbandoning'
];

const interviewAttributesWithComposedAttributes = [...interviewAttributesNames, '_paradata'];

export type InterviewAttributes = {
    _uuid?: string; // TODO: discuss whether the original and audited should have the same uuid
    _id?: number; // integer primary key from db.
    _participant_id?: number; // integer respondent/participan/user primary key id from db, TODO: update the User class to use this Interview class instead

    // reviewing flags
    _isValid?: boolean; // whether the interview is valid (legit) and must be kept for export (true by default, must be set to false by a validator)
    _isCompleted?: boolean; // whether the interview is completed (false by default, changed by validators)
    _isQuestionable?: boolean; // whether the interview is doubtful or could be non genuine, changed by validator
    _isValidated?: boolean; // whether the interview is validated (undefined by default, must be set to false by an admin or supervisor/super validator)

    // response attributes
    accessCode?: string; // accessCode used when starting an interview in most survey. This could be the code sent in a letter for households to be pre-geolocalized
    // TODO: consider using the new luxon package to deal with dates instead of momentJS
    assignedDate?: string; // string, YYYY-MM-DD, the assigned date for the survey (trips date most of the time)
    contactPhoneNumber?: string; // phone number to use to contact the respondent
    helpContactPhoneNumber?: string; // phone number used for help by interviewer/auditor only
    contactEmail?: string; // email to use to contact the respondent
    helpContactEmail?: string; // email used for help by interviewer/auditor person only
    acceptToBeContactedForHelp?: boolean; // boolean, consent to be contacted for help or follow-up
    wouldLikeToParticipateInOtherSurveys?: boolean; // boolean, use contactEmail or contactPhoneNumber to add to the mailing list

    respondentComments?: string; // comments on the interview by the respondent
    interviewerComments?: string; // comments on the interview made by the interviewer (phone or in-person)
    auditorComments?: string; // comments on the interview by the auditor/admin person: TODO: move this to a validation class?

    // for all ranges, negative numbers should be set to undefined/non responded (TODO):
    durationRange?: number; // respondent appreciation of the interview duration (range from short to long)
    durationRespondentEstimationMin?: number; // respondent estimation of the interview duration in minutes
    interestRange?: number; // respondent appreciation of the interview interestfulness (range from boring to very interesting)
    difficultyRange?: number; // respondent appreciation of the interview difficulty (range from very easy to very difficult)
    burdenRange?: number; // respondent appreciation of the interview burden (range from very light to very heavy)
    consideredAbandoning?: YesNoDontKnow; // yes/no/dontKnow if the respondent considered abandoning the interview
} & UuidableAttributes;

export type InterviewWithComposedObjects = InterviewAttributes & {
    _paradata?: Optional<InterviewParadataAttributes>;
};

/**
 * Any non standard/custom attribute not included in the evolution framework should be added
 * by the survey application itself. The "{ [key: string]: unknown }" is for these custom attributes.
 * The survey application should include all validation/auditing for these custom attributes/questions.
 * The survey app should generate a separated custom interview table for these custom attributes.
 * These interview custom data will not be comparable between surveys.
 * TODO: document the process of creating custom widgets with audits and enhancements
 */
export type ExtendedInterviewAttributesWithComposedObjects = InterviewWithComposedObjects & { [key: string]: unknown };

export type SerializedExtendedInterviewAttributesWithComposedObjects = {
    _attributes?: ExtendedInterviewAttributesWithComposedObjects;
    _customAttributes?: { [key: string]: unknown };
};

/**
 * Represents an interview in the survey.
 *
 * @class
 * @description
 * An interview can be associated with an household, a person or an organization. TODO: should we also accept a Vehicle interview?
 *
 * The Interview class is central to the survey process, handling data throughout various stages:
 *
 * 1. Interview Step:
 *    - The Interview object is progressively filled with respondent response.
 *    - Paradata is collected throughout the interview process.
 *    - Both interview data and paradata (interview metadata) are stored in the Interview instance.
 *
 * 2a. Audit Step:
 *    - When an admin/auditor person opens the auditing dashboard:
 *      a. The interview is loaded in auditing mode. This involves cloning the interview
 *         object to keep the original response intact. The copy has isAuditingVersion
 *         flag set to true in the db. This copy will includes any change made by the admin/auditor person.
 *         TODO: consider using db views to separate interviews based on the isAuditingVersion flag.
 *      b. An automatic auditing/enhancement process runs on the backend.
 *      c. Audit results are saved with the interview, creating an InterviewAudited object.
 *      d. The InterviewAudited object is sent back to the frontend.
 *    - The admin/auditing dashboard displays:
 *      a. A summary of the interview and its paradata.
 *      b. Any audits added during the auditing process (if any).
 *
 * 2b. Enhancement Step (done at the same time as the audit):
 *    - During the enhancement process:
 *      a. New attributes are generated as composites of existing attributes.
 *      b. Interview durations and other metadata statistics are calculated.
 *    - These enhancements prepare the interview data for export.
 *
 * 3. Weighting Step:
 *    - Note: The Interview class itself is not involved in weighting.
 *    - Weighting is applied to other objects like Household, Person, Trip, etc.
 *    - This process adjusts object weights to match the reference population.
 *
 * 4. Exporting Step:
 *    - After audit, enhancement and weighting:
 *      a. The export process is initiated from the admin frontend.
 *      b. InterviewAudited data, along with related objects, is prepared for export.
 *
 * Some naming conventions:
 * - Audit: done after the interview is completed or abandoned by the respondent
 * - Validation: done real-time during the interview itself when filled by the respondent or an interviewer
 *
 * This class primarily handles data for step 1 (alongside InterviewParadata).
 * The InterviewAudited class handles data for steps 2, 3 and 4.
 */
export class Interview extends Uuidable {
    private _surveyObjectsRegistry: SurveyObjectsRegistry;
    private _attributes: InterviewAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _paradata?: Optional<InterviewParadata>;

    static _confidentialAttributes: string[] = [
        // do not export these attributes except for admins
        '_id', // only the uuid should be exported
        '_participant_id',
        'accessCode', // only for admin exports
        'contactPhoneNumber', // only for admin exports
        'helpContactPhoneNumber', // only for admin exports
        'contactEmail', // only for admin exports
        'helpContactEmail', // only for admin exports
        'acceptToBeContactedForHelp', // only for analysis/admin exports
        'wouldLikeToParticipateInOtherSurveys', // only for analysis/admin exports
        'respondentComments', // only for admin exports
        'interviewerComments', // only for admin exports
        'auditorComments', // only for admin exports
        'durationRange', // only for analysis/admin exports
        'durationRespondentEstimationMin', // only for analysis/admin exports
        'interestRange', // only for analysis/admin exports
        'difficultyRange', // only for analysis/admin exports
        'burdenRange', // only for analysis/admin exports
        'consideredAbandoning' // only for analysis/admin exports
    ];

    // Use InterviewUnserializer create function to generate/validate Interview object from json data with nested composed objects
    constructor(
        params: ExtendedInterviewAttributesWithComposedObjects,
        interviewAttributes: rawInterviewAttributes,
        surveyObjectsRegistry: SurveyObjectsRegistry
    ) {
        super(interviewAttributes.uuid || params._uuid);

        this._surveyObjectsRegistry = surveyObjectsRegistry;

        this._attributes = {} as InterviewAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            _omit(params, [
                '_paradata',
                'paradata',
                '_language', // TODO: remove this once we have migrated all interviews to the new paradata structure
                '_languages', // TODO: remove this once we have migrated all interviews to the new paradata structure
                '_browser', // TODO use an array instead of a single browser in survey
                '_startedAt',
                '_updatedAt',
                '_completedAt',
                '_source',
                '_personRandomSequence',
                '_sections'
            ]),
            interviewAttributesNames,
            interviewAttributesWithComposedAttributes
        );

        this._attributes = attributes;
        this._attributes._id = interviewAttributes.id;
        this._attributes._participant_id = interviewAttributes.participant_id;
        this._attributes._isValid = interviewAttributes.is_valid;
        this._attributes._isCompleted = interviewAttributes.is_completed;
        this._attributes._isQuestionable = interviewAttributes.is_questionable;
        this._attributes._isValidated = interviewAttributes.is_validated;

        this._customAttributes = customAttributes;

        this._paradata = ConstructorUtils.initializeComposedAttribute(
            params._paradata === undefined ? Interview.extractDirtyParadataParams(params) : params._paradata,
            (_paradataParams) =>
                InterviewParadata.unserialize(
                    _paradataParams as ExtendedInterviewParadataAttributes,
                    this._surveyObjectsRegistry
                ),
            this._surveyObjectsRegistry
        );

        this._surveyObjectsRegistry.registerInterview(this);
    }

    get attributes(): InterviewAttributes {
        return this._attributes;
    }

    get customAttributes(): { [key: string]: unknown } {
        return this._customAttributes;
    }

    // Getters and setters for the attributes dictionary:

    get id(): Optional<number> {
        // no setter, comes from the db
        return this._attributes._id;
    }

    get participant_id(): Optional<number> {
        // no setter, comes from the db
        return this._attributes._participant_id;
    }

    get isValid(): Optional<boolean> {
        return this._attributes._isValid;
    }

    set isValid(value: Optional<boolean>) {
        this._attributes._isValid = value;
    }

    get isCompleted(): Optional<boolean> {
        return this._attributes._isCompleted;
    }

    set isCompleted(value: Optional<boolean>) {
        this._attributes._isCompleted = value;
    }

    get isQuestionable(): Optional<boolean> {
        return this._attributes._isQuestionable;
    }

    set isQuestionable(value: Optional<boolean>) {
        this._attributes._isQuestionable = value;
    }

    get isValidated(): Optional<boolean> {
        return this._attributes._isValidated;
    }

    set isValidated(value: Optional<boolean>) {
        this._attributes._isValidated = value;
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

    get acceptToBeContactedForHelp(): Optional<boolean> {
        return this._attributes.acceptToBeContactedForHelp;
    }

    set acceptToBeContactedForHelp(value: Optional<boolean>) {
        this._attributes.acceptToBeContactedForHelp = value;
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

    get auditorComments(): Optional<string> {
        return this._attributes.auditorComments;
    }

    set auditorComments(value: Optional<string>) {
        this._attributes.auditorComments = value;
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

    get consideredAbandoning(): Optional<string> {
        return this._attributes.consideredAbandoning;
    }

    set consideredAbandoning(value: Optional<string>) {
        this._attributes.consideredAbandoning = value;
    }

    get paradata(): Optional<InterviewParadata> {
        return this._paradata;
    }

    set paradata(value: Optional<InterviewParadata>) {
        this._paradata = value;
    }

    /**
     * Creates an Interview object from sanitized parameters
     * This method is used for unserialization when the Interview object comes from serialized data
     * @param {ExtendedInterviewAttributesWithComposedObjects | SerializedExtendedInterviewAttributesWithComposedObjects} params - Sanitized interview parameters
     * @param {rawInterviewAttributes} interviewAttributes - Raw interview attributes from database
     * @returns {Interview} New Interview instance
     */
    static unserialize(
        params:
            | ExtendedInterviewAttributesWithComposedObjects
            | SerializedExtendedInterviewAttributesWithComposedObjects,
        surveyObjectsRegistry: SurveyObjectsRegistry,
        interviewAttributes?: rawInterviewAttributes
    ): Interview {
        // If we have serialized data, flatten it first
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);

        // If interviewAttributes are not provided, extract them from the flattened params
        let rawInterviewAttributes: rawInterviewAttributes;
        if (interviewAttributes) {
            rawInterviewAttributes = interviewAttributes;
        } else {
            // Extract the raw interview attributes from the flattened params
            const flattenedParamsAny = flattenedParams as Record<string, unknown>;
            rawInterviewAttributes = {
                id: flattenedParamsAny._id as number,
                uuid: flattenedParamsAny._uuid as string,
                participant_id: flattenedParamsAny._participant_id as number,
                is_completed: flattenedParamsAny._isCompleted as boolean,
                response: flattenedParamsAny.response || {},
                validations: flattenedParamsAny.validations || {},
                is_valid: flattenedParamsAny._isValid as boolean,
                is_questionable: flattenedParamsAny._isQuestionable as boolean,
                is_validated: flattenedParamsAny._isValidated as boolean
            };
        }

        return new Interview(
            flattenedParams as ExtendedInterviewAttributesWithComposedObjects,
            rawInterviewAttributes,
            surveyObjectsRegistry
        );
    }

    /**
     * Checks if the interview has minimum data (startedAt)
     * @returns boolean indicating if the interview has minimum data
     */
    hasMinimumRequiredData(): boolean {
        return this.paradata?.startedAt !== undefined;
    }

    /**
     * Extract paradata params from dirty params
     * @param dirtyParams the dirty params (not validated)
     * @returns the paradata params (not validated)
     */
    static extractDirtyParadataParams(dirtyParams: { [key: string]: unknown }): { [key: string]: unknown } {
        return {
            languages: dirtyParams._language ? [{ language: dirtyParams._language }] : undefined,
            browsers: dirtyParams._browser ? [dirtyParams._browser] : undefined,
            startedAt: dirtyParams._startedAt,
            updatedAt: dirtyParams._updatedAt,
            completedAt: dirtyParams._completedAt,
            source: dirtyParams._source,
            personsRandomSequence: dirtyParams._personRandomSequence, // TODO: rename to personsRandomSequence in survey
            sections: dirtyParams._sections
        };
    }
}
