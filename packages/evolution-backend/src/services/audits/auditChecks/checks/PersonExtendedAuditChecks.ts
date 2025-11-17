/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { PersonAuditCheckFunction } from '../AuditCheckContexts';

export const personExtendedAuditChecks: { [errorCode: string]: PersonAuditCheckFunction } = {};
