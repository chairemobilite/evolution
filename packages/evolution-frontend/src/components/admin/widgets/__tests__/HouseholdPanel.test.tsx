/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HouseholdPanel } from '../HouseholdPanel';
import type { AuditForObject } from 'evolution-common/lib/services/audits/types';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key
    })
}));

jest.mock('../../AuditDisplay', () => ({
    __esModule: true,
    default: ({ audits }: { audits?: AuditForObject[] }) => (
        <div data-testid="audit-display">{audits?.map((audit) => audit.message).join(' ')}</div>
    )
}));

jest.mock('../SurveyObjectBox', () => ({
    SurveyObjectBox: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const householdCreationAudit: AuditForObject = {
    version: 1,
    objectType: 'household',
    objectUuid: 'interview-uuid',
    errorCode: 'Household-validateParams-twoWheelNumber-should-be-a-positive-integer',
    message: 'Household validateParams: twoWheelNumber should be a positive integer',
    level: 'error'
};

describe('HouseholdPanel when household is missing', () => {
    test.each([
        { title: 'without audits', audits: undefined, expectAudits: false },
        { title: 'with creation audits', audits: [householdCreationAudit], expectAudits: true }
    ])('shows the unavailable message $title', ({ audits, expectAudits }) => {
        render(<HouseholdPanel audits={audits} />);

        expect(screen.getByText('interviewStats.errors.householdNotAvailable')).toBeInTheDocument();
        if (expectAudits) {
            expect(screen.getByTestId('audit-display')).toHaveTextContent(householdCreationAudit.message!);
        } else {
            expect(screen.queryByTestId('audit-display')).not.toBeInTheDocument();
        }
    });
});
