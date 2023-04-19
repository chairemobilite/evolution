/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { UserAttributesBase } from 'chaire-lib-backend/lib/services/users/user';

export type ParticipantAttributes = UserAttributesBase & {
    phone_number?: string | null;
    is_active?: boolean | null;
    is_test?: boolean | null;
};
