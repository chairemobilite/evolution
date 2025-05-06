/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _get from 'lodash/get';
import _set from 'lodash/set';
import { v4 as uuidV4 } from 'uuid';
import sortBy from 'lodash/sortBy';
import _cloneDeep from 'lodash/cloneDeep';
import { i18n } from 'i18next';
import moment from 'moment';
import { isFeature } from 'geojson-validation';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import * as LE from 'chaire-lib-common/lib/utils/LodashExtensions';
import { Uuidable } from '../services/baseObjects/Uuidable';
import * as odSurveyHelpers from '../services/odSurvey/helpers';
import {
    ChoiceType,
    I18nData,
    InterviewResponses,
    ParsingFunction,
    RadioChoiceType,
    UserInterviewAttributes,
    WidgetConfig
} from '../services/questionnaire/types';

// The helpers in this file are used to manipulate and parse the survey model,
// regardless of the data it contains. The involve the higher level interview
// object and the widget data and functions.

export const translateString = (
    i18nData: I18nData | undefined,
    i18nObj: i18n,
    interview: UserInterviewAttributes,
    path: string,
    user?: CliUser
): string | undefined => {
    return typeof i18nData === 'function'
        ? i18nData(i18nObj.t, interview, path, user)
        : typeof i18nData === 'object'
            ? parseString(i18nData[i18nObj.language], interview, path, user)
            : i18nData;
};

/**
 * Verify if the value is a function. If so, call it with the other parameters,
 * otherwise, simply return the value itself
 *
 * @param value The value to parse
 * @param interview The interview attributes
 * @param path The path of the field being parsed, in the interview (responses?)
 * @param user The current user's information
 * @returns The parsed string value, or the value itself if it is a string
 */
export const parseString = (
    value: string | ParsingFunction<string> | undefined,
    interview: UserInterviewAttributes,
    path: string,
    user?: CliUser
): string | undefined => {
    return typeof value === 'function' ? value(interview, path, user) : value;
};

/**
 * Verify if the value is a function. If so, call it with the other parameters,
 * otherwise, simply return the value itself, or the defaultBoolean
 *
 * @param value The value to parse
 * @param interview The interview attributes
 * @param path The path of the field being parsed, in the interview (responses?)
 * @param user The current user's information
 * @param defaultBoolean default boolean value if undefined or null. TODO Do we
 * really want a default value of true?
 * @returns The parsed string value, or the value itself if it is a string
 */
export const parseBoolean = (
    value: boolean | ParsingFunction<boolean | [boolean] | [boolean, unknown]> | undefined | null,
    interview: UserInterviewAttributes,
    path: string,
    user?: CliUser,
    defaultBoolean = true
): boolean => {
    if (value === undefined || value === null) {
        return defaultBoolean;
    }
    // FIXME Code taken from legacy workspace and kept as is to avoid breaking
    // current surveys, but if the function returns undefined, shouldn't it use
    // the default value?
    if (typeof value === 'function') {
        const resultValue = value(interview, path, user);
        return Array.isArray(resultValue) ? resultValue[0] : resultValue;
    }
    return value as boolean;
};

/**
 * Verify if the value is a function. If so, call it with the other parameters,
 * otherwise, simply return the value itself
 *
 * TODO: Can this parse function replace parseInteger and parseString?
 *
 * @param value The value to parse
 * @param interview The interview attributes
 * @param path The path of the field being parsed, in the interview (responses?)
 * @param user The current user's information
 * @returns The parsed value of type T, or the value itself if it is a string
 */
export const parse = <T>(
    value: T | ParsingFunction<T> | undefined | null,
    interview: UserInterviewAttributes,
    path: string,
    user?: CliUser
): T | undefined | null => {
    return typeof value === 'function' ? (value as ParsingFunction<T>)(interview, path, user) : value;
};

/**
 * Verify if the value is a function. If so, call it with the other parameters,
 * otherwise, simply return the value itself, return an integer number
 *
 * @param value The value to parse
 * @param interview The interview attributes
 * @param path The path of the field being parsed, in the interview (responses?)
 * @param user The current user's information
 * @returns The parsed number value, or the value itself
 */
export const parseInteger = (
    value: number | ParsingFunction<number> | undefined,
    interview: UserInterviewAttributes,
    path: string,
    user?: CliUser
): number | undefined => {
    if (typeof value === 'function') {
        const parsedValue = value(interview, path, user);
        return typeof parsedValue === 'string' ? parseInt(parsedValue) : parsedValue;
    }
    return value;
};

