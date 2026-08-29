/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render } from '@testing-library/react';
import type { ReviewDecisionEffectiveStatus } from 'evolution-common/lib/services/reviews/types';
import { InterviewPanel } from '../InterviewPanel';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key })
}));

const mockedUseReviewDecisionStatusByObject = jest.fn();
jest.mock('../../../../services/admin/useObjectReview', () => ({
    useReviewDecisionStatusByObject: (...args: unknown[]) => mockedUseReviewDecisionStatusByObject(...args)
}));

const interviewUuid = '11111111-1111-4111-8111-111111111111';
const interview = { uuid: interviewUuid, paradata: { languages: [] } } as any;

// [effective status, expected class on the panel]
const statusCases: [ReviewDecisionEffectiveStatus | 'notReviewedAtAll', string | null][] = [
    ['approved', 'admin__survey-object-box--approved'],
    ['forceApproved', 'admin__survey-object-box--approved'],
    ['rejected', 'admin__survey-object-box--rejected'],
    ['conflict', 'admin__survey-object-box--conflict'],
    ['notReviewedAtAll', null]
];

test.each(statusCases)('the panel of a %s interview carries the class %s', (effectiveStatus, expectedClass) => {
    mockedUseReviewDecisionStatusByObject.mockReturnValue(
        effectiveStatus === 'notReviewedAtAll'
            ? undefined
            : { objectType: 'interview', objectUuid: interviewUuid, effectiveStatus, isReviewed: true }
    );

    const { container } = render(<InterviewPanel interview={interview} />);

    const details = container.querySelector('details') as HTMLDetailsElement;
    // Only the status modifier is applied: the interview panel keeps no frame of its own.
    expect(details.className).toBe(expectedClass ?? '');
});
