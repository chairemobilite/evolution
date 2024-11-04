/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import moment from 'moment';
import i18n from '../../../config/i18n.config';

import { TFunction } from 'i18next';
import { getGenderedStrings, getFormattedDate, secondsSinceMidnightToTimeStrWithSuffix } from '../frontendHelper';

jest.mock('../../../config/i18n.config', () => ({
    t: jest.fn((key, options) => `${key}${options && options.context ? `_${options.context}` : ''}${options && options.count !== undefined ? `_${options.count}` : '' }`)
}));
const mockedT = i18n.t as jest.MockedFunction<TFunction>;


describe('getGenderedSuffixes', () => {
    it('should return default suffixes for undefined person', () => {
        const result = getGenderedStrings(undefined, mockedT);
        expect(result).toEqual({
            suffixE: 'survey:suffixE_none',
            suffixEurRice: 'survey:suffixEurRice_none',
            suffixErEre: 'survey:suffixErEre_none',
            isHeShe: 'survey:isHeShe_none',
            doesHeShe: 'survey:doesHeShe_none',
            heShe: 'survey:heShe_none',
            ifHeShe: 'survey:ifHeShe_none',
            himHerThem: 'survey:himHerThem_none',
            hisHerTheir: 'survey:hisHerTheir_none'
        });
    });

    it('should return default suffixes for null person', () => {
        const result = getGenderedStrings(null, mockedT);
        expect(result).toEqual({
            suffixE: 'survey:suffixE_none',
            suffixEurRice: 'survey:suffixEurRice_none',
            suffixErEre: 'survey:suffixErEre_none',
            isHeShe: 'survey:isHeShe_none',
            doesHeShe: 'survey:doesHeShe_none',
            heShe: 'survey:heShe_none',
            ifHeShe: 'survey:ifHeShe_none',
            himHerThem: 'survey:himHerThem_none',
            hisHerTheir: 'survey:hisHerTheir_none'
        });
    });

    it('should return suffixes based on person gender', () => {
        const person = { gender: 'male' as const, _sequence: 1, _uuid: 'uuid' };
        const result = getGenderedStrings(person, mockedT);
        expect(result).toEqual({
            suffixE: 'survey:suffixE_male',
            suffixEurRice: 'survey:suffixEurRice_male',
            suffixErEre: 'survey:suffixErEre_male',
            isHeShe: 'survey:isHeShe_male',
            doesHeShe: 'survey:doesHeShe_male',
            heShe: 'survey:heShe_male',
            ifHeShe: 'survey:ifHeShe_male',
            himHerThem: 'survey:himHerThem_male',
            hisHerTheir: 'survey:hisHerTheir_male'
        });
    });
});

describe('getFormattedi18nDate', () => {
    it('should return formatted date with default locale and without day of week or relative', () => {
        const date = '2023-10-01';
        const result = getFormattedDate(date);
        expect(result).toBe(moment(date).format('LL'));
    });

    it('should return formatted date with specified locale and without day of week', () => {
        const date = '2023-10-01';
        const locale = 'fr';
        const result = getFormattedDate(date, { locale });
        expect(result).toBe(moment(date).locale(locale).format('LL'));
    });

    it('should return formatted date with day of week', () => {
        const date = '2023-10-01';
        const result = getFormattedDate(date, { withDayOfWeek: true });
        expect(result).toBe(moment(date).format('dddd LL'));
    });

    it('should return formatted date with relative date (yesterday)', () => {
        const date = moment().subtract(1, 'days').format('YYYY-MM-DD');
        const result = getFormattedDate(date, { withRelative: true });
        expect(result).toContain(i18n.t('survey:pastToday_1'));
    });

    it('should return formatted date with relative date (day before yesterday)', () => {
        const date = moment().subtract(2, 'days').format('YYYY-MM-DD');
        const result = getFormattedDate(date, { withRelative: true });
        expect(result).toContain(i18n.t('survey:pastToday_2'));
    });

    it('should return formatted date with relative date (today)', () => {
        const date = moment().format('YYYY-MM-DD');
        const result = getFormattedDate(date, { withRelative: true });
        expect(result).toContain(i18n.t('survey:pastToday_0'));
    });

    it('should return formatted date with relative date (tomorrow)', () => {
        const date = moment().add(1, 'days').format('YYYY-MM-DD');
        const result = getFormattedDate(date, { withRelative: true });
        expect(result).toContain(i18n.t('survey:futureToday_1'));
    });
});

describe('secondsSinceMidnightToTimeStrWithSuffix', () => {
    it('should return time string for seconds since midnight within the same day', () => {
        const secondsSinceMidnight = 3600; // 1 hour
        const result = secondsSinceMidnightToTimeStrWithSuffix(secondsSinceMidnight);
        expect(result).toBe('1:00');
    });

    it('should return time string for seconds since midnight with suffix for the next day', () => {
        const secondsSinceMidnight = 25 * 3600; // 25 hours
        const result = secondsSinceMidnightToTimeStrWithSuffix(secondsSinceMidnight);
        expect(result).toBe(`1:00 ${i18n.t('main:theNextDay')}`);
    });

    it('should return time string for seconds since midnight with custom suffix for the next day', () => {
        const secondsSinceMidnight = 26 * 3600; // 26 hours
        const customSuffix = 'the following day';
        const result = secondsSinceMidnightToTimeStrWithSuffix(secondsSinceMidnight, customSuffix);
        expect(result).toBe('2:00 the following day');
    });

    it('should return time string for exactly midnight', () => {
        const secondsSinceMidnight = 0; // 0 hours
        const result = secondsSinceMidnightToTimeStrWithSuffix(secondsSinceMidnight);
        expect(result).toBe('0:00');
    });

    it('should return time string for exactly 24 hours', () => {
        const secondsSinceMidnight = 24 * 3600; // 24 hours
        const result = secondsSinceMidnightToTimeStrWithSuffix(secondsSinceMidnight);
        expect(result).toBe(`0:00 ${i18n.t('main:theNextDay')}`);
    });
});