/**
 * Replace response placeholders specified between brackets in a path by the
 * corresponding value in the interview responses.
 *
 * For example, if the value of the 'section1.field1' response is 'foo', path
 * 'prefix.{section1.field1}.suffix' would resolve to 'prefix.foo.suffix'
 *
 * @param interview The interview
 * @param path The path, with possibly response placeholders between brackets
 * @returns The path with interpolated responses
 */
export const interpolatePath = (interview: UserInterviewAttributes, path: string): string => {
    const splittedInterpolationPath = path ? path.match(/\{(.+?)\}/g) : null;
    let interpolatedPath = path;
    if (splittedInterpolationPath) {
        for (let i = 0, count = splittedInterpolationPath.length; i < count; i++) {
            const interpolationString = splittedInterpolationPath[i];
            const interpolationStringWithoutBrakets = interpolationString.substring(1, interpolationString.length - 1);
            const response = getResponse(interview, interpolationStringWithoutBrakets);
            if (typeof response === 'string' || typeof response === 'number' || typeof response === 'boolean') {
                interpolatedPath = interpolatedPath.split(interpolationString).join(String(response));
            } else {
                devLog('Trying to get interpolated path with an invalid response, will add \'unknown\' instead');
                interpolatedPath = interpolatedPath.split(interpolationString).join('unknown');
            }
        }
    }
    return interpolatedPath;
};

/**
 * Log a list of arguments only if in development mode
 *
 * @param args List of arguments to log
 */
export const devLog = function (...args: unknown[]) {
    if (process.env.NODE_ENV === 'development') {
        console.log.apply(null, args);
    }
};

/**
 * Update a dot-separated path (for example a path to query into an object) with
 * a relative path that can potentially go backward.
 *
 * For example, if the path is `foo.bar.test` and relative path is
 * `../../myField`, the result path is `foo.myField`.
 *
 * @param path The dot-seprated path to update
 * @param relativePath The relative path that should contain at least one ../,
 * otherwise, it is ignored
 * @returns The new absolute path after relative elements are resolved
 */
export const getPath = function (path: string | null | undefined, relativePath?: string): string | null {
    if (path === undefined || path === null) {
        return null;
    }
    if (relativePath) {
        // relativePath include one ../ or more and a relative path at the end
        const relativePathSplitted = relativePath.split('../');
        const backwardCount = relativePathSplitted.length - 1;
        const newRelativePath = relativePathSplitted[relativePathSplitted.length - 1];
        let newPath: string | undefined = undefined;
        if (backwardCount > 0) {
            const splittePath = path.split('.');
            // TODO What if splittedPath.length is smaller than backwardCount?
            // Now it returns the same as if both were equal, but should it be
            // null?
            const prefixPath = splittePath.splice(0, splittePath.length - backwardCount).join('.');
            newPath =
                newRelativePath === '' ? prefixPath : `${prefixPath}${prefixPath !== '' ? '.' : ''}${newRelativePath}`;
        }
        return newPath && newPath !== '' ? newPath : null;
    }
    return path;
};

/**
 * Convert a value to a specified data type
 *
 * TODO Try to force type return value
 *
 * TODO2 In float and integer, is the undefined returned value ok?
 *
 * TODO3 What about other types, if datatype is string and we get an array, it
 * returns an array... not as humanly expected. But this is not documented and
 * it is used in the wild in many survey. Let's revisit when old usages can
 * version evolution to its current state and we can evolve the API
 *
 * @param value The value to parse
 * @param datatype The type of data
 * @returns The parsed value converted to the specified data type, or the original value if no conversion is applied.
 */
export const parseValue = function (
    value: any,
    datatype: 'integer' | 'float' | 'boolean' | 'string' | 'geojson' | undefined
) {
    // If datatype is undefined, just return the value
    if (datatype === undefined) {
        return value;
    }
    if (datatype === 'integer') {
        return value === undefined || (value !== null && typeof value === 'object') || Array.isArray(value)
            ? undefined
            : LE._toInteger(value);
    }
    if (datatype === 'float') {
        return value === undefined || (value !== null && typeof value === 'object') || Array.isArray(value)
            ? undefined
            : LE._toFloat(value);
    }
    if (datatype === 'boolean') {
        return value === undefined ? undefined : LE._booleish(value);
    }
    if (datatype === 'geojson') {
        // Add the properties to the value if it is an object and it does not have properties
        if (value !== null && typeof value === 'object' && value['properties'] === undefined) {
            value.properties = {};
        }
        // For geojson, we only accept valid geojson objects
        return value && isFeature(value) ? value : null;
    }
    if (value === '') {
        return null;
    }
    // Return a string by default
    return value === undefined || value === null ? value : String(value);
};

