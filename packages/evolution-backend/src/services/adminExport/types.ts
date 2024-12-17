/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

export type ExportOptions = {
    /** Specifies which set of responses should be exported. 'validated' means
     * it exports the validated data if available, 'participant' is the original
     * participant responses */
    responseType: 'participant' | 'validatedIfAvailable';
};
