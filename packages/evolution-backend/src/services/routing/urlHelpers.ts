/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Checks if a pathname ends with a file extension
 * @param params Object containing the pathname
 * @param params.pathname The URL pathname to check
 * @returns true if the pathname ends with a file extension (e.g., .js, .css, .png)
 */
export const hasFileExtension = ({ pathname }: { pathname: string }): boolean => {
    // Regex explanation: /\.[^/]+$/ means:
    // \. = literal dot character
    // [^/]+ = one or more characters that are NOT forward slashes
    // $ = end of string (ensures the extension is at the very end)
    return /\.[^/]+$/.test(pathname);
};
