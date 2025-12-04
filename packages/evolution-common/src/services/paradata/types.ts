/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Represents a count of last events by widget path for incomplete interviews
 */
export type IncompleteInterviewsLastActionCount = {
    eventType: string;
    count: number;
};

/**
 * Response structure for respondent behavior metrics
 */
export type RespondentBehaviorMetrics = {
    incompleteInterviewsLastActionCounts: IncompleteInterviewsLastActionCount[];
};
