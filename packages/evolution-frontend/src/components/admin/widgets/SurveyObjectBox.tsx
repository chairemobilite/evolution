/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import type { ObjectReviewHandlers } from '../validations/objectReviewHandlers';
import { hasObjectReviewControls, renderObjectReviewButtons } from '../validations/renderObjectReviewButtons';
import {
    buildSurveyObjectBoxClassName,
    getReviewDecisionStatusForObject
} from '../../../services/admin/reviewDecisionStatusHelper';

export type SurveyObjectBoxProps = {
    /** Survey object type key for review status lookup. */
    objectType: SurveyObjectName;
    /** Survey object uuid; review controls are hidden when missing. */
    objectUuid: string | undefined;
    /** Review callbacks and status from InterviewStats. */
    objectReviewHandlers?: ObjectReviewHandlers;
    /** Extra CSS classes (e.g. `_selectable`, `_widget_container`). */
    extraClassNames?: string;
    /** Click handler for selectable boxes (visited place, trip). */
    onClick?: () => void;
    children: React.ReactNode;
    /** Wrapper element; `details` is used for the person panel. */
    as?: 'div' | 'details';
    /** Initial open state for `details` when uncontrolled. */
    defaultOpen?: boolean;
    /** Controlled open state for `details`; pair with `onToggle`. */
    open?: boolean;
    /** Called when the native `<details>` open state changes. */
    onToggle?: (open: boolean) => void;
    /** Summary content when `as` is `details`. */
    summary?: React.ReactNode;
    /** Rejected styling inherited from a parent object (display only; DB unchanged). */
    inheritedRejected?: boolean;
};

/**
 * Renders a reviewable survey object box with status styling and approve/reject controls.
 * @param props - Object identity, review handlers, layout, and child content
 * @returns A `div` or `details` element with review UI wired consistently
 */
export const SurveyObjectBox: React.FC<SurveyObjectBoxProps> = ({
    objectType,
    objectUuid,
    objectReviewHandlers,
    extraClassNames = '',
    onClick,
    children,
    as = 'div',
    defaultOpen,
    open,
    onToggle,
    summary,
    inheritedRejected = false
}) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
    const isControlledDetails = open !== undefined;
    const detailsOpen = isControlledDetails ? open : uncontrolledOpen;

    const reviewDecisionStatus = getReviewDecisionStatusForObject(
        objectReviewHandlers?.reviewDecisionStatusByObject,
        objectType,
        objectUuid
    );
    const hasReviewControls = hasObjectReviewControls(objectReviewHandlers, objectType, objectUuid);
    const className = buildSurveyObjectBoxClassName({
        objectType,
        status: reviewDecisionStatus,
        extraClassNames,
        objectUuid,
        inheritedRejected,
        hasReviewControls
    });
    const reviewButtons = hasReviewControls
        ? renderObjectReviewButtons(objectReviewHandlers, objectType, objectUuid, reviewDecisionStatus)
        : null;

    if (as === 'details') {
        const summaryWithReviewButtons = (summaryNode: React.ReactNode) => (
            <>
                {summaryNode}
                {reviewButtons}
            </>
        );
        const summaryElement =
            React.isValidElement(summary) && summary.type === 'summary' ? (
                React.cloneElement(
                    summary as React.ReactElement<{ children?: React.ReactNode }>,
                    undefined,
                    summaryWithReviewButtons(
                        (summary as React.ReactElement<{ children?: React.ReactNode }>).props.children
                    )
                )
            ) : (
                <summary>{summaryWithReviewButtons(summary)}</summary>
            );
        const handleDetailsToggle = (event: React.SyntheticEvent<HTMLDetailsElement>) => {
            const nextOpen = event.currentTarget.open;
            if (!isControlledDetails) {
                setUncontrolledOpen(nextOpen);
            }
            onToggle?.(nextOpen);
        };

        return (
            <details open={detailsOpen} onToggle={handleDetailsToggle} className={className}>
                {summaryElement}
                {children}
            </details>
        );
    }

    const handleSelectableKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick?.();
            event.stopPropagation();
        }
    };

    const handleSelectableClick = (event: React.MouseEvent<HTMLDivElement>) => {
        onClick?.();
        event.stopPropagation();
    };

    return (
        <div className={className}>
            {reviewButtons}
            {onClick ? (
                <div role="button" tabIndex={0} onClick={handleSelectableClick} onKeyDown={handleSelectableKeyDown}>
                    {children}
                </div>
            ) : (
                children
            )}
        </div>
    );
};
