/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import ObjectReviewControls from '../validations/ObjectReviewControls';
import { buildSurveyObjectBoxClassName } from '../../../services/admin/reviewDecisionStatusHelper';
import { useObjectReview } from '../../../services/admin/useObjectReview';
import { createKeyboardActivateHandler } from '../../../services/admin/selectableKeyboard';

type SurveyObjectBoxCommonProps = {
    /** Survey object type key for review status lookup. */
    objectType: SurveyObjectName;
    /** Survey object uuid; review controls are hidden when missing. */
    objectUuid: string | undefined;
    /** Extra CSS classes (e.g. `_selectable`, `_widget_container`). */
    extraClassNames?: string;
    children: React.ReactNode;
    /** Rejected styling inherited from a parent object (display only; DB unchanged). */
    inheritedRejected?: boolean;
    /** Slightly darker styling when nested inside another survey object box. */
    nested?: boolean;
};

export type SurveyObjectBoxDivSelectableProps = SurveyObjectBoxCommonProps & {
    /** Wrapper element; defaults to `div`. */
    as?: 'div';
    /** Click handler for selectable boxes (visited place, trip header). */
    onClick: () => void;
    /** Classes for the inner selectable control (e.g. `_widget`). */
    selectableClassName?: string;
    /** When true, marks the selectable control as the current item for assistive tech. */
    isActive?: boolean;
    /** Content in the selectable wrapper; defaults to children when omitted. */
    selectableContent?: React.ReactNode;
};

export type SurveyObjectBoxDivStaticProps = SurveyObjectBoxCommonProps & {
    /** Wrapper element; defaults to `div`. */
    as?: 'div';
    onClick?: undefined;
    selectableClassName?: undefined;
    isActive?: undefined;
    selectableContent?: undefined;
};

export type SurveyObjectBoxDivProps = SurveyObjectBoxDivSelectableProps | SurveyObjectBoxDivStaticProps;

export type SurveyObjectBoxDetailsProps = SurveyObjectBoxCommonProps & {
    /** Disclosure wrapper used for the person panel. */
    as: 'details';
    /** Initial open state for `details` when uncontrolled. */
    defaultOpen?: boolean;
    /** Controlled open state for `details`; pair with `onToggle`. */
    open?: boolean;
    /** Called when the native `<details>` open state changes. */
    onToggle?: (open: boolean) => void;
    /** Summary content for the disclosure. */
    summary: React.ReactNode;
};

export type SurveyObjectBoxProps = SurveyObjectBoxDivProps | SurveyObjectBoxDetailsProps;

/**
 * Renders a reviewable survey object box with status styling and approve/reject controls.
 * Review status is read from the `reviewDecisions` Redux slice; the controls dispatch
 * the review thunks themselves (see `ObjectReviewControls`).
 * @param props - Object identity, layout, and child content
 * @returns A `div` or `details` element with review UI wired consistently
 */
export const SurveyObjectBox: React.FC<SurveyObjectBoxProps> = (props) => {
    const { objectType, objectUuid, extraClassNames = '', children, inheritedRejected = false, nested = false } = props;

    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
        props.as === 'details' ? (props.defaultOpen ?? false) : false
    );
    const isControlledDetails = props.as === 'details' && props.open !== undefined;
    const detailsOpen = isControlledDetails ? props.open : uncontrolledOpen;

    const review = useObjectReview(objectType, objectUuid);
    const className = buildSurveyObjectBoxClassName({
        objectType,
        status: review.status,
        extraClassNames,
        objectUuid,
        inheritedRejected,
        hasReviewControls: review.hasReviewControls,
        nested
    });
    const reviewButtons = review.hasReviewControls ? (
        <ObjectReviewControls review={review} objectType={objectType} objectUuid={objectUuid} />
    ) : null;

    if (props.as === 'details') {
        const summaryElement =
            React.isValidElement(props.summary) && props.summary.type === 'summary' ? (
                props.summary
            ) : (
                <summary>{props.summary}</summary>
            );
        const handleDetailsToggle = (event: React.SyntheticEvent<HTMLDetailsElement>) => {
            const nextOpen = event.currentTarget.open;
            if (!isControlledDetails) {
                setUncontrolledOpen(nextOpen);
            }
            props.onToggle?.(nextOpen);
        };

        // Review buttons are rendered as a sibling of the summary (not inside it) so
        // interactive controls are not nested in the disclosure button (accessibility).
        return (
            <details open={detailsOpen} onToggle={handleDetailsToggle} className={className}>
                {summaryElement}
                {reviewButtons}
                {children}
            </details>
        );
    }

    const { onClick, selectableClassName = '', isActive = false, selectableContent } = props;
    const hasSelectableContent = selectableContent !== null && selectableContent !== undefined;
    const selectableInner = hasSelectableContent ? selectableContent : children;
    const trailingContent = hasSelectableContent ? children : null;
    const selectableControlClassName = [selectableClassName, isActive ? '_active' : ''].filter(Boolean).join(' ');

    const handleSelectableClick = (event: React.MouseEvent<HTMLDivElement>) => {
        onClick?.();
        event.stopPropagation();
    };

    return (
        <div className={className}>
            {reviewButtons}
            {onClick ? (
                <>
                    <div
                        role="button"
                        tabIndex={0}
                        className={selectableControlClassName || undefined}
                        aria-pressed={isActive}
                        onClick={handleSelectableClick}
                        onKeyDown={createKeyboardActivateHandler(() => onClick(), { stopPropagation: true })}
                    >
                        {selectableInner}
                    </div>
                    {trailingContent}
                </>
            ) : (
                children
            )}
        </div>
    );
};
