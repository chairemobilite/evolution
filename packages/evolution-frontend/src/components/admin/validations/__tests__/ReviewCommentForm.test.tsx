/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { v4 as uuidV4 } from 'uuid';

import ReviewCommentForm from '../ReviewCommentForm';
import { startUpdateSurveyCorrectedInterview } from '../../../../actions/SurveyAdmin';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

const mockDispatch = jest.fn();

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key
    })
}));

jest.mock('react-redux', () => ({
    useDispatch: () => mockDispatch
}));

jest.mock('../../../../actions/SurveyAdmin', () => ({
    startUpdateSurveyCorrectedInterview: jest.fn((data) => data)
}));

const mockStartUpdate = startUpdateSurveyCorrectedInterview as jest.MockedFunction<
    typeof startUpdateSurveyCorrectedInterview
>;

const buildInterview = (comment?: string, uuid = uuidV4()): UserInterviewAttributes =>
    ({
        id: 1,
        uuid,
        participant_id: 1,
        response: {
            _validationComment: comment
        },
        validations: {},
        is_completed: false
    }) as UserInterviewAttributes;

describe('ReviewCommentForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test.each([
        {
            title: 'does not save while typing',
            action: async (user: ReturnType<typeof userEvent.setup>, textarea: HTMLElement) => {
                await user.type(textarea, 'x');
            }
        },
        {
            title: 'does not save when focus leaves the field',
            action: async (user: ReturnType<typeof userEvent.setup>, textarea: HTMLElement) => {
                await user.type(textarea, 'x');
                await user.tab();
            }
        }
    ])('$title', async ({ action }) => {
        const user = userEvent.setup();
        render(<ReviewCommentForm interview={buildInterview('hello')} />);

        await action(user, screen.getByRole('textbox'));

        expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('shows Save only when the draft differs from the saved comment', async () => {
        const user = userEvent.setup();
        render(<ReviewCommentForm interview={buildInterview('hello')} />);

        expect(screen.queryByRole('button', { name: 'main:Save' })).not.toBeInTheDocument();

        await user.type(screen.getByRole('textbox'), 'x');
        expect(screen.getByRole('button', { name: 'main:Save' })).toBeInTheDocument();
    });

    it('saves on the Save button after a change', async () => {
        const user = userEvent.setup();
        render(<ReviewCommentForm interview={buildInterview('hello')} />);

        await user.type(screen.getByRole('textbox'), 'x');
        await user.click(screen.getByRole('button', { name: 'main:Save' }));

        expect(mockStartUpdate).toHaveBeenCalledTimes(1);
        expect(mockStartUpdate).toHaveBeenCalledWith({
            valuesByPath: { 'response._validationComment': 'hellox' }
        });
    });

    it('resets the draft when the interview changes', async () => {
        const user = userEvent.setup();
        const firstUuid = uuidV4();
        const { rerender } = render(<ReviewCommentForm interview={buildInterview('first', firstUuid)} />);

        await user.type(screen.getByRole('textbox'), 'x');
        rerender(<ReviewCommentForm interview={buildInterview('second', uuidV4())} />);

        expect(screen.getByRole('textbox')).toHaveValue('second');
        expect(screen.queryByRole('button', { name: 'main:Save' })).not.toBeInTheDocument();
        expect(mockDispatch).not.toHaveBeenCalled();
    });
});
