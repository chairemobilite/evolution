/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

export type UserInterviewAccesses = {
    interview_id: number;
    user_id: number;
    for_validation: boolean;
    update_count: number;
    created_at: string;
    updated_at: string;
};