/**
 * Get a response object or value for a specific path in the interview
 *
 * @param interview The interview object
 * @param path The path for which to get the value (dot-separated fields)
 * @param defaultValue The default value to return if the value is null or
 * undefined
 * @param relativePath The relative path from the given path (with prefixed ../
 * to go back in the path)
 * @returns The value of this path
 */
export const getResponse = (
    // TODO Can this really be undefined? it was previously in the if clause, but try to make it not be undefined
    interview: UserInterviewAttributes,
    path: string,
    defaultValue: unknown = undefined,
    relativePath?: string
): unknown | null => {
    const newPath = getPath(path, relativePath);
    if (newPath && interview) {
        const value = _get(interview.responses, newPath, defaultValue);
        return value === null || value === undefined ? defaultValue : value;
    } else {
        return null;
    }
};

/**
 * Sets the value for a response at a given path
 *
 * TODO Validate the return type: we receive an interview, we return a response!
 * That was in the legacy code
 *
 * @param interview The interview object
 * @param path The path for which to set the value (dot-separated fields)
 * @param value value to set
 * @param relativePath The relative path from the given path (with prefixed ../
 * to go back in the path)
 * @returns The interview responses with the field set
 */
export const setResponse = (
    // TODO Can this really be undefined? it was previously in the if clause, but try to make it not be undefined
    interview: UserInterviewAttributes | undefined,
    path: string,
    value: unknown = undefined,
    relativePath?: string
): InterviewResponses | null => {
    const newPath = getPath(path, relativePath);
    if (newPath && interview) {
        return _set(interview.responses, newPath, value);
    } else {
        // TODO Keep the null value for return for legacy purposes, but it should return the object
        return null;
    }
};

/**
 * Get the household object in the interview responses, or an empty object if
 * the household has not been initialized
 *
 * @param interview The interview object
 * @returns The household object
 * @deprecated use {@link odSurveyHelpers.getHousehold} instead
 */
export const getHousehold = (interview) => odSurveyHelpers.getHousehold({ interview });

/**
 * Get the currently active person, as defined in the interview responses. If
 * the active person is not set but there are persons defined, the first one
 * will be returned. If the person is not found, an empty object will be
 * returned.
 *
 * @param interview The interview object
 * @returns The current person object
 * @deprecated use {@link odSurveyHelpers.getActivePerson} instead
 */
export const getCurrentPerson = (interview) => odSurveyHelpers.getActivePerson({ interview });

/**
 * Get a validation value value for a specific path in the interview
 *
 * TODO: Type the validations properly
 *
 * @param interview The interview object
 * @param path The path for which to get the value (dot-separated fields)
 * @param defaultValue The default value to return if the value is null or
 * undefined
 * @returns The validation value of this path, or `null` if the path does not have a validation value
 */
export const getValidation = (
    interview: UserInterviewAttributes,
    path: string,
    defaultValue?: boolean
): boolean | null => {
    const validation = _get(interview.validations, path, defaultValue);
    return LE._booleish(validation);
};

/**
 * Sets the value for a validation at a given path
 *
 * @param interview The interview object
 * @param path The path for which to set the value (dot-separated fields)
 * @param value value to set
 * @param relativePath The relative path from the given path (with prefixed ../
 * to go back in the path)
 * @returns The interview responses with the field set
 */
export const setValidation = (
    interview: UserInterviewAttributes,
    path: string,
    value: boolean,
    relativePath?: string
): UserInterviewAttributes => {
    const newPath = getPath(path, relativePath);
    if (newPath) {
        _set(interview.validations, newPath, value);
    }
    return interview;
};

/**
 * Create a single comma-separated string with the fields received in parameter,
 * to send as geocoding query string
 *
 * TODO Is this really for geocoding, do all geocoders require the same kind of
 * string? Or is it specific for something particular? Once the geocoding
 * widgets are migrated to typescript and properly typed, revisit this
 * function's pertinence.
 *
 * @param fields An array of values to encode in a comma-separated query
 * @returns A single comma-separated string, or undefined if there is no valid
 * field to encode
 */
