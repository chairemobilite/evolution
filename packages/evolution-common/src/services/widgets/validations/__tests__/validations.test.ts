/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { postalCodeValidation, getPostalCodeRegex } from '../validations';
import projectConfig from '../../../../config/project.config';

// Mock the project config to be able to change the postalCodeRegion
jest.mock('../../../../config/project.config', () => ({
    postalCodeRegion: 'canada'  // Default for tests
}));

describe('postalCodeValidation', () => {
    // Mock the translation function for errors
    const mockTranslation = jest.fn().mockImplementation((key: string, _params) => key);

    describe('Empty postal code validation', () => {
        it('should return error when postal code is empty', () => {
            const result = postalCodeValidation('', undefined, {} as any, 'postalCode');
            expect(result.length).toBe(2);
            expect(result[0].validation).toBe(true); // Empty validation fails
            expect(typeof result[0].errorMessage).toEqual('function');
            expect((result[0].errorMessage as any)(mockTranslation)).toEqual('survey:errors:postalCodeRequired');
        });
    });
    
    describe('Canadian postal code validation', () => {
        beforeEach(() => {
            projectConfig.postalCodeRegion = 'canada';
        });
        
        test.each([
            'A1A 1A1', 
            'A1A1A1',
            'H3Z 2Y7', 
            'V8C 1A5'
        ])('should accept valid Canadian postal code: %s', (postalCode) => {
            const result = postalCodeValidation(postalCode, undefined, {} as any, 'postalCode');
            expect(result[1].validation).toBe(false); // Should be valid
        });
        
        test.each([
            ['D1A 1A1', 'D is not used in Canadian postal codes'],
            ['F1A 1A1', 'F is not used in Canadian postal codes'],
            ['123456', 'Wrong format'],
            ['A1A', 'Incomplete'],
            ['W1A 1A1', 'W not allowed in first position'],
            ['Z1A 1A1', 'Z not allowed in first position'],
            ['A1D 1A1', 'D not allowed in third position'],
            ['A1F 1A1', 'F not allowed in third position'],
            ['A1I 1A1', 'I not allowed in third position'],
            ['A1O 1A1', 'O not allowed in third position'],
            ['A1Q 1A1', 'Q not allowed in third position'],
            ['A1U 1A1', 'U not allowed in third position'],
            ['ARU TAY', 'all letters'],
            ['311 151', 'all numbers']
        ])('should reject invalid Canadian postal code: %s (%s)', (postalCode, reason) => {
            const result = postalCodeValidation(postalCode, undefined, {} as any, 'postalCode');
            expect(result[1].validation).toBe(true); // Should be invalid
            expect(typeof result[1].errorMessage).toEqual('function');
            expect((result[1].errorMessage as any)(mockTranslation)).toEqual('survey:errors:postalCodeInvalid');
            expect(mockTranslation).toHaveBeenLastCalledWith('survey:errors:postalCodeInvalid', { context: 'canada' });
        });
    });
    
    describe('Quebec postal code validation', () => {
        beforeEach(() => {
            projectConfig.postalCodeRegion = 'quebec';
        });
        
        test.each([
            'G1A 1A1',
            'H3Z 2Y7',
            'J7V 9Z9',
            'K2V 1A1'
        ])('should accept valid Quebec postal code: %s', (postalCode) => {
            const result = postalCodeValidation(postalCode, undefined, {} as any, 'postalCode');
            expect(result[1].validation).toBe(false); // Should be valid
        });
        
        test.each([
            ['D1A 1A1', 'D is not used in Canadian postal codes'],
            ['F1A 1A1', 'F is not used in Canadian postal codes'],
            ['123456', 'Wrong format'],
            ['A1A', 'Incomplete'],
            ['A1A 1A1', 'Newfoundland'],
            ['B1A 1A1', 'Nova Scotia'],
            ['C1A 1A1', 'PEI'],
            ['E1A 1A1', 'New Brunswick'],
            ['L1A 1A1', 'Ontario'],
            ['M1A 1A1', 'Ontario'],
            ['N1A 1A1', 'Ontario'],
            ['P1A 1A1', 'Ontario'],
            ['R1A 1A1', 'Manitoba'],
            ['S1A 1A1', 'Saskatchewan'],
            ['T1A 1A1', 'Alberta'],
            ['V1A 1A1', 'British Columbia'],
            ['ARU TAY', 'all letters'],
            ['311 151', 'all numbers']
        ])('should reject non-Quebec Canadian postal code: %s (%s)', (postalCode, province) => {
            const result = postalCodeValidation(postalCode, undefined, {} as any, 'postalCode');
            expect(result[1].validation).toBe(true); // Should be invalid
            expect(typeof result[1].errorMessage).toEqual('function');
            expect((result[1].errorMessage as any)(mockTranslation)).toEqual('survey:errors:postalCodeInvalid');
            expect(mockTranslation).toHaveBeenLastCalledWith('survey:errors:postalCodeInvalid', { context: 'quebec' });
        });
    });
    
    describe('Other postal code validation', () => {
        beforeEach(() => {
            projectConfig.postalCodeRegion = 'other';
        });
        
        test.each([
            ['A1A 1A1', 'Canadian'],
            ['H3Z 2Y7', 'Quebec'],
            ['12345', 'US-style'],
            ['12345-6789', 'US extended'],
            ['EC1A 1BB', 'UK'],
            ['ABC-123', 'Made up'],
            ['XYZ', 'Made up'],
            ['123 ABC', 'Made up with space']
        ])('should accept %s as a valid postal code (%s)', (postalCode, description) => {
            const result = postalCodeValidation(postalCode, undefined, {} as any, 'postalCode');
            expect(result[1].validation).toBe(false); // Should be valid
        });
    });
});

describe('getPostalCodeRegex', () => {
    test.each([
        ['A1A 1A1', true, 'Valid Canadian postal code'],
        ['D1A 1A1', false, 'Invalid Canadian postal code (D not allowed)']
    ])('with Canada region: %s should be %s (%s)', (postalCode, expected, reason) => {
        projectConfig.postalCodeRegion = 'canada';
        const regex = getPostalCodeRegex();
        expect(regex.test(postalCode)).toBe(expected);
    });
    
    test.each([
        ['H2X 1A1', true, 'Valid Quebec postal code'],
        ['A1A 1A1', false, 'Not a Quebec postal code']
    ])('with Quebec region: %s should be %s (%s)', (postalCode, expected, reason) => {
        projectConfig.postalCodeRegion = 'quebec';
        const regex = getPostalCodeRegex();
        expect(regex.test(postalCode)).toBe(expected);
    });
    
    test.each([
        ['12345', true, 'US-style postal code'],
        ['ABC-123', true, 'Made up postal code'],
        ['H2X 1A1', true, 'Canadian postal code']
    ])('with Other region: %s should be accepted (%s)', (postalCode, description) => {
        projectConfig.postalCodeRegion = 'other';
        const regex = getPostalCodeRegex();
        expect(regex.test(postalCode)).toBe(true);
    });
});