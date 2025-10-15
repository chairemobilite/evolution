/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * This module re-exports date validation utilities from DateTimeUtils.
 * All date validation logic has been consolidated into DateTimeUtils for better discoverability.
 * This file exists for backward compatibility.
 *
 * @deprecated Import from '../utils/DateTimeUtils' instead
 */

export {
    ISODateString,
    DateValidationError,
    validateISODateString,
    validateDateRange,
    validateProjectDates
} from '../utils/DateTimeUtils';