export const formatGeocodingQueryStringFromMultipleFields = (fields: unknown[]): string | undefined => {
    const queryArray: string[] = [];
    for (let i = 0, count = fields.length; i < count; i++) {
        const value = fields[i];
        if (typeof value === 'string') {
            queryArray.push(value);
        } else if (typeof value === 'number') {
            queryArray.push(String(value));
        }
    }
    return queryArray.length === 0 ? undefined : queryArray.join(', ');
};

/**
 * Test a string against a regex to see if it is a phone number
 * @param maybeNumber - String to test.
 * @returns True if string is a phone number.
 */
export const isPhoneNumber = (maybeNumber: string) => {
    return /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/.test(maybeNumber);
    // Thanks to https://stackoverflow.com/questions/16699007/regular-expression-to-match-standard-10-digit-phone-number
};

/**
 * @deprecated Use {@link odSurveyHelpers.getPersons} instead
 * */
export const getPersons = (interview) => odSurveyHelpers.getPersons({ interview });

/**
 * @deprecated Use {@link odSurveyHelpers.getPersonsArray} instead
 */
export const getPersonsArray = (interview) => odSurveyHelpers.getPersonsArray({ interview });

/**
 * @deprecated Use {@link odSurveyHelpers.getVisitedPlaces} instead
 */
export const getVisitedPlaces = (journey) => odSurveyHelpers.getVisitedPlaces({ journey });

/**
 * @deprecated Use {@link odSurveyHelpers.getVisitedPlacesArray} instead
 */
export const getVisitedPlacesArray = (journey) => odSurveyHelpers.getVisitedPlacesArray({ journey });

/**
 * Replace visited places that are shortcuts to the given location by the data
 * of this location. Only the first shortcut will be replaced, the others will
 * use the first place as new shortcut
 * @param interview The interview
 * @param visitedPlacesPath The path of the visited place to replace
 * @deprecated Use {@link odSurveyHelpers.replaceVisitedPlaceShortcuts} instead
 */
export const replaceVisitedPlaceShortcuts = (interview, visitedPlacesPath) =>
    odSurveyHelpers.replaceVisitedPlaceShortcuts({ interview, shortcutTo: visitedPlacesPath });

const startDateGreaterEqual = (startDate: number | undefined, compare: string | undefined): boolean | null => {
    const interviewStart = startDate ? moment.unix(startDate) : undefined;
    const dateCompare = compare ? moment(compare) : undefined;
    const surveyStartDate = dateCompare && dateCompare.isValid() ? dateCompare : undefined;
    if (interviewStart !== undefined && surveyStartDate !== undefined) {
        return interviewStart >= surveyStartDate;
    }
    return null;
};

/**
 * Check if the survey has started based on the interview start date and the configured survey start date.
 *
 * @param {UserInterviewAttributes} interview The interview object.
 * @returns {boolean} `true` if the survey has started, `false` otherwise.
 */
export const surveyStarted = (interview: UserInterviewAttributes): boolean => {
    const isSurveyStarted = startDateGreaterEqual(interview.responses._startedAt, config.surveyStart);
    return isSurveyStarted === null ? true : isSurveyStarted;
};

/**
 * Check if the survey has ended based on the interview start date and the configured survey end date.
 *
 * @param {UserInterviewAttributes} interview The interview object.
 * @returns {boolean} `true` if the survey has ended, `false` otherwise.
 */
export const surveyEnded = (interview: UserInterviewAttributes): boolean => {
    const isSurveyEnded = startDateGreaterEqual(interview.responses._startedAt, config.surveyEnd);
    return isSurveyEnded === null ? true : isSurveyEnded;
};

export const interviewOnOrAfter = (date: string, interview: UserInterviewAttributes) => {
    return startDateGreaterEqual(interview.responses._startedAt, date);
};

/**
 * @typedef {Object} GroupedObjectsResult
 * @property {Object} changedValuesByPath The changed values by path.
 * @property {string[]} unsetPaths The unset paths.
 */

