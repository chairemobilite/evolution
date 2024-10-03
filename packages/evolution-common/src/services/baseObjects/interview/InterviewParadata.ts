/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../../types/Optional.type';
import { Language, Browser, SectionMetadata } from '../attributeTypes/InterviewParadataAttributes';
import { ConstructorUtils } from '../../../utils/ConstructorUtils';

/*
We need to set these arrays to be able to split attributes and custom attributes during initialization.
Using keyof do not work because constructor is run-time and keyof is typescript only.
*/
const interviewParadataAttributes = [
    'startedAt',
    'updatedAt',
    'completedAt',

    'source',
    'personsRandomSequence',

    'languages',
    'browsers',
    'sections'
];

const interviewParadataAttributesWithComposedAttributes = [
    ...interviewParadataAttributes
];

export type InterviewParadataAttributes = {

    startedAt?: number; // unix epoch timestamp;
    updatedAt?: number; // unix epoch timestamp;
    completedAt?: number; // unix epoch timestamp; updated at the end of the interview. Needs auditing before assuming the interview is really completed.

    source?: string; // source for the interview (web, phone, social, etc.)
    // In a household survey, we need to ask trips for each persons in random order to reduce biases
    personsRandomSequence?: string[]; // array of person uuids (household members)

    /*
    For languages and browsers, each time a new browser/language is detected, we add the start and end timestamps and
    the language string / browser data.
    */
    languages?: Language[]; // two-letter ISO 639-1 code
    browsers?: Browser[];

    // each time a section is opened, we add a new SectionMetadata object with timestamps
    // TODO: move this to a Log/Paradata class?
    sections?: { [sectionShortname: string]: SectionMetadata[] };
};

/**
 * Represents metadata associated with an interview (paradata).
 * See https://en.wikipedia.org/wiki/Paradata
 *
 * @class
 * @description
 * The InterviewParadata class manages paradata related to an interview.
 * It is typically created as part of the Interview object initialization process.
 *
 * The InterviewParadata instance stores various metadata such as timestamps,
 * browser information, and section data.
 *
 * This paradata is crucial for understanding the context and progress of an interview,
 * and may be used in the auditing process handled by InterviewAudited.
 */
export class InterviewParadata {
    private _attributes: InterviewParadataAttributes;

    static _confidentialAttributes: string[] = [
        // do not export these attributes except for admins
        'startedAt',
        'updatedAt',
        'completedAt',
        'personsRandomSequence',
        'languages', // TODO: automatically select the most used language during the interview (longest duration)
        'browsers', // TODO: only some of this metadata should be exported, like the device and/or os and/or browser name
        'sections'
    ];

    // Use InterviewParadataUnserializer create function to generate/validate InterviewParadata object from json data
    constructor(params: InterviewParadataAttributes) {

        this._attributes = {} as InterviewParadataAttributes;

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            params,
            interviewParadataAttributes,
            interviewParadataAttributesWithComposedAttributes
        );
        this._attributes = attributes;

    }

    get attributes(): InterviewParadataAttributes {
        return this._attributes;
    }

    // Getters and setters for the attributes dictionary:

    get startedAt(): Optional<number> {
        return this._attributes.startedAt;
    }

    set startedAt(value: Optional<number>) {
        this._attributes.startedAt = value;
    }

    get updatedAt(): Optional<number> {
        return this._attributes.updatedAt;
    }

    set updatedAt(value: Optional<number>) {
        this._attributes.updatedAt = value;
    }

    get completedAt(): Optional<number> {
        return this._attributes.completedAt;
    }

    set completedAt(value: Optional<number>) {
        this._attributes.completedAt = value;
    }

    get source(): Optional<string> {
        return this._attributes.source;
    }

    set source(value: Optional<string>) {
        this._attributes.source = value;
    }

    get personsRandomSequence(): Optional<string[]> {
        return this._attributes.personsRandomSequence;
    }

    set personsRandomSequence(value: Optional<string[]>) {
        this._attributes.personsRandomSequence = value;
    }

    get languages(): Optional<Language[]> {
        return this._attributes.languages || [];
    }

    set languages(value: Optional<Language[]>) {
        this._attributes.languages = value || [];
    }

    get browsers(): Optional<Browser[]> {
        return this._attributes.browsers || [];
    }

    set browsers(value: Optional<Browser[]>) {
        this._attributes.browsers = value || [];
    }

    get sections(): Optional<{ [sectionShortname: string]: SectionMetadata[] }> {
        return this._attributes.sections || {};
    }

    set sections(value: Optional<{ [sectionShortname: string]: SectionMetadata[] }>) {
        this._attributes.sections = value || {};
    }

}


