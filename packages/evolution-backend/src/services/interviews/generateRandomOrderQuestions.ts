/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { shuffle } from 'chaire-lib-common/lib/utils/RandomUtils';
import type { RandomOrderQuestions } from 'evolution-common/lib/services/questionnaire/randomOrderQuestions';

/**
 * Draw a stable-for-the-interview order for each configured random-order group.
 * Called at interview creation. Empty groups are omitted.
 *
 * @param groups project `randomOrderQuestions` config
 * @returns one permutation per non-empty group
 */
export const generateRandomOrderQuestions = (groups: RandomOrderQuestions): RandomOrderQuestions => {
    const orders: RandomOrderQuestions = {};
    for (const [groupShortname, widgetShortnames] of Object.entries(groups)) {
        if (widgetShortnames.length > 0) {
            orders[groupShortname] = shuffle(widgetShortnames);
        }
    }
    return orders;
};
