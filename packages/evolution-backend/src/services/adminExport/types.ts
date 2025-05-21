/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

export type ExportOptions = {
    /** Specifies which set of response should be exported. 'corrected' means
     * it exports the corrected response if available, 'participant' is the original
     * participant response */
    responseType: 'participant' | 'correctedIfAvailable';
};
