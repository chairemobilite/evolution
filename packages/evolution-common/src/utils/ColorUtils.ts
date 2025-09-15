/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Converts a hex color string to an RGB array
 * @param hex - The hex color string (example: #000000 or #000)
 * @returns The RGB array or undefined if the hex color string is invalid (example: rgb(0, 0, 0))
 */
export const hexToRgb = (hex: string): [number, number, number] | undefined => {
    const clean = hex.startsWith('#') ? hex.slice(1) : hex;

    // Support both 3-digit (#abc) and 6-digit (#aabbcc) hex colors
    if (/^[0-9a-fA-F]{3}$/.test(clean)) {
        // 3-digit hex: expand each digit (e.g., "abc" -> "aabbcc")
        const r = parseInt(clean[0] + clean[0], 16);
        const g = parseInt(clean[1] + clean[1], 16);
        const b = parseInt(clean[2] + clean[2], 16);
        return [r, g, b];
    } else if (/^[0-9a-fA-F]{6}$/.test(clean)) {
        // 6-digit hex: normal parsing
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        return [r, g, b];
    } else {
        console.error(`Invalid hex color string: ${hex}`);
        return undefined;
    }
};
