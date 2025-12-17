/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import projectConfig from 'evolution-common/lib/config/project.config';
import { parseISODateToTimestamp } from 'evolution-common/lib/utils/DateTimeUtils';

/**
 * Check if the survey has ended based on the configured end date/time
 * @returns true if the current time is after the survey end date, false otherwise
 */
export const isSurveyEnded = (): boolean => {
    const endDateTime = projectConfig.endDateTimeWithTimezoneOffset;
    if (!endDateTime) {
        // No end date configured, survey is still active
        return false;
    }

    try {
        // Parse the configured end date/time
        const surveyEndTimestamp = parseISODateToTimestamp(projectConfig.endDateTimeWithTimezoneOffset);
        if (surveyEndTimestamp === undefined) {
            console.error(`Invalid endDateTimeWithTimezoneOffset configured: ${endDateTime}`);
            return false;
        }

        // Get current epoch timestamp
        const nowTimestamp = Date.now();
        return nowTimestamp > surveyEndTimestamp;
    } catch (error) {
        console.error('Error checking survey end date:', error);
        return false;
    }
};
