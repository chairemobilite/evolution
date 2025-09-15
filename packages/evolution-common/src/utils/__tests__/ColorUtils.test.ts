/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { hexToRgb } from '../ColorUtils';

describe('hexToRgb', () => {

    it('should convert a hex color string to an RGB array', () => {
        expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
        expect(hexToRgb('#FFFFFF')).toEqual([255, 255, 255]);
        expect(hexToRgb('#FF0000')).toEqual([255, 0, 0]);
        expect(hexToRgb('ffffff')).toEqual([255, 255, 255]);
    });

    it('should accept 6-digit hex without #', () => {
        expect(hexToRgb('ffffff')).toEqual([255, 255, 255]);
    });

    it('should accept 3-digit hex without #', () => {
        expect(hexToRgb('fff')).toEqual([255, 255, 255]);
        expect(hexToRgb('#000')).toEqual([0, 0, 0]);
        expect(hexToRgb('0f0')).toEqual([0, 255, 0]);
    });

    it('should return undefined if the hex color string is invalid', () => {
        expect(hexToRgb('0.23')).toEqual(undefined);
        expect(hexToRgb('FFFFZZ')).toEqual(undefined);
        expect(hexToRgb('ZZ0000')).toEqual(undefined);
        expect(hexToRgb('#0.23')).toEqual(undefined);
        expect(hexToRgb('#FFFFZZ')).toEqual(undefined);
        expect(hexToRgb('#ZZ0000')).toEqual(undefined);
        expect(hexToRgb('rgb(0, 0, 0)')).toEqual(undefined);
        expect(hexToRgb('rgb(255, 255, 255)')).toEqual(undefined);
        expect(hexToRgb('rgb(255, 0, 0)')).toEqual(undefined);
        expect(hexToRgb('#000000sfkjsdhlfjd')).toEqual(undefined);
        expect(hexToRgb('#fff_sfkjsdhlfjd')).toEqual(undefined);
    });

});