/**
 * Add new grouped objects to the interview at path with the given attributes,
 * at the given sequence. Note that object sequences are 1-based. So the first
 * object is at sequence 1.
 * @param {UserInterviewAttributes} interview The interview object
 * @param {number} newObjectsCount The number of new objects to add
 * @param {(number|undefined)} insertSequence The sequence at which to insert
 * the new objects. Any negative value will add at the end of the array. The
 * first object is at sequence 1.
 * @param {string} path Path at which to add the grouped objects. New objects
 * will be added at the insertSequence position of the existing objects.
 * @param {Object[]} [attributes=[]] An array of attributes with which to
 * initialize the objects. Each attributes object in the array will be used to
 * initialize the new objects at the same position.
 * @returns {Object} The changed values by path
 */
export const addGroupedObjects = (
    interview: UserInterviewAttributes,
    newObjectsCount: number,
    insertSequence: number | undefined,
    path: string,
    attributes: { [key: string]: unknown }[] = []
): { [modifiedValue: string]: unknown } => {
    const changedValuesByPath = {};
    const groupedObjects = _get(interview.responses, path, {});
    const groupedObjectsArray = sortBy(Object.values(groupedObjects), ['_sequence']) as Uuidable[];
    // Make sure sequence is within bounds:
    const objStartSequence =
        typeof insertSequence !== 'number' || insertSequence <= -1
            ? groupedObjectsArray.length + 1
            : Math.min(groupedObjectsArray.length + 1, Math.max(1, insertSequence as number));

    // increment sequences of groupedObjects after the insertSequence:
    for (let seq = objStartSequence, count = groupedObjectsArray.length; seq <= count; seq++) {
        const groupedObject = groupedObjectsArray[seq - 1];
        changedValuesByPath[`responses.${path}.${groupedObject._uuid}._sequence`] = seq + newObjectsCount;
    }
    for (let i = 0; i < newObjectsCount; i++) {
        const uniqueId = uuidV4();
        const newSequence = objStartSequence + i;
        const newObjectAttributes = attributes[i] ? attributes[i] : {};
        changedValuesByPath[`responses.${path}.${uniqueId}`] = {
            _sequence: newSequence,
            _uuid: uniqueId,
            ...newObjectAttributes
        };
        changedValuesByPath[`validations.${path}.${uniqueId}`] = {};
    }
    return changedValuesByPath;
};

/**
 * Remove grouped objects from the interview at the given path. The sequences of
 * the remaining objects will be modified to be continuous.
 * @param {UserInterviewAttributes} interview The interview object
 * @param {(string|string[])} paths The paths of the objects to remove
 * @returns {GroupedObjectsResult} An object containing the changed values by path and the unset paths.
 */
export const removeGroupedObjects = (
    interview: UserInterviewAttributes,
    paths: string | string[]
): [{ [modifiedPath: string]: unknown }, string[]] => {
    // allow single path:
    const removePaths = Array.isArray(paths) ? paths : [paths];
    if (removePaths.length === 0) {
        return [{}, []];
    }

    const unsetPaths: string[] = [];
    const valuesByPath = {};
    let pathRemovedCount = 0;

    const groupedObjects = getResponse(interview, removePaths[0], {}, '../') as any;
    const groupedObjectsArray = sortBy(Object.values(groupedObjects), ['_sequence']) as Uuidable[];

    for (let i = 0, count = groupedObjectsArray.length; i < count; i++) {
        const groupedObject = groupedObjectsArray[i];
        const groupedObjectPath = getPath(removePaths[0], `../${groupedObject._uuid}`);
        if (groupedObjectPath !== null && removePaths.includes(groupedObjectPath)) {
            unsetPaths.push(`responses.${groupedObjectPath}`);
            unsetPaths.push(`validations.${groupedObjectPath}`);
            pathRemovedCount++;
        } else {
            if (pathRemovedCount > 0) {
                valuesByPath['responses.' + groupedObjectPath + '._sequence'] =
                    ((groupedObject as any)._sequence || i + 1) - pathRemovedCount;
            }
        }
    }
    return [valuesByPath, unsetPaths];
};

/**
 * Get the widget choice corresponding to the value for a radio, checkbox or
 * select widget
 *
 * @param {Object} options - The options object.
 * @param {WidgetConfig} options.widget The widget for which to get the choice
 * @param {string|boolean} options.value The value to find
 * @param {UserInterviewAttributes} options.interview The interview object
 * @param {string} options.path The path of the field being parsed, in the
 * interview responses
 * @returns The choice corresponding to the value, or `undefined` if the widget
 * does not have choices or if the choice is not found
 */
