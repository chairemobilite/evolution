/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { FrontendUser } from 'chaire-lib-frontend/lib/services/auth/user';
import { getResponse, devLog } from 'evolution-common/lib/utils/helpers';

export type ParsingFunction<T, CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = (
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    path: string,
    user?: FrontendUser
) => T;

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
    user?: FrontendUser
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
    user?: FrontendUser,
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
    user?: FrontendUser
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
    user?: FrontendUser
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
