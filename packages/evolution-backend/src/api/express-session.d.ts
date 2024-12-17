/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// This import is required for the declaration merging to work.
import session from 'express-session'; /* eslint-disable-line @typescript-eslint/no-unused-vars */

// Custom type declaraction merging for express-session's SessionData type, as suggested in the express-session documentation: https://expressjs.com/
// TODO: Find which page exactly.
declare module 'express-session' {
    interface SessionData {
        // Additional values by path to send to the client upon next request
        clientValues?: {
            interviewId: string;
            updatedPaths: string[];
        };
    }
}
