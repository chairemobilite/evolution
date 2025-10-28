/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../../types/Optional.type';
import { Language, Browser, SectionMetadata } from '../attributeTypes/InterviewParadataAttributes';
import { ConstructorUtils } from '../../../utils/ConstructorUtils';
import { SurveyObjectUnserializer } from '../SurveyObjectUnserializer';
import { ParamsValidatorUtils } from '../../../utils/ParamsValidatorUtils';
import { Result, createErrors, createOk } from '../../../types/Result.type';
import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';

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

const interviewParadataAttributesWithComposedAttributes = [...interviewParadataAttributes];

export type InterviewParadataAttributes = {
    startedAt?: number; // unix epoch timestamp in seconds (not milliseconds)
    updatedAt?: number; // unix epoch timestamp in seconds (not milliseconds)
    completedAt?: number; // unix epoch timestamp in seconds (not milliseconds); updated at the end of the interview. Needs auditing before assuming the interview is really completed.

    source?: string; // source for the interview (web, phone, social, etc.)
    // In a household survey, we need to ask trips for each persons in random order to reduce biases
    personsRandomSequence?: string[]; // array of person uuids (household members)

    /*
    For languages and browsers, each time a new browser/language is detected, we add the start and end timestamps and
    the language string / browser data.
    Right now, the _language is set in response._language and is the last language used by the respondent
    Reviewer's languages are not logged/saved
    TODO: Use the language_change paradata event in the log to get all languages used by the respondent
          However, since the log data is not indexed, parsing a lot of interviews would take a while
          if we used the language_change event
    */
    languages?: Language[]; // two-letter ISO 639-1 code
    browsers?: Browser[];

    // each time a section is opened, we add a new SectionMetadata object with timestamps
    // TODO: move this to a Log/Paradata class? and update interview reponse to the new SectionMetadata format
    sections?: SectionMetadata;
};

export type ExtendedInterviewParadataAttributes = InterviewParadataAttributes & { [key: string]: unknown };

