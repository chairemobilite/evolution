/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import projectConfig from 'evolution-common/lib/config/project.config';
import {
    getAccessCodeFormat,
    matchesAccessCodeFormat,
    normalizeAccessCode as normalizeAccessCodeForFormat
} from 'evolution-common/lib/services/accessCode/accessCodeFormats';

export const oneDigitHashSum = 0;

/** The access code format configured for the survey (see the `accessCodeFormat` project config option). */
const configuredAccessCodeFormat = () => getAccessCodeFormat(projectConfig.accessCodeFormat);

/**
 * Whether an access code matches the format configured for the survey (see the
 * `accessCodeFormat` project config option).
 * @param accessCode The access code to check
 * @returns Whether the access code matches the configured format
 */
export const matchesConfiguredAccessCodeFormat = (accessCode: string): boolean =>
    !_isBlank(accessCode) && matchesAccessCodeFormat(accessCode, configuredAccessCodeFormat());

/**
 * Normalize an access code to its canonical stored form (dashes, upper-cased,
 * trimmed) for the format configured for the survey. Use it before storing or
 * searching access codes, so accepted input variants always match the stored
 * value.
 *
 * Only codes that match the configured format are normalized; any other code is
 * returned trimmed but otherwise unchanged (it would be rejected by validation
 * anyway).
 * @param accessCode The raw access code
 * @returns The canonical access code
 */
export const normalizeAccessCode = (accessCode: string): string => {
    const trimmed = accessCode.trim();
    if (!matchesConfiguredAccessCodeFormat(trimmed)) {
        return trimmed;
    }
    return normalizeAccessCodeForFormat(trimmed, configuredAccessCodeFormat());
};

// Additional, survey-specific access code check applied on top of the configured
// format. Defaults to no extra check.
let additionalAccessCodeValidation = (_accessCode: string): boolean => true;

/**
 * Register an additional, survey-specific access code validation, applied on top
 * of the configured format. The configured `accessCodeFormat` is always
 * enforced; this check can only add constraints (logical AND), it cannot accept
 * codes that do not match the configured format. Use it for survey-specific
 * checks, e.g. verifying that a code was actually issued.
 * @param isAccessCodeValid Additional check, returns whether the code is valid
 */
export const registerAccessCodeValidationFunction = (isAccessCodeValid: (accessCode: string) => boolean) => {
    additionalAccessCodeValidation = isAccessCodeValid;
};

/**
 * Validate an access code: it must match the configured format and pass the
 * registered additional check, if any.
 * @param accessCode The access code to validate
 * @returns Whether the access code is valid
 */
export const validateAccessCode = (accessCode: string): boolean => {
    try {
        // Normalize first so accepted input variants (surrounding whitespace, missing
        // dash, letter case) are validated and checked in their canonical stored form.
        const normalized = normalizeAccessCode(accessCode);
        return matchesConfiguredAccessCodeFormat(normalized) && additionalAccessCodeValidation(normalized);
    } catch {
        return false;
    }
};
