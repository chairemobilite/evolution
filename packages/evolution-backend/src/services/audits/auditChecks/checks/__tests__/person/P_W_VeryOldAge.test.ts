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

describe('P_W_VeryOldAge audit check', () => {
    const validUuid = uuidV4();
    const warningAge = 100;
    const originalWarningAge = projectConfig.addAuditWarningVeryOldAge;

    beforeEach(() => {
        projectConfig.addAuditWarningVeryOldAge = warningAge;
    });

    afterEach(() => {
        projectConfig.addAuditWarningVeryOldAge = originalWarningAge;
    });

    // [title, age, shouldWarn]
    const cases: [string, number | undefined | null, boolean][] = [
        ['age below the warning threshold does not warn', warningAge - 1, false],
        ['age at the warning threshold warns', warningAge, true],
        ['age at the maximum warns', projectConfig.maxPersonAge, true],
        ['age above the maximum does not warn', projectConfig.maxPersonAge + 1, false],
        ['typical age does not warn', 30, false],
        ['undefined age does not warn', undefined, false],
        ['null age does not warn', null, false]
    ];

    it.each(cases)('%s', (_title, age, shouldWarn) => {
        const context = createContextWithPerson({ age: age as number | undefined }, validUuid);

        const result = personAuditChecks.P_W_VeryOldAge(context);

        if (shouldWarn) {
            expect(result).toMatchObject({
                objectType: 'person',
                objectUuid: validUuid,
                errorCode: 'P_W_VeryOldAge',
                version: 1,
                level: 'warning',
                message: 'Person is very old, please validate',
                ignore: false
            });
        } else {
            expect(result).toBeUndefined();
        }
    });

    it('does not warn when addAuditWarningVeryOldAge is not configured', () => {
        projectConfig.addAuditWarningVeryOldAge = undefined;

        const context = createContextWithPerson({ age: warningAge }, validUuid);

        expect(personAuditChecks.P_W_VeryOldAge(context)).toBeUndefined();
    });
});