export type SerializedExtendedInterviewParadataAttributes = {
    _attributes?: ExtendedInterviewParadataAttributes;
    _customAttributes?: { [key: string]: unknown };
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

        const { attributes } = ConstructorUtils.initializeAttributes(
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

    get sections(): Optional<SectionMetadata> {
        return this._attributes.sections || {};
    }

    set sections(value: Optional<SectionMetadata>) {
        this._attributes.sections = value || {};
    }

    /**
     * Creates an InterviewParadata object from sanitized parameters
     * @param {ExtendedInterviewParadataAttributes | SerializedExtendedInterviewParadataAttributes} params - Sanitized interview paradata parameters
     * @param {SurveyObjectsRegistry} _surveyObjectsRegistry - unused since InterviewParadata is not composed of other objects, but unserializer will send the optional param.
     * @returns {InterviewParadata} New InterviewParadata instance
     */
    static unserialize(
        params: ExtendedInterviewParadataAttributes | SerializedExtendedInterviewParadataAttributes,
        _surveyObjectsRegistry: SurveyObjectsRegistry
    ): InterviewParadata {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new InterviewParadata(flattenedParams as ExtendedInterviewParadataAttributes);
    }

    /**
     * Factory that validates input and creates a InterviewParadata object
     * @param {Object} dirtyParams - Raw input parameters to validate
     * @returns {Result<InterviewParadata>} Either a valid InterviewParadata object or validation errors
     */
    static create(dirtyParams: { [key: string]: unknown }): Result<InterviewParadata> {
        const errors = InterviewParadata.validateParams(dirtyParams);
        const interviewParadata =
            errors.length === 0 ? new InterviewParadata(dirtyParams as InterviewParadataAttributes) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(interviewParadata as InterviewParadata);
    }

    /**
     * Validate the interview paradata params.
     * @param dirtyParams the json data
     * @param displayName the name of the object for error messages
     * @returns a list of errors if any, or an empty list if the params are valid
    };
     */
    static validateParams = function (
        dirtyParams: { [key: string]: unknown },
        displayName = 'InterviewParadata'
    ): Error[] {
        const errors: Error[] = [];

        errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
        errors.push(...ParamsValidatorUtils.isRecord('params', dirtyParams, displayName));

        // TODO: also check if start/end timestamps are inside the survey period:
        errors.push(...ParamsValidatorUtils.isPositiveInteger('startedAt', dirtyParams.startedAt, displayName));
        errors.push(...ParamsValidatorUtils.isPositiveInteger('updatedAt', dirtyParams.updatedAt, displayName));
        errors.push(...ParamsValidatorUtils.isPositiveInteger('completedAt', dirtyParams.completedAt, displayName));

        errors.push(...ParamsValidatorUtils.isString('source', dirtyParams.source, displayName));
        errors.push(
            ...ParamsValidatorUtils.isArrayOfStrings(
                'personsRandomSequence',
                dirtyParams.personsRandomSequence,
                displayName
            )
        );

        errors.push(...ParamsValidatorUtils.isArray('languages', dirtyParams.languages, displayName));
        if (dirtyParams.languages && Array.isArray(dirtyParams.languages)) {
            for (let i = 0; i < dirtyParams.languages.length; i++) {
                const language = dirtyParams.languages[i];
                errors.push(
                    ...ParamsValidatorUtils.isString(`languages.[${i}].language`, language.language, displayName)
                );
                errors.push(
                    ...ParamsValidatorUtils.isPositiveInteger(
                        `languages.[${i}].startTimestamp`,
                        language.startTimestamp,
                        displayName
                    )
                );
                errors.push(
                    ...ParamsValidatorUtils.isPositiveInteger(
                        `languages.[${i}].endTimestamp`,
                        language.endTimestamp,
                        displayName
                    )
                );
            }
        }

        errors.push(...ParamsValidatorUtils.isArray('browsers', dirtyParams.browsers, displayName));
        if (dirtyParams.browsers && Array.isArray(dirtyParams.browsers)) {
            for (let i = 0; i < dirtyParams.browsers.length; i++) {
                const browser = dirtyParams.browsers[i];
                errors.push(...ParamsValidatorUtils.isString(`browsers.[${i}]._ua`, browser._ua, displayName));
                if (browser.browser) {
                    errors.push(
                        ...ParamsValidatorUtils.isString(
                            `browsers.[${i}].browser.name`,
                            browser.browser.name,
                            displayName
                        )
                    );
                    errors.push(
                        ...ParamsValidatorUtils.isString(
                            `browsers.[${i}].browser.version`,
                            browser.browser.version,
                            displayName
                        )
                    );
                }
                if (browser.engine) {
                    errors.push(
                        ...ParamsValidatorUtils.isString(
                            `browsers.[${i}].engine.name`,
                            browser.engine.name,
                            displayName
                        )
                    );
                    errors.push(
                        ...ParamsValidatorUtils.isString(
                            `browsers.[${i}].engine.version`,
                            browser.engine.version,
                            displayName
                        )
                    );
                }
                if (browser.os) {
                    errors.push(
                        ...ParamsValidatorUtils.isString(`browsers.[${i}].os.name`, browser.os.name, displayName)
                    );
                    errors.push(
                        ...ParamsValidatorUtils.isString(`browsers.[${i}].os.version`, browser.os.version, displayName)
                    );
                    errors.push(
                        ...ParamsValidatorUtils.isString(
                            `browsers.[${i}].os.versionName`,
                            browser.os.versionName,
                            displayName
                        )
                    );
                }
                if (browser.platform) {
                    errors.push(
                        ...ParamsValidatorUtils.isString(
                            `browsers.[${i}].platform.model`,
                            browser.platform.model,
                            displayName
                        )
                    );
                    errors.push(
                        ...ParamsValidatorUtils.isString(
                            `browsers.[${i}].platform.type`,
                            browser.platform.type,
                            displayName
                        )
                    );
                    errors.push(
                        ...ParamsValidatorUtils.isString(
                            `browsers.[${i}].platform.vendor`,
                            browser.platform.vendor,
                            displayName
                        )
                    );
                }
                errors.push(
                    ...ParamsValidatorUtils.isPositiveInteger(
                        `browsers.[${i}].startTimestamp`,
                        browser.startTimestamp,
                        displayName
                    )
                );
                errors.push(
                    ...ParamsValidatorUtils.isPositiveInteger(
                        `browsers.[${i}].endTimestamp`,
                        browser.endTimestamp,
                        displayName
                    )
                );
            }
        }

        errors.push(...ParamsValidatorUtils.isRecord('sections', dirtyParams.sections, displayName));
        // TODO: validate the section metadata object when we will have implemented the format
        return errors;
    };
}
