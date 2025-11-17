/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { InterviewAuditCheckFunction } from '../AuditCheckContexts';

export const interviewExtendedAuditChecks: { [errorCode: string]: InterviewAuditCheckFunction } = {};
