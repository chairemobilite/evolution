/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { setProjectConfiguration } from "chaire-lib-common/lib/config/shared/project.config";
import projectConfig, { EvolutionProjectConfiguration } from "../project.config";

test('Expected default', () => {
    expect(projectConfig).toEqual(expect.objectContaining({
        region: 'CA',
        selfResponseMinimumAge: 14,
        drivingLicenseAge: 16,
        logDatabaseUpdates: false
    }));
});

test('set project configuration', () => {
    setProjectConfiguration<EvolutionProjectConfiguration>({
        region: 'FR',
        selfResponseMinimumAge: 18,
        logDatabaseUpdates: true
    })
    expect(projectConfig).toEqual(expect.objectContaining({
        region: 'FR',
        selfResponseMinimumAge: 18,
        drivingLicenseAge: 16,
        logDatabaseUpdates: true
    }));
});
