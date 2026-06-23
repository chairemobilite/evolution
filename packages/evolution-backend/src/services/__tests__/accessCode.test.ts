/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import {
    validateAccessCode,
    registerAccessCodeValidationFunction,
    matchesConfiguredAccessCodeFormat,
    normalizeAccessCode
} from '../accessCode';
import projectConfig from 'evolution-common/lib/config/project.config';
import each from 'jest-each';

describe('normalizeAccessCode (configured format)', () => {
    afterEach(() => {
        projectConfig.accessCodeFormat = '0000-0000';
    });

    each([
        // [format, input, canonical output]
        ['0000-0000', '12345678', '1234-5678'], // missing dash
        ['0000-0000', '1234 5678', '1234-5678'], // spaces
        ['0000-0000', '  1234-5678  ', '1234-5678'], // surrounding whitespace
        ['000-000-000', '123456789', '123-456-789'],
        ['ABC-000-000', 'abc123456', 'ABC-123-456'], // lower-cased
        // Codes that do not match the configured format are returned trimmed but unchanged
        ['0000-0000', '  7145328  ', '7145328'],
        ['0000-0000', 'custom-code', 'custom-code']
    ]).test('format %s normalizes %s to %s', (format, input, expected) => {
        projectConfig.accessCodeFormat = format;
        expect(normalizeAccessCode(input)).toEqual(expected);
    });
});

describe('matchesConfiguredAccessCodeFormat', () => {
    afterEach(() => {
        projectConfig.accessCodeFormat = '0000-0000';
    });

    each([
        // [configured format, access code, matches]
        ['0000-0000', '1234-5678', true],
        ['0000-0000', '12345678', true],
        ['0000-0000', '1234567', false],
        ['0000-0000', '123-456-789', false],
        ['000-000-000', '123-456-789', true],
        ['000-000-000', '123456789', true],
        ['000-000-000', '1234-5678', false],
        ['000-000-000', 'abc-def-ghi', false],
        ['ABC-000-000', 'ABC-123-456', true],
        ['ABC-000-000', '123-123-456', false],
        ['0000-0000', '', false]
    ]).test('format %s matches %s as %s', (format, accessCode, result) => {
        projectConfig.accessCodeFormat = format;
        expect(matchesConfiguredAccessCodeFormat(accessCode)).toEqual(result);
    });
});

describe('validateAccessCode enforces the configured format and an additional check', () => {
    // The additional check only accepts this specific (format-matching) code
    const issuedCode = '1234-5678';
    beforeAll(() => {
        registerAccessCodeValidationFunction((accessCode) => accessCode === issuedCode);
    });
    afterAll(() => {
        registerAccessCodeValidationFunction(() => true);
    });

    each([
        ['matches format and passes additional check', issuedCode, true],
        ['surrounding whitespace is trimmed before validation', '  1234-5678  ', true],
        ['matches format but fails additional check', '9999-9999', false],
        ['matches format (no dash) but fails additional check', '99999999', false],
        ['does not match the configured format', '7145328', false],
        ['blank', '', false]
    ]).test('%s: %s => %s', (_description, accessCode, result) => {
        expect(validateAccessCode(accessCode)).toEqual(result);
    });
});