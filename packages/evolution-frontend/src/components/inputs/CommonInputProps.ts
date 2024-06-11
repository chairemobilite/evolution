/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';

export type CommonInputProps = {
    id: string;
    onValueChange: (e: any, customValue?: string) => void;
    interview: UserInterviewAttributes;
    /** Actual path for the response to this question. Any placeholder in the
     * widget config's path is resolved in this path */
    path: string;
    user: CliUser;
};
