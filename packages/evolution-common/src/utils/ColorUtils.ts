/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Converts a hex color string to an RGB array
 * @param hex - The hex color string (example: #000000)
 * @returns The RGB array or undefined if the hex color string is invalid (example: rgb(0, 0, 0))
 */
export const hexToRgb = (hex: string): [number, number, number] | undefined => {
    if (!hex.startsWith('#')) {
        // if the hex color string is not prefixed with a #, add it
        hex = `#${hex}`;
    }
    const cleanHex = hex.replace('#', '').toLowerCase();
    const match = cleanHex.match(/[0-9a-f]{2}/g);
    if (match && match.length === 3) {
        return [parseInt(match[0], 16), parseInt(match[1], 16), parseInt(match[2], 16)];
    } else {
        console.error(`Invalid hex color string: ${hex}`);
        return undefined;
    }
};
