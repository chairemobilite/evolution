/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import projectConfig from "../project.config";

test('test default values', () => {
    expect(projectConfig).toEqual(expect.objectContaining({
        region: 'CA',
        selfResponseMinimumAge: 14,
        logDatabaseUpdates: false
    }));
});