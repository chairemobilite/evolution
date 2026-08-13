/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { isSameMultiset } from '../../utils/ArrayUtils';
import { getResponse } from '../../utils/helpers';
import { UserInterviewAttributes } from './types';

/** Path under `interview.response` for the per-interview question order. */
export const randomOrderQuestionsResponsePath = '_randomOrderQuestions';

/**
 * Per-interview widget order for each random-order group.
 *
 * Keys are random-order group names. They are not Evolution `group` widgets
 * (such as `householdMembers` or `visitedPlaces`); those are a different
 * concept.
 */
export type RandomOrderQuestions = { [randomOrderGroupShortname: string]: string[] };

/**
 * Replace the consecutive block of `widgetShortnames` that contains exactly the
 * widgets of `orderedWidgets` with that order. If those widgets are not a
 * consecutive block (missing widget or something inserted between), return
 * `widgetShortnames` unchanged.
 */
const applyStoredOrder = (widgetShortnames: readonly string[], orderedWidgets: readonly string[]): string[] => {
    const groupSize = orderedWidgets.length;
    if (groupSize === 0) {
        return [...widgetShortnames];
    }
    for (let startIndex = 0; startIndex <= widgetShortnames.length - groupSize; startIndex++) {
        const block = widgetShortnames.slice(startIndex, startIndex + groupSize);
        if (isSameMultiset(block, orderedWidgets)) {
            return [
                ...widgetShortnames.slice(0, startIndex),
                ...orderedWidgets,
                ...widgetShortnames.slice(startIndex + groupSize)
            ];
        }
    }
    return [...widgetShortnames];
};

/**
 * Order the widgets of a section or grouped object according to the random
 * orders drawn for this interview at its creation. Orders whose widgets are not
 * all in this list as a consecutive block are ignored, so the same order can be
 * stored once for widget lists that appear in many sections or in each object
 * of a group (`householdMembers`, ...).
 *
 * Orders are applied in the order they were drawn, which follows the project
 * `randomOrderQuestions` configuration: if two groups share a widget in the
 * same list, the first one is applied and the following ones no longer form a
 * consecutive block, so they are ignored.
 *
 * @param interview the interview, holding the orders drawn at its creation
 * @param widgetShortnames widgets of the section or grouped object, in config order
 * @returns the widgets to display, in the order for this interview
 */
export const getRandomOrderedWidgets = (
    interview: UserInterviewAttributes,
    widgetShortnames: readonly string[]
): string[] => {
    const storedOrders = getResponse(interview, randomOrderQuestionsResponsePath, {}) as RandomOrderQuestions;
    let widgets = [...widgetShortnames];
    for (const orderedWidgets of Object.values(storedOrders)) {
        widgets = applyStoredOrder(widgets, orderedWidgets);
    }
    return widgets;
};
