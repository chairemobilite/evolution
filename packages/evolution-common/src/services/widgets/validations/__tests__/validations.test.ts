/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import * as validations from '../validations';
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
            const result = validations.postalCodeValidation('', undefined, {} as any, 'postalCode');
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
            const result = validations.postalCodeValidation(postalCode, undefined, {} as any, 'postalCode');
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
            const result = validations.postalCodeValidation(postalCode, undefined, {} as any, 'postalCode');
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
            const result = validations.postalCodeValidation(postalCode, undefined, {} as any, 'postalCode');
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
            const result = validations.postalCodeValidation(postalCode, undefined, {} as any, 'postalCode');
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
            const result = validations.postalCodeValidation(postalCode, undefined, {} as any, 'postalCode');
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
        const regex = validations.getPostalCodeRegex();
        expect(regex.test(postalCode)).toBe(expected);
    });
    
    test.each([
        ['H2X 1A1', true, 'Valid Quebec postal code'],
        ['A1A 1A1', false, 'Not a Quebec postal code']
    ])('with Quebec region: %s should be %s (%s)', (postalCode, expected, reason) => {
        projectConfig.postalCodeRegion = 'quebec';
        const regex = validations.getPostalCodeRegex();
        expect(regex.test(postalCode)).toBe(expected);
    });
    
    test.each([
        ['12345', true, 'US-style postal code'],
        ['ABC-123', true, 'Made up postal code'],
        ['H2X 1A1', true, 'Canadian postal code']
    ])('with Other region: %s should be accepted (%s)', (postalCode, description) => {
        projectConfig.postalCodeRegion = 'other';
        const regex = validations.getPostalCodeRegex();
        expect(regex.test(postalCode)).toBe(true);
    });
});

describe('phoneValidation', () => {
    // Test cases for valid phone numbers
    test.each([
        // Valid formats with dashes
        '223-456-7890',
        '999-999-9999',
        // Valid formats with spaces
        '223 456 7890',
        '999 999 9999',
        // Valid formats without separators
        '2234567890',
        '9999999999',
        // Valid formats with parentheses
        '(223) 456-7890',
        '(223)-456-7890',
        '(999)999-9999',
        // Valid north american formats with +1
        '+12234567890',
        '+1 (223) 456-7890',
        '+1 223-456-7890',
        // Empty string (validation should pass for optional phone)
        ''
    ])('should return no validation errors for valid north american phone number: %s', (phoneNumber) => {
        const result = validations.phoneValidation(phoneNumber, undefined, {} as any, 'phoneNumber');
        // For valid phone numbers, the validation property should be false
        expect(result.length).toBe(1);
        expect(result[0].validation).toBe(false);
    });

    // Test cases for valid international phone numbers 
    test.each([
        // International phone numbers
        '+44 20 7946 0958', // UK number
        '+33 1 12 34 56 00', // France number
        '+49 30 12345678', // Germany number
        '+386 64 123 456', // Slovenia number
        '+1 416 123 4567', // Canada number
        '+1 868 123 4567', // Trinidad and Tobago number
        '+7 495 123-45-67', // Russia number
        '+33170189900', // France number no spacing
        '+377 9216789', // Monaco number
        '+86 10 5762 6809', // China number
        '+86 138 2639 5248', // China mobile number
        '+234 8034 123 4567', // Nigeria (Africa) number with 14 digits
        '+27 87 135 4489', // South Africa number
    ])('should return no validation errors for valid international phone number: %s', (phoneNumber) => {
        const result = validations.phoneValidation(phoneNumber, undefined, {} as any, 'phoneNumber');
        // For valid phone numbers, the validation property should be false
        expect(result.length).toBe(1);
        expect(result[0].validation).toBe(false);
    });

    // Test cases for invalid phone numbers
    test.each([
        // Too few digits
        '223-456-789',
        '223-45-7890',
        '22-456-7890',
        '+33 1 12 34 56',
        // Too many digits
        '223-456-78901',
        '223-4567-7890',
        '+44 20 7946 09589 456',
        // north american phone without +1
        '1234-456-7890',
        // north american phone area code can't start with 0 or 1
        '(123) 456-7890',
        '(023) 456-7890',
        // Invalid characters
        'abc-def-ghij',
        '223-ABC-7890',
        '223-456-DEFG',
        '+33 [1] 12 34 56 00', // Extra brackets
        // Invalid formats
        '223--456-7890',
        '223-456--7890',
        '-223-456-7890',
        '223-456-7890-',
        // International phone number without a + sign
        '44 20 7946 0958',
        '33 1 70 18 99 00',
        '49 30 12345678'
    ])('should return validation errors for invalid phone number: %s', (phoneNumber) => {
        const result = validations.phoneValidation(phoneNumber, undefined, {} as any, 'phoneNumber');
        // For invalid phone numbers, the validation property should be true
        expect(result.length).toBe(1);
        expect(result[0].validation).toBe(true);
    });
});

describe('accessCodeValidation', () => {
    // Mock the translation function for errors
    const mockTranslation = jest.fn().mockImplementation((key: string, _params) => key);

    describe('Empty access code validation', () => {
        it('should return error when access code is empty', () => {
            const result = validations.accessCodeValidation('', undefined, {} as any, 'accessCode');
            expect(result.length).toBe(2);
            expect(result[0].validation).toBe(true); // Empty validation fails
            expect(typeof result[0].errorMessage).toEqual('function');
            expect((result[0].errorMessage as any)(mockTranslation)).toEqual('survey:errors:accessCodeRequired');
        });
    });
    
    describe('eight digits access code validation', () => {
        
        test.each([
            '2345-2345', 
            '1234 1234',
            '12341234'
        ])('should accept valid 8-digits access codes: %s', (accessCode) => {
            const result = validations.accessCodeValidation(accessCode, undefined, {} as any, 'accessCode');
            expect(result[0].validation).toBe(false); // Empty validation passes
            expect(result[1].validation).toBe(false); // Should be valid
        });
        
        test.each([
            ['2345-abcd', 'Contains letters'],
            ['2345 45', 'Too short'],
            ['123412341234', 'Too long'],
            ['12-345678', 'Misplaced dash'],
        ])('should reject invalid 8-digits access code: %s (%s)', (accessCode, _reason) => {
            const result = validations.accessCodeValidation(accessCode, undefined, {} as any, 'accessCode');
            expect(result[0].validation).toBe(false); // Empty validation passes
            expect(result[1].validation).toBe(true); // Should be invalid
            expect(typeof result[1].errorMessage).toEqual('function');
            expect((result[1].errorMessage as any)(mockTranslation)).toEqual('survey:errors:accessCodeInvalid');
            expect(mockTranslation).toHaveBeenLastCalledWith('survey:errors:accessCodeInvalid');
        });
    });
    
});