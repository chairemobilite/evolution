/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { v4 as uuidV4 } from 'uuid';
import { SurveyObjectBox } from '../SurveyObjectBox';
import {
    hasObjectReviewControls,
    renderObjectReviewButtons
} from '../../validations/renderObjectReviewButtons';

jest.mock('../../validations/renderObjectReviewButtons', () => ({
    hasObjectReviewControls: jest.fn(() => true),
    renderObjectReviewButtons: jest.fn(() => <div data-testid="review-buttons" />)
}));

const mockHasObjectReviewControls = hasObjectReviewControls as jest.MockedFunction<typeof hasObjectReviewControls>;
const mockRenderObjectReviewButtons = renderObjectReviewButtons as jest.MockedFunction<
    typeof renderObjectReviewButtons
>;

const objectUuid = uuidV4();
const objectReviewHandlers = {
    canForceApprove: false,
    onObjectReview: jest.fn()
};

const baseProps = {
    objectType: 'person' as const,
    objectUuid,
    objectReviewHandlers,
    children: <div data-testid="box-content">Content</div>
};

beforeEach(() => {
    jest.clearAllMocks();
    mockHasObjectReviewControls.mockReturnValue(true);
    mockRenderObjectReviewButtons.mockImplementation(() => <div data-testid="review-buttons" />);
});

describe('SurveyObjectBox', () => {
    describe('details variant', () => {
        it('clones an existing summary element and injects review buttons inside it', () => {
            render(
                <SurveyObjectBox
                    {...baseProps}
                    as="details"
                    summary={<summary data-testid="person-summary">Person header</summary>}
                />
            );

            expect(document.querySelectorAll('summary')).toHaveLength(1);
            const summary = screen.getByTestId('person-summary');
            expect(summary).toHaveTextContent('Person header');
            expect(summary).toContainElement(screen.getByTestId('review-buttons'));
        });

        it('wraps non-summary summary content and injects review buttons', () => {
            render(<SurveyObjectBox {...baseProps} as="details" summary="Plain summary" />);

            const summary = document.querySelector('summary');
            expect(summary).toBeInTheDocument();
            expect(summary).toHaveTextContent('Plain summary');
            expect(summary).toContainElement(screen.getByTestId('review-buttons'));
        });

        it('omits review buttons when controls are not available', () => {
            mockHasObjectReviewControls.mockReturnValue(false);

            render(<SurveyObjectBox {...baseProps} as="details" summary="Plain summary" />);

            expect(screen.queryByTestId('review-buttons')).not.toBeInTheDocument();
            expect(mockRenderObjectReviewButtons).not.toHaveBeenCalled();
        });

        it('starts open when defaultOpen is set (uncontrolled)', () => {
            const { container } = render(
                <SurveyObjectBox {...baseProps} as="details" defaultOpen summary="Summary" />
            );

            expect(container.querySelector('details')).toHaveAttribute('open');
        });

        it('updates internal open state and calls onToggle when uncontrolled', () => {
            const onToggle = jest.fn();
            const { container } = render(
                <SurveyObjectBox
                    {...baseProps}
                    as="details"
                    defaultOpen={false}
                    onToggle={onToggle}
                    summary="Summary"
                />
            );
            const details = container.querySelector('details')!;

            expect(details).not.toHaveAttribute('open');
            details.open = true;
            fireEvent(details, new Event('toggle', { bubbles: true }));

            expect(onToggle).toHaveBeenCalledWith(true);
            expect(details).toHaveAttribute('open');
        });

        it('follows controlled open state via onToggle', async () => {
            const user = userEvent.setup();
            const ControlledHarness = () => {
                const [open, setOpen] = React.useState(false);
                return (
                    <SurveyObjectBox
                        {...baseProps}
                        as="details"
                        open={open}
                        onToggle={setOpen}
                        summary="Summary"
                    />
                );
            };
            const { container } = render(<ControlledHarness />);
            const details = container.querySelector('details')!;

            expect(details).not.toHaveAttribute('open');
            await user.click(screen.getByText('Summary'));
            expect(details).toHaveAttribute('open');
        });
    });

    describe('div variant', () => {
        it('calls onClick and stops propagation on click', () => {
            const onClick = jest.fn();
            const parentClick = jest.fn();

            render(
                <div onClick={parentClick}>
                    <SurveyObjectBox {...baseProps} onClick={onClick} />
                </div>
            );

            fireEvent.click(screen.getByRole('button'));

            expect(onClick).toHaveBeenCalledTimes(1);
            expect(parentClick).not.toHaveBeenCalled();
        });

        it('calls onClick and stops propagation on Enter and Space', async () => {
            const user = userEvent.setup();
            const onClick = jest.fn();
            const parentKeyDown = jest.fn();

            render(
                <div onKeyDown={parentKeyDown}>
                    <SurveyObjectBox {...baseProps} onClick={onClick} />
                </div>
            );

            const button = screen.getByRole('button');
            button.focus();

            fireEvent.keyDown(button, { key: 'Enter' });
            expect(onClick).toHaveBeenCalledTimes(1);
            expect(parentKeyDown).not.toHaveBeenCalled();

            onClick.mockClear();
            await user.keyboard(' ');
            expect(onClick).toHaveBeenCalledTimes(1);
            expect(parentKeyDown).not.toHaveBeenCalled();
        });

        it('renders children directly when not selectable', () => {
            render(<SurveyObjectBox {...baseProps} />);

            expect(screen.queryByRole('button')).not.toBeInTheDocument();
            expect(screen.getByTestId('box-content')).toBeInTheDocument();
        });

        it('renders review buttons outside the selectable wrapper', () => {
            const onClick = jest.fn();
            render(<SurveyObjectBox {...baseProps} onClick={onClick} />);

            const button = screen.getByRole('button');
            expect(button).not.toContainElement(screen.getByTestId('review-buttons'));
            expect(screen.getByTestId('review-buttons')).toBeInTheDocument();
        });
    });
});
