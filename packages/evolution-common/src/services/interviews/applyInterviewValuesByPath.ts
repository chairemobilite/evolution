/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _set from 'lodash/set';
import _unset from 'lodash/unset';

export type ApplyInterviewValuesByPathOptions = {
    valuesByPath?: { [path: string]: unknown };
    unsetPaths?: string[];
};

/**
 * Apply valuesByPath and unsetPaths to an interview-like object.
 *
 * `valuesByPath` are applied first, then `unsetPaths`. An `undefined` value in
 * `valuesByPath` unsets the path instead of assigning `undefined`.
 *
 * Values are applied before unsets so that a deep field update followed by
 * removing a parent object does not leave trailing nested data on a partially
 * recreated parent (e.g. updating a trip time, then removing the person).
 *
 * @param interview Interview object to mutate
 * @param options Values to set and paths to unset
 */
export const applyInterviewValuesByPath = <T extends object>(
    interview: T,
    options: ApplyInterviewValuesByPathOptions
): void => {
    if (options.valuesByPath) {
        for (const path in options.valuesByPath) {
            if (options.valuesByPath[path] === undefined) {
                _unset(interview, path);
            } else {
                _set(interview, path, options.valuesByPath[path]);
            }
        }
    }

    if (Array.isArray(options.unsetPaths)) {
        for (const path of options.unsetPaths) {
            _unset(interview, path);
        }
    }
};
