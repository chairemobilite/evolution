/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { householdAuditChecks } from '../../HouseholdAuditChecks';
import { createContextWithHouseholdAndHome } from './testHelper';
import { Vehicle } from 'evolution-common/lib/services/baseObjects/Vehicle';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

describe('HH_L_CarNumberVehiclesCountMismatch audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();
    const surveyObjectsRegistry = new SurveyObjectsRegistry();

    const makeVehicles = (count: number) =>
        Array.from({ length: count }, () => new Vehicle({ _uuid: uuidV4() }, surveyObjectsRegistry));

    it('should pass when household has valid car number and vehicles count', () => {
        const context = createContextWithHouseholdAndHome({
            carNumber: 3,
            vehicles: makeVehicles(3)
        }, undefined, validHouseholdUuid, validHomeUuid);

        const result = householdAuditChecks.HH_L_CarNumberVehiclesCountMismatch(context);

        expect(result).toBeUndefined();
    });

    const mismatchCases: ReadonlyArray<[carNumber: number, vehicleCount: number]> = [
        [0, 1],
        [1, 2],
        [5, 1]
    ];

    it.each(mismatchCases)(
        'should error when carNumber is %i but vehicles count is %i',
        (carNumber, vehicleCount) => {
            const context = createContextWithHouseholdAndHome(
                { carNumber, vehicles: makeVehicles(vehicleCount) },
                undefined,
                validHouseholdUuid,
                validHomeUuid
            );

            const result = householdAuditChecks.HH_L_CarNumberVehiclesCountMismatch(context);

            expect(result).toMatchObject({
                objectType: 'household',
                objectUuid: validHouseholdUuid,
                errorCode: 'HH_L_CarNumberVehiclesCountMismatch',
                version: 1,
                level: 'error',
                message: 'Car number and vehicles count mismatch',
                ignore: false
            });
        }
    );

    const skipWhenIncompleteCases: ReadonlyArray<[label: string, overrides: { carNumber?: number; vehicles?: Vehicle[] }]> =
        [
            ['carNumber undefined', { carNumber: undefined, vehicles: makeVehicles(1) }],
            ['vehicles undefined', { carNumber: 1 }],
            ['carNumber and vehicles undefined', { carNumber: undefined }]
        ];

    it.each(skipWhenIncompleteCases)(
        'should return undefined when %s (mismatch check skipped)',
        (_label, overrides) => {
            const context = createContextWithHouseholdAndHome(
                overrides,
                undefined,
                validHouseholdUuid,
                validHomeUuid
            );

            expect(householdAuditChecks.HH_L_CarNumberVehiclesCountMismatch(context)).toBeUndefined();
        }
    );

});

