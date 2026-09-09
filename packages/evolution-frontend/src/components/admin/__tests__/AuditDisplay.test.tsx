/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuditDisplay from '../AuditDisplay';
import type { AuditForObject } from 'evolution-common/lib/services/audits/types';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: { defaultValue?: string }) => {
            if (key === 'audits:HH_I_TwoWheelNumber') {
                return 'translated two-wheel error';
            }
            return options?.defaultValue ?? key;
        }
    })
}));

const baseAudit: AuditForObject = {
    version: 1,
    objectType: 'household',
    objectUuid: 'interview-uuid',
    errorCode: 'HH_I_TwoWheelNumber',
    message: 'Household validateParams: twoWheelNumber should be a positive integer',
    level: 'error'
};

describe('AuditDisplay', () => {
    test.each([
        {
            title: 'uses the translation when it exists',
            audit: baseAudit,
            expected: 'translated two-wheel error'
        },
        {
            title: 'falls back to the audit message when there is no translation',
            audit: {
                ...baseAudit,
                errorCode: 'Household-validateParams-twoWheelNumber-should-be-a-positive-integer'
            },
            expected: 'Household validateParams: twoWheelNumber should be a positive integer'
        },
        {
            title: 'falls back to the error code when message and translation are missing',
            audit: { ...baseAudit, errorCode: 'unknown-code', message: undefined },
            expected: 'unknown-code'
        }
    ])('$title', ({ audit, expected }) => {
        render(<AuditDisplay audits={[audit]} />);
        expect(screen.getByText(expected)).toBeInTheDocument();
    });
});
