/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _get from 'lodash.get';
import _set from 'lodash.set';

import * as LE from 'chaire-lib-common/lib/utils/LodashExtensions';
import { Household, InterviewResponses, Person, UserInterviewAttributes } from '../services/interviews/interview';

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
 * @returns
 */
export const parseValue = function (value: any, datatype: 'integer' | 'float' | 'boolean' | string) {
    if (datatype === 'integer') {
        return value === undefined || (value !== null && typeof value === 'object') || Array.isArray(value)
            ? undefined
            : LE._toInteger(value);
    } else if (datatype === 'float') {
        return value === undefined || (value !== null && typeof value === 'object') || Array.isArray(value)
            ? undefined
            : LE._toFloat(value);
    } else if (datatype === 'boolean') {
        return value === undefined ? undefined : LE._booleish(value);
    } else if (value === '') {
        return null;
    }
    return value;
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
export const getResponse = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    // TODO Can this really be undefined? it was previously in the if clause, but try to make it not be undefined
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
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
export const setResponse = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    // TODO Can this really be undefined? it was previously in the if clause, but try to make it not be undefined
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> | undefined,
    path: string,
    value: unknown = undefined,
    relativePath?: string
): InterviewResponses<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> | null => {
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
 */
export const getHousehold = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
): Partial<Household<CustomHousehold, CustomPerson>> => {
    return interview.responses.household || {};
};

/**
 * Get the currently active person, as defined in the interview responses. If
 * the active person is not set but there are persons defined, the first one
 * will be returned. If the person is not found, an empty object will be
 * returned.
 *
 * @param interview The interview object
 * @returns The current person object
 */
export const getCurrentPerson = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
): Partial<Person<CustomPerson>> => {
    const currentPerson = interview.responses._activePersonId;
    const hh = getHousehold(interview);
    if (currentPerson !== undefined) {
        return hh !== null ? (hh.persons || {})[currentPerson] || {} : {};
    } else {
        // Get first person
        const persons = Object.values(hh.persons || {});
        return persons.length !== 0 ? persons[0] : {};
    }
};

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
export const getValidation = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
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
export const setValidation = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    path: string,
    value: boolean,
    relativePath?: string
): UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> => {
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