export const getWidgetChoiceFromValue = ({
    widget,
    value,
    interview,
    path
}: {
    widget: WidgetConfig;
    value: string | boolean;
    interview: UserInterviewAttributes;
    path: string;
}): ChoiceType | RadioChoiceType | undefined => {
    if (
        widget.type !== 'question' ||
        (widget.inputType !== 'radio' && widget.inputType !== 'checkbox' && widget.inputType !== 'select')
    ) {
        return undefined;
    }
    const choices = typeof widget.choices === 'function' ? widget.choices(interview, path) : widget.choices;

    const baseChoices = choices.flatMap((choice) => choice.choices || [choice]);
    return baseChoices.find((choice) => choice.value === value);
};

/**
 * Check if the section is complete
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview - The interview object.
 * @param {string} options.sectionName - The name of the section to check.
 * @returns {boolean | null} - Returns true if the section is complete, false if not, or null if the section is not found.
 *
 * @description This function checks if the section is complete by looking at the `interview.responses._sections.${sectionName}._isCompleted` field.
 */
export const isSectionComplete = ({
    interview,
    sectionName
}: {
    interview: UserInterviewAttributes;
    sectionName: string;
}): boolean | null => {
    const isSectionComplete = getResponse(interview, `_sections.${sectionName}._isCompleted`, null) as boolean | null;

    return isSectionComplete;
};

/**
 * Calculate the survey completion percentage based on the number of completed sections.
 * The percentage begins at 0% when starting the first section and reaches 100% when the last section is initiated.
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview - The interview object.
 * @param {Object} options.sections - The sections object.
 * @param {string} options.sectionName - The shortname of the current section.
 * @param {string} options.sectionTarget - The target section for the completion rate ('currentSection' or 'nextSection').
 * @returns {number} - The calculated completion percentage.
 */
export const calculateSurveyCompletionPercentage = ({
    interview,
    sections,
    sectionName,
    sectionTarget
}: {
    interview: UserInterviewAttributes;
    sections: { [key: string]: unknown };
    sectionName: string;
    sectionTarget: 'currentSection' | 'nextSection';
}): number => {
    const LAST_SECTION_NAME = 'completed'; // NOTE: Only survey with the last section named 'completed' are supported for this function.
    const MINIMUM_COMPLETION_PERCENTAGE = 0;
    const MAXIMUM_COMPLETION_PERCENTAGE = 100;

    // Get the stored completion percentage from the interview responses
    const storedCompletionPercentage: number =
        interview?.responses?._completionPercentage || MINIMUM_COMPLETION_PERCENTAGE;

    // Count the number of sections without the last one
    const sectionsWithoutCompleted = Object.keys(sections).filter((sectionName) => sectionName !== LAST_SECTION_NAME);
    const totalSectionsWithoutCompleted = sectionsWithoutCompleted.length;

    // Increment the index if the section target is 'nextSection'
    let sectionTargetIndex = Object.keys(sections).findIndex((key) => key === sectionName);
    if (sectionTarget === 'nextSection') {
        sectionTargetIndex = Math.min(sectionTargetIndex + 1, totalSectionsWithoutCompleted);
    }

    // Return the maximum survey completion percentage
    const targetCompletionPercentage = Number(((sectionTargetIndex / totalSectionsWithoutCompleted) * 100).toFixed(0));
    const completionPercentage = Math.min(
        MAXIMUM_COMPLETION_PERCENTAGE,
        Math.max(storedCompletionPercentage, targetCompletionPercentage)
    );
    return completionPercentage;
};

/**
 * Retrieve a visited place and its associated person in the household by the visited place ID.
 *
 * @param {string} visitedPlaceId - The ID of the visited place to find.
 * @param {string|null} [attributePrefix=null] - Optional prefix for visited places attributes.
 * @param {UserInterviewAttributes} interview - The interview object containing household data.
 * @returns {{ person: object, visitedPlace: object } | null} - The person and visited place object, or null if not found.
 */
export const getVisitedPlaceAndPersonInHouseholdById = function (visitedPlaceId, attributePrefix = null, interview) {
    const persons: any = getResponse(interview, 'household.persons', {});
    for (const personId in persons) {
        const person = persons[personId];
        const personVisitedPlaces = person[attributePrefix ? attributePrefix + 'VisitedPlaces' : 'visitedPlaces'] || {};
        for (const _visitedPlaceId in personVisitedPlaces) {
            if (_visitedPlaceId === visitedPlaceId) {
                return {
                    person: person,
                    visitedPlace: personVisitedPlaces[_visitedPlaceId]
                };
            }
        }
    }
    return null;
};

