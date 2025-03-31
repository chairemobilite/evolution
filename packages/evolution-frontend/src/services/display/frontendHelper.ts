/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { TFunction } from 'i18next';
import moment from 'moment';

import i18n from '../../config/i18n.config';
import { secondsSinceMidnightToTimeStr } from 'chaire-lib-common/lib/utils/DateTimeUtils';
import { ButtonAction, Person } from 'evolution-common/lib/services/questionnaire/types';

type GenderedData = {
    [gender: string]: {
        [lang: string]: {
            [toReplace: string]: string;
        };
    };
};
const genderedSuffixes: GenderedData = {};
/**
 * Get translated gendered strings for a person, that can be used as
 * placeholders in a localizable string in the translation files. For example, a
 * translation string could be "{{doesHeShe}} own a car" and the translation
 * would be "Does he own a car?" or "Does she own a car?" depending on the
 * person's specified gender
 *
 * Usage:
 * ```
 * ...widgetConfiguration,
 * label: (t: TFunction, interview) => t('survey:question', {
 *      ...getGenderedStrings(getActiverPerson(interview), t),
 *      otherContextData: 'myDate'
 * })
 * ```
 *
 * @param person The person to get the gendered strings for
 * @param t The translation function to translate the gender strings
 * @returns An object containing the gendered strings that can be added as an
 * option to a `t` function call to be replaced in the localized strings.
 */
export const getGenderedStrings = (person: Person | undefined | null, t: TFunction) => {
    const gender =
        person !== null && person !== undefined && typeof person.gender === 'string' ? person.gender : 'none';
    if (genderedSuffixes[gender] === undefined) {
        genderedSuffixes[gender] = {};
    }
    const suffixes = genderedSuffixes[gender][i18n.language]
        ? genderedSuffixes[gender][i18n.language]
        : {
            suffixE: t('survey:suffixE', { context: gender }),
            suffixEurRice: t('survey:suffixEurRice', { context: gender }),
            suffixErEre: t('survey:suffixErEre', { context: gender }),
            isHeShe: t('survey:isHeShe', { context: gender }),
            doesHeShe: t('survey:doesHeShe', { context: gender }),
            heShe: t('survey:heShe', { context: gender }),
            ifHeShe: t('survey:ifHeShe', { context: gender }),
            himHerThem: t('survey:himHerThem', { context: gender }),
            hisHerTheir: t('survey:hisHerTheir', { context: gender })
        };
    if (genderedSuffixes[gender][i18n.language] === undefined) {
        genderedSuffixes[gender][i18n.language] = suffixes;
    }
    return suffixes;
};

/**
 * Get the formatted date in the requested locale
 * @param date The date string, formatted YYYY-MM-DD
 * @param options The options
 * @param {boolean} [options.withRelative=false] Whether to add a relative date (eg. yesterday, day before yesterday)
 * @param {string} [options.locale=undefined] The locale to use or undefined to use the default locale
 * @param {boolean} [options.withDayOfWeek=false] Whether to add the day of the week
 * @returns
 */
export const getFormattedDate = (
    date: string,
    {
        withRelative = false,
        locale = undefined,
        withDayOfWeek = false
    }: { withRelative?: boolean; locale?: string; withDayOfWeek?: boolean } = {}
) => {
    const tripsDate = moment(date);
    const format = withDayOfWeek ? 'dddd LL' : 'LL';
    let formattedTripsDate = locale ? tripsDate.locale(locale).format(format) : tripsDate.format(format);
    if (withRelative) {
        const today = moment(0, 'HH'); // today
        const numberOfDaysDiff = today.diff(tripsDate, 'days');
        if (numberOfDaysDiff >= 0) {
            formattedTripsDate += ` (${i18n.t('survey:pastToday', { count: numberOfDaysDiff })})`;
        } else {
            formattedTripsDate += ` (${i18n.t('survey:futureToday', { count: Math.abs(numberOfDaysDiff) })})`;
        }
    }
    return formattedTripsDate;
};

/**
 * Get the human readable time from the seconds since midnight. If the time is
 * the next day, it appends a suffix to the time.
 *
 * @param {number} secondsSinceMidnight The number of seconds since midnight to
 * convert to a time string
 * @param {string} [suffixAfterMidnight='the next day'] The suffix to append to
 * the time if it is the next
 * @returns A human readable time string
 */
