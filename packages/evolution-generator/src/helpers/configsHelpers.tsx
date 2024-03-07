/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { getResponse } from 'evolution-common/lib/utils/helpers';

// Check if the section is complete
export const isSectionComplete = ({
    interview,
    sectionName
}: {
    interview: any;
    sectionName: string;
}): boolean | null => {
    const isSectionComplete: boolean = getResponse(interview, `_sections.${sectionName}._isCompleted`, false);

    return isSectionComplete;
};
