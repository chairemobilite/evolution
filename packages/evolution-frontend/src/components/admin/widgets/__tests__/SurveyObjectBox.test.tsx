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
import { useObjectReview } from '../../../../services/admin/useObjectReview';

// Review controls are a connected component; replace it with a marker so the box
// can be tested without a Redux store.
jest.mock('../../validations/ObjectReviewControls', () => ({
    __esModule: true,
    default: jest.fn(() => <div data-testid="review-buttons" />)
}));

const defaultObjectReview = {
    status: undefined,
    hasReviewControls: true,
    canForceApprove: false,
    approve: jest.fn(),
    reject: jest.fn(),
    clearReview: jest.fn(),
    forceApprove: jest.fn(),
    clearForceApprove: jest.fn(),
    requestReReview: jest.fn()
};

jest.mock('../../../../services/admin/useObjectReview', () => ({
    useObjectReview: jest.fn(() => defaultObjectReview)
}));

const mockUseObjectReview = useObjectReview as jest.MockedFunction<typeof useObjectReview>;

const objectUuid = uuidV4();

const baseProps = {
    objectType: 'person' as const,
    objectUuid,
    children: <div data-testid="box-content">Content</div>
};

beforeEach(() => {
    jest.clearAllMocks();
    mockUseObjectReview.mockReturnValue(defaultObjectReview);
});

describe('SurveyObjectBox', () => {
    describe('details variant', () => {
        it('renders review buttons as a sibling of the summary, not inside it (accessibility)', () => {
            const { container } = render(
                <SurveyObjectBox
                    {...baseProps}
                    as="details"
                    defaultOpen
                    summary={<summary data-testid="person-summary">Person header</summary>}
                />
            );

            expect(document.querySelectorAll('summary')).toHaveLength(1);
            const summary = screen.getByTestId('person-summary');
            expect(summary).toHaveTextContent('Person header');
            const reviewButtons = screen.getByTestId('review-buttons');
            expect(summary).not.toContainElement(reviewButtons);
            expect(container.querySelector('details')).toContainElement(reviewButtons);
        });

        it('wraps non-summary summary content in a summary element', () => {
            render(<SurveyObjectBox {...baseProps} as="details" defaultOpen summary="Plain summary" />);

            const summary = document.querySelector('summary');
            expect(summary).toBeInTheDocument();
            expect(summary).toHaveTextContent('Plain summary');
            expect(summary).not.toContainElement(screen.getByTestId('review-buttons'));
        });

        it('omits review buttons when the object type is not reviewable', () => {
            mockUseObjectReview.mockReturnValueOnce({ ...defaultObjectReview, hasReviewControls: false });

            render(<SurveyObjectBox {...baseProps} as="details" defaultOpen summary="Plain summary" />);

            expect(screen.queryByTestId('review-buttons')).not.toBeInTheDocument();
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

        it('renders selectableContent inside the selectable wrapper and children outside', () => {
            render(
                <SurveyObjectBox
                    {...baseProps}
                    onClick={jest.fn()}
                    selectableContent={<span data-testid="selectable-part">Selectable</span>}
                >
                    <div data-testid="trailing-part">Trailing</div>
                </SurveyObjectBox>
            );

            const button = screen.getByRole('button');
            expect(button).toContainElement(screen.getByTestId('selectable-part'));
            expect(button).not.toContainElement(screen.getByTestId('trailing-part'));
            expect(screen.getByTestId('trailing-part')).toBeInTheDocument();
        });

        it('maps isActive to aria-pressed on the selectable control', () => {
            const { rerender } = render(<SurveyObjectBox {...baseProps} onClick={jest.fn()} isActive={false} />);
            expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');

            rerender(<SurveyObjectBox {...baseProps} onClick={jest.fn()} isActive />);
            expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
        });

        it('applies nested and inherited-rejected styling classes', () => {
            const { container } = render(
                <SurveyObjectBox {...baseProps} onClick={jest.fn()} nested inheritedStatus="rejected" />
            );

            const wrapper = container.firstChild as HTMLElement;
            expect(wrapper.className).toContain('admin__survey-object-box--nested');
            expect(wrapper.className).toContain('admin__survey-object-box--rejected');
        });
    });
});
