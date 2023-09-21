/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _get from 'lodash/get';
import _set from 'lodash/set';
import { i18n, TFunction } from 'i18next';

import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import * as LE from 'chaire-lib-common/lib/utils/LodashExtensions';
import {
    Household,
    InterviewResponses,
    Person,
    UserInterviewAttributes,
    VisitedPlace
} from '../services/interviews/interview';

export type ParsingFunction<T, CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = (
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    path: string,
    user?: CliUser
) => T;

export type LangData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    [lang: string]: string | ParsingFunction<string, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
};

export type TranslatableStringFunction<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = (
    t: TFunction,
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    path: string,
    user?: CliUser
) => string;

export type I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> =
    | string
    | LangData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
    | TranslatableStringFunction<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;

export const translateString = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    i18nData: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> | undefined,
    i18nObj: i18n,
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
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
export const parseString = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    value: string | ParsingFunction<string, CustomSurvey, CustomHousehold, CustomHome, CustomPerson> | undefined,
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
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
export const parseBoolean = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    value:
        | boolean
        | ParsingFunction<
              boolean | [boolean] | [boolean, unknown],
              CustomSurvey,
              CustomHousehold,
              CustomHome,
              CustomPerson
          >
        | undefined
        | null,
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
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
export const parse = <T, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    value: T | ParsingFunction<T, CustomSurvey, CustomHousehold, CustomHome, CustomPerson> | undefined | null,
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    path: string,
    user?: CliUser
): T | undefined | null => {
    return typeof value === 'function'
        ? (value as ParsingFunction<T, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>)(interview, path, user)
        : value;
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
export const parseInteger = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    value: number | ParsingFunction<number, CustomSurvey, CustomHousehold, CustomHome, CustomPerson> | undefined,
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
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
export const interpolatePath = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    path: string
): string => {
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

/**
 * Test a string against a regex to see if it is a phone number
 * @param maybeNumber - String to test.
 * @returns True if string is a phone number.
 */
export const isPhoneNumber = (maybeNumber: string) => {
    return /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/.test(maybeNumber);
    // Thanks to https://stackoverflow.com/questions/16699007/regular-expression-to-match-standard-10-digit-phone-number
};

export const getPersons = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
): { [personId: string]: Person<CustomPerson> } => {
    return (interview.responses.household || {}).persons || {};
};

export const getPersonsArray = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
): Person<CustomPerson>[] => {
    const persons = getPersons(interview);
    return Object.values(persons).sort((personA, personB) => {
        return personA._sequence - personB._sequence;
    });
};

export const getVisitedPlaces = <CustomPerson>(
    person: Person<CustomPerson>
): { [visitedPlaceId: string]: VisitedPlace } => {
    return person.visitedPlaces || {};
};

export const getVisitedPlacesArray = <CustomPerson>(person: Person<CustomPerson>) => {
    const visitedPlaces = getVisitedPlaces(person);
    return Object.values(visitedPlaces).sort((visitedPlaceA, visitedPlaceB) => {
        return visitedPlaceA._sequence - visitedPlaceB._sequence;
    });
};

/**
 * Replace visited places that are shortcuts to the given location by the data
 * of this location. Only the first shortcut will be replaced, the others will
 * use the first place as new shortcut
 * @param interview The interview
 * @param visitedPlacesPath The path of the visited place to replace
 */
export const replaceVisitedPlaceShortcuts = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    shortcutTo: string
): { updatedValuesByPath: { [path: string]: any }; unsetPaths: string[] } | undefined => {
    const originalVisitedPlace = getResponse(interview, shortcutTo, {}) as VisitedPlace;

    // Find shortcuts to this place
    const placesWithShortcut = getPersonsArray(interview).flatMap((person) =>
        getVisitedPlacesArray(person)
            .filter((visitedPlace) => (visitedPlace as any).shortcut && (visitedPlace as any).shortcut === shortcutTo)
            .map((visitedPlace) => ({ person, visitedPlace }))
    );

    if (placesWithShortcut.length === 0) {
        return undefined;
    }
    const updatedValuesByPath: { [path: string]: any } = {};
    const unsetPaths: string[] = [];

    // Replace first place's name and geography with original and remove shortcut if necessary. The original place can itself be a shortcut
    const firstVisitedPlace = placesWithShortcut[0];
    const firstPlacePath = `household.persons.${firstVisitedPlace.person._uuid}.visitedPlaces.${firstVisitedPlace.visitedPlace._uuid}`;

    if ((originalVisitedPlace as any).shortcut) {
        updatedValuesByPath[`responses.${firstPlacePath}.shortcut`] = (originalVisitedPlace as any).shortcut;
    } else {
        unsetPaths.push(`responses.${firstPlacePath}.shortcut`);
        updatedValuesByPath[`responses.${firstPlacePath}.name`] = (originalVisitedPlace as any).name;
    }
    updatedValuesByPath[`responses.${firstPlacePath}.geography`] = (originalVisitedPlace as any).geography;

    // Replace all other places' shortcut with first place
    placesWithShortcut
        .slice(1)
        .forEach(
            (place) =>
                (updatedValuesByPath[
                    `responses.household.persons.${place.person._uuid}.visitedPlaces.${place.visitedPlace._uuid}.shortcut`
                ] = firstPlacePath)
        );

    return { updatedValuesByPath, unsetPaths };
};
