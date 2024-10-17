/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { TFunction } from 'i18next';
import moment from 'moment';

import i18n from '../../config/i18n.config';
import { Person } from 'evolution-common/lib/services/interviews/interview';

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
