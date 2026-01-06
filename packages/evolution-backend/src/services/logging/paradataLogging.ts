/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import PQueue from 'p-queue';
import { UserAction } from 'evolution-common/lib/services/questionnaire/types';
import config from 'chaire-lib-backend/lib/config/server.config';

import paradataEventsDbQueries from '../../models/paradataEvents.db.queries';

export type ParadataLoggingFunction = (logData: {
    userAction?: UserAction;
    valuesByPath?: Record<string, any>;
    unsetPaths?: string[];
    server?: boolean;
}) => Promise<boolean>;

// Create a queue to ensure logs are processed in order
const logQueue = new PQueue({ concurrency: 1 });

/**
 * Add a log entry to the queue to ensure sequential processing of timestamps
 *
 * FIXME: See if the queue size gets too big. If so, the timestamps may be at a
 * later point than the actual event.
 *
 * @param logData The data to log
 * @returns A promise that resolves to a boolean indicating success or failure
 */
const enqueueLog = (logData: Parameters<typeof paradataEventsDbQueries.log>[0]): Promise<boolean> => {
    if (logQueue.size >= 1000) {
        // Limit the queue size to 1000
        console.warn(
            `Log queue size exceeded limit. Dropping event: ${logData.eventType} for interview ${logData.interviewId}`
        );
        return Promise.resolve(false);
    }
    return logQueue.add(() =>
        paradataEventsDbQueries.log(logData).catch((error) => {
            console.error(`Error logging event ${logData.eventType} for interview ${logData.interviewId}: ${error}`);
            return false;
        })
    );
};

const userActionTypeToDbType = (
    userAction: UserAction
): Parameters<typeof paradataEventsDbQueries.log>[0]['eventType'] => {
    switch (userAction.type) {
    case 'buttonClick':
        return 'button_click';
    case 'widgetInteraction':
        return 'widget_interaction';
    case 'sectionChange':
        return 'section_change';
    case 'languageChange':
        return 'language_change';
    case 'interviewOpen':
        return 'interview_open';
    default:
        console.warn(`Unknown user action type: ${(userAction as any).type}. Falling back to 'legacy'.`);
        return 'legacy';
    }
};

/**
 * Get the paradata logging functions for a given interview and user
 *
 * @param {Object} options Options object
 * @param {number} options.interviewId The ID of the interview for which to log
 * @param {number} [options.userId] The ID of the current user. If not provided,
 * the event is considered to be from the participant
 * @param {boolean} [options.isCorrectedInterview] Whether the interview is
 * being corrected. If true, the log entry will be marked as applying to the
 * corrected response.
 * @returns The paradata logging function for this user and interview
 */
export const getParadataLoggingFunction = ({
    interviewId,
    userId,
    isCorrectedInterview = false
}: {
    interviewId: number;
    userId?: number;
    isCorrectedInterview?: boolean;
}): ParadataLoggingFunction | undefined =>
    (config as any).logDatabaseUpdates !== true
        ? undefined
        : ({ userAction, valuesByPath, unsetPaths, server }) => {
            // Prepare log data
            const logData = Object.assign(
                {},
                valuesByPath !== undefined ? { valuesByPath } : {},
                unsetPaths !== undefined ? { unsetPaths } : {},
                userAction !== undefined ? { userAction } : {}
            );

            const eventLog = {
                interviewId,
                userId,
                eventData: logData,
                forCorrection: isCorrectedInterview
            };

            if (server === true) {
                // Log server event if server is true
                return enqueueLog({
                    ...eventLog,
                    eventType: 'server_event'
                });
            } else if (userAction === undefined) {
                // Log side effect if there is no user action
                return enqueueLog({
                    ...eventLog,
                    eventType: 'side_effect'
                });
            } else {
                // Log user action if there is one
                return enqueueLog({
                    ...eventLog,
                    eventType: userActionTypeToDbType(userAction)
                });
            }
        };
