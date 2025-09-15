/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { hexToRgb } from '../ColorUtils';

describe('hexToRgb', () => {

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { return; });
    afterEach(() => consoleErrorSpy.mockClear());

    test.each([
        { input: '#000000', expected: [0, 0, 0], description: '6-digit hex with # (black)' },
        { input: '#FFFFFF', expected: [255, 255, 255], description: '6-digit hex with # (white)' },
        { input: '#FF0000', expected: [255, 0, 0], description: '6-digit hex with # (red)' },
        { input: '#Ff00Aa', expected: [255, 0, 170], description: '6-digit hex with mixed case' },
        { input: 'ffffff', expected: [255, 255, 255], description: '6-digit hex without # (white)' },
        { input: 'fff', expected: [255, 255, 255], description: '3-digit hex without # (white)' },
        { input: '#000', expected: [0, 0, 0], description: '3-digit hex with # (black)' },
        { input: '0f0', expected: [0, 255, 0], description: '3-digit hex without # (green)' }
    ])('should convert valid hex color "$input" to RGB array ($description)', ({ input, expected }) => {
        expect(hexToRgb(input)).toEqual(expected);
    });

    test.each([
        { input: '0.23', description: 'decimal number' },
        { input: 'FFFFZZ', description: '6-digit with invalid characters' },
        { input: 'ZZ0000', description: '6-digit starting with invalid characters' },
        { input: '#0.23', description: 'decimal number with #' },
        { input: '#FFFFZZ', description: '6-digit with # and invalid characters' },
        { input: '#ZZ0000', description: '6-digit with # starting with invalid characters' },
        { input: 'rgb(0, 0, 0)', description: 'RGB function format (black)' },
        { input: 'rgb(255, 255, 255)', description: 'RGB function format (white)' },
        { input: 'rgb(255, 0, 0)', description: 'RGB function format (red)' },
        { input: '#000000sfkjsdhlfjd', description: '6-digit hex with # and extra characters' },
        { input: '#fff_sfkjsdhlfjd', description: '3-digit hex with # and extra characters' }
    ])('should return undefined for invalid hex color "$input" ($description)', ({ input }) => {
        expect(hexToRgb(input)).toBeUndefined();
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

});
