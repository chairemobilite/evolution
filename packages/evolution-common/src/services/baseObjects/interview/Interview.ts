/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../../types/Optional.type';
import { Uuidable, UuidableAttributes } from '../Uuidable';
import { Household } from '../Household';
import { Person } from '../Person';
import { Organization } from '../Organization';
import { YesNoDontKnow } from '../attributeTypes/GenericAttributes';
import { ConstructorUtils } from '../../../utils/ConstructorUtils';
import { InterviewParadata } from './InterviewParadata';

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
    'auditorComments',

    'durationRange',
    'durationRespondentEstimationMin',
    'interestRange',
    'difficultyRange',
    'burdenRange',
    'consideredToAbandonRange'
];

const interviewAttributesWithComposedAttributes = [
    ...interviewAttributes,
    'household',
    'person',
    'organization',

    'paradata'
];

export type InterviewAttributes = {
    _uuid?: string; // TODO: discuss whether the original and audited should have the same uuid
    _id?: number; // integer primary key from db.
    _participant_id?: number; // integer respondent/participan/user primary key id from db, TODO: update the User class to use this Interview class instead

    accessCode?: string; // accessCode used when starting an interview in most survey. This could be the code sent in a letter for households to be pre-geolocalized
    // TODO: consider using the new luxon package to deal with dates instead of momentJS
    assignedDate?: string; // string, YYYY-MM-DD, the assigned date for the survey (trips date most of the time)
    contactPhoneNumber?: string; // phone number to use to contact the respondent
    helpContactPhoneNumber?: string; // phone number used for help by interviewer/auditor only
    contactEmail?: string; // email to use to contact the respondent
    helpContactEmail?: string; // email used for help by interviewer/auditor person only
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
    consideredToAbandonRange?: YesNoDontKnow; // yes/no/dontKnow if the respondent considered to abandon the interview
} & UuidableAttributes;

export type InterviewWithComposedObjects = InterviewAttributes & {
    household?: Optional<Household>; // TODO: test when Household will be updated to replace BaseHousehold
    person?: Optional<Person>; // TODO: test when Person will be updated to replace BasePerson
    organization?: Optional<Organization>; // TODO: test when Organization will be updated to replace BaseOrganization
    paradata?: Optional<InterviewParadata>;
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
 *    - The Interview object is progressively filled with respondent responses.
 *    - Paradata is collected throughout the interview process.
 *    - Both interview data and paradata (interview metadata) are stored in the Interview instance.
 *
 * 2a. Audit Step:
 *    - When an admin/auditor person opens the auditing dashboard:
 *      a. The interview is loaded in auditing mode. This involves cloning the interview
 *         object to keep the original responses intact. The copy has isAuditingVersion
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
    private _attributes: InterviewAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _household?: Optional<Household>; // for a household interview
    private _person?: Optional<Person>; // for a single-person interview (rare since most of the time, we ask for minimum household members attributes)
    private _organization?: Optional<Organization>; // for an organization interview
    private _paradata?: Optional<InterviewParadata>;

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
        'auditorComments', // only for admin exports
        'durationRange', // only for analysis/admin exports
        'durationRespondentEstimationMin', // only for analysis/admin exports
        'interestRange', // only for analysis/admin exports
        'difficultyRange', // only for analysis/admin exports
        'burdenRange', // only for analysis/admin exports
        'consideredToAbandonRange' // only for analysis/admin exports
    ];

    // Use InterviewUnserializer create function to generate/validate Interview object from json data with nested composed objects
    constructor(params: ExtendedInterviewAttributesWithComposedObjects) {
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

        this.household = params.household;
        this.person = params.person;
        this.organization = params.organization;
        this.paradata = params.paradata;
    }

    get attributes(): InterviewAttributes {
        return this._attributes;
    }

    get customAttributes(): { [key: string]: unknown } {
        return this._customAttributes;
    }

    // Getters and setters for the attributes dictionary:

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

    get consideredToAbandonRange(): Optional<string> {
        return this._attributes.consideredToAbandonRange;
    }

    set consideredToAbandonRange(value: Optional<string>) {
        this._attributes.consideredToAbandonRange = value;
    }

    // Composed objects:

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

    get paradata(): Optional<InterviewParadata> {
        return this._paradata;
    }

    set paradata(value: Optional<InterviewParadata>) {
        this._paradata = value;
    }
}
