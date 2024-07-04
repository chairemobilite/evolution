/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import session from 'express-session';

// Custom type declaraction merging for express-session's SessionData type, as suggested in the express-session documentation
declare module 'express-session' {
    interface SessionData {
        // Additional values by path to send to the client upon next request
        clientValues?: {
            interviewId: string;
            updatedPaths: string[];
        };
    }
}
