/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
/** Error code when force-approve is requested while there is no decision to override. */
export const CANNOT_FORCE_APPROVE_NOTHING_TO_OVERRIDE_ERROR_CODE = 'SRVREV0001' as const;

/** Error code when approving an interview containing a rejected or disagreed object. */
export const CANNOT_APPROVE_INTERVIEW_WITH_BLOCKING_OBJECT_ERROR_CODE = 'SRVREV0002' as const;
