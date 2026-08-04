/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import projectConfig from 'evolution-common/lib/config/project.config';
import { personAuditChecks } from '../../PersonAuditChecks';
import { createContextWithPerson } from './testHelper';

describe('P_I_AgeTooHigh audit check', () => {
    const validUuid = uuidV4();

    // [title, age, shouldError]
    const cases: [string, number | undefined | null, boolean][] = [
        ['age at the maximum does not error', projectConfig.ages.maxPersonAge, false],
        ['age above the maximum errors', projectConfig.ages.maxPersonAge + 1, true],
        ['typical age does not error', 30, false],
        ['undefined age does not error', undefined, false],
        ['null age does not error', null, false]
    ];

    it.each(cases)('%s', (_title, age, shouldError) => {
        const context = createContextWithPerson({ age: age as number | undefined }, validUuid);

        const result = personAuditChecks.P_I_AgeTooHigh(context);

        if (shouldError) {
            expect(result).toMatchObject({
                objectType: 'person',
                objectUuid: validUuid,
                errorCode: 'P_I_AgeTooHigh',
                version: 1,
                level: 'error',
                message: 'Person age is too high',
                ignore: false
            });
        } else {
            expect(result).toBeUndefined();
        }
    });
});