export const secondsSinceMidnightToTimeStrWithSuffix = function (
    secondsSinceMidnight: number,
    suffixAfterMidnight: string = i18n.t('main:theNextDay')
): string {
    if (secondsSinceMidnight >= 24 * 3600) {
        secondsSinceMidnight -= 24 * 3600;
        return `${secondsSinceMidnightToTimeStr(secondsSinceMidnight)} ${suffixAfterMidnight}`;
    } else {
        return `${secondsSinceMidnightToTimeStr(secondsSinceMidnight)}`;
    }
};

export const validateButtonAction: ButtonAction = (callbacks, interview, path, section, sections, saveCallback) => {
    callbacks.startUpdateInterview(section, { _all: true }, undefined, interview, (updatedInterview) => {
        if ((updatedInterview as any).allWidgetsValid) {
            if (typeof saveCallback === 'function') {
                saveCallback(callbacks, updatedInterview, path);
            } // go to next section
            else {
                window.scrollTo(0, 0);
                callbacks.startUpdateInterview(section, {
                    'responses._activeSection': sections[section].nextSection
                });
            }
        }
    });
};

// Add that the section is completed when the button is clicked in addition to navigating to next section
// FIXME This is a temporary move to typescript, but section navigation should be handled server side
export const validateButtonActionWithCompleteSection: ButtonAction = (
    callbacks,
    interview,
    path,
    section,
    sections,
    saveCallback
) => {
    callbacks.startUpdateInterview(section, { _all: true }, undefined, interview, (updatedInterview) => {
        if ((updatedInterview as any).allWidgetsValid) {
            if (typeof saveCallback === 'function') {
                saveCallback(callbacks, updatedInterview, path);
            } else {
                // Calculate the completion percentage based on the next section index and total sections.
                // The percentage will be 100% when the last section (completed section) is started.
                const MAXIMUM_COMPLETION_PERCENTAGE = 100;
                const currentCompletionPercentage: number = interview?.responses?._completionPercentage || 0;
                const nextSectionIndex = Object.keys(sections).findIndex((key) => key === section) + 2;
                const totalSections = Object.keys(sections).length;
                const nextCompletionPercentage = Number(((nextSectionIndex / totalSections) * 100).toFixed(0));
                const completionPercentage = Math.min(
                    MAXIMUM_COMPLETION_PERCENTAGE,
                    Math.max(currentCompletionPercentage, nextCompletionPercentage)
                );

                // Mark the section as completed and update the completion percentage
                // Go to next section
                window.scrollTo(0, 0);
                callbacks.startUpdateInterview(section, {
                    'responses._activeSection': sections[section].nextSection,
                    [`responses._sections.${section}._isCompleted`]: true,
                    'responses._completionPercentage': completionPercentage
                });
            }
        }
    });
};

/**
 * Get the visited place description
 * @param visitedPlace The visited place for which to get the description
 * @param withTimes Whether to add the times to the description
 * @param allowHtml Whether the description can contain HTML characters
 * @returns
 */
export const getVisitedPlaceDescription = function (
    visitedPlace: VisitedPlace,
    withTimes: boolean = false,
    allowHtml: boolean = true
): string {
    let times = '';
    if (withTimes) {
        const arrivalTime =
            visitedPlace.arrivalTime !== undefined ? ' ' + secondsSinceMidnightToTimeStr(visitedPlace.arrivalTime) : '';
        const departureTime =
            visitedPlace.departureTime !== undefined
                ? ' -> ' + secondsSinceMidnightToTimeStr(visitedPlace.departureTime)
                : '';
        times = arrivalTime + departureTime;
    }
    if (allowHtml) {
        return `${i18n.t(`survey:visitedPlace:activities:${visitedPlace.activity}`)}${visitedPlace.name ? ` • <em>${visitedPlace.name}</em>` : ''}${times}`;
    } else {
        return `${i18n.t(`survey:visitedPlace:activities:${visitedPlace.activity}`)}${visitedPlace.name ? ` • ${visitedPlace.name}` : ''}${times}`;
    }
};