/**
 * Retrieve the geography (GeoJSON) of a visited place.
 *
 * @param {object} visitedPlace - The visited place object.
 * @param {object} person - The person associated with the visited place.
 * @param {UserInterviewAttributes} interview - The interview object.
 * @param {boolean} [recursive=false] - Whether to recursively search for geography in related persons.
 * @returns {object|null} - The GeoJSON object or null if not found.
 */
export const getGeography = function (visitedPlace, person, interview, recursive = false) {
    if (visitedPlace === null || visitedPlace === undefined) {
        return null;
    }
    let geojson: unknown = null;
    if (visitedPlace.activityCategory === 'home') {
        geojson = getResponse(interview, 'home.geography', null);
    } else if (visitedPlace.activity === 'workUsual') {
        geojson =
            person.usualWorkPlace && person.usualWorkPlace.geography
                ? person.usualWorkPlace.geography
                : visitedPlace.geography;
        if (_isBlank(geojson) && recursive === false) {
            // it means the usualWorkPlace is for another person
            const matchingVisitedPlaceAndPerson = getVisitedPlaceAndPersonInHouseholdById(
                visitedPlace._uuid,
                null,
                interview
            );
            if (matchingVisitedPlaceAndPerson) {
                return getGeography(visitedPlace, matchingVisitedPlaceAndPerson.person, interview, true);
            } else {
                return null;
            }
        }
    } else if (visitedPlace.activity === 'schoolUsual') {
        geojson =
            person.usualSchoolPlace && person.usualSchoolPlace.geography
                ? person.usualSchoolPlace.geography
                : visitedPlace.geography;
        if (_isBlank(geojson) && recursive === false) {
            // it means the usualSchoolPlace is for another person
            const matchingVisitedPlaceAndPerson = getVisitedPlaceAndPersonInHouseholdById(
                visitedPlace._uuid,
                null,
                interview
            );
            if (matchingVisitedPlaceAndPerson) {
                return getGeography(visitedPlace, matchingVisitedPlaceAndPerson.person, interview, true);
            } else {
                return null;
            }
        }
    } else {
        geojson = visitedPlace.geography;
    }
    return geojson ? _cloneDeep(geojson) : null;
};

/**
 * Retrieve the origin visited place of a trip.
 *
 * @param {object} trip - The trip object.
 * @param {object} visitedPlaces - The visited places object.
 * @returns {object} - The origin visited place object.
 */
export const getOrigin = function (trip, visitedPlaces) {
    const originVisitedPlaceId = trip._originVisitedPlaceUuid;
    return visitedPlaces[originVisitedPlaceId];
};

/**
 * Retrieve the destination visited place of a trip.
 *
 * @param {object} trip - The trip object.
 * @param {object} visitedPlaces - The visited places object.
 * @returns {object} - The destination visited place object.
 */
export const getDestination = function (trip, visitedPlaces) {
    const destinationVisitedPlaceId = trip._destinationVisitedPlaceUuid;
    return visitedPlaces[destinationVisitedPlaceId];
};

/**
 * Retrieve the geography (GeoJSON) of the origin of a trip.
 *
 * @param {object} trip - The trip object.
 * @param {object} visitedPlaces - The visited places object.
 * @param {object} person - The person associated with the trip.
 * @param {UserInterviewAttributes} interview - The interview object.
 * @param {boolean} [recursive=false] - Whether to recursively search for geography in related persons.
 * @returns {object|null} - The GeoJSON object or null if not found.
 */
export const getOriginGeography = function (trip, visitedPlaces, person, interview, recursive = false) {
    const origin = getOrigin(trip, visitedPlaces);
    return getGeography(origin, person, interview, recursive);
};

/**
 * Retrieve the geography (GeoJSON) of the destination of a trip.
 *
 * @param {object} trip - The trip object.
 * @param {object} visitedPlaces - The visited places object.
 * @param {object} person - The person associated with the trip.
 * @param {UserInterviewAttributes} interview - The interview object.
 * @param {boolean} [recursive=false] - Whether to recursively search for geography in related persons.
 * @returns {object|null} - The GeoJSON object or null if not found.
 */
export const getDestinationGeography = function (trip, visitedPlaces, person, interview, recursive = false) {
    const destination = getDestination(trip, visitedPlaces);
    return getGeography(destination, person, interview, recursive);
};
