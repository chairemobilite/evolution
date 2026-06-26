/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import type { SurveyObjectNames } from 'evolution-common/lib/services/baseObjects/types';
import type { ObjectReviewHandlers } from '../validations/objectReviewHandlers';
import { renderObjectReviewButtons } from '../validations/renderObjectReviewButtons';
import {
    buildSurveyObjectBoxClassName,
    getReviewDecisionStatusForObject
} from '../../../services/admin/reviewDecisionStatusHelper';

export type SurveyObjectBoxProps = {
    /** Survey object type key for review status lookup. */
    objectType: SurveyObjectNames;
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
    /** `open` attribute when `as` is `details`. */
    open?: boolean;
    /** Summary content when `as` is `details`. */
    summary?: React.ReactNode;
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
    open,
    summary
}) => {
    const reviewDecisionStatus = getReviewDecisionStatusForObject(
        objectReviewHandlers?.reviewDecisionStatusByObject,
        objectType,
        objectUuid
    );
    const className = buildSurveyObjectBoxClassName(objectType, reviewDecisionStatus, extraClassNames, objectUuid);
    const reviewButtons = renderObjectReviewButtons(objectReviewHandlers, objectType, objectUuid, reviewDecisionStatus);

    if (as === 'details') {
        return (
            <details open={open} className={className}>
                {summary}
                {reviewButtons}
                {children}
            </details>
        );
    }

    return (
        <div className={className} onClick={onClick}>
            {reviewButtons}
            {children}
        </div>
    );
};
