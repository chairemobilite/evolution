/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { interviewAuditChecks } from '../InterviewAuditChecks';
import { householdAuditChecks } from '../HouseholdAuditChecks';
import { homeAuditChecks } from '../HomeAuditChecks';
import { personAuditChecks } from '../PersonAuditChecks';
import { journeyAuditChecks } from '../JourneyAuditChecks';
import { visitedPlaceAuditChecks } from '../VisitedPlaceAuditChecks';
import { tripAuditChecks } from '../TripAuditChecks';
import { segmentAuditChecks } from '../SegmentAuditChecks';
import i18n, { registerTranslationDir, addTranslationNamespace } from 'chaire-lib-backend/lib/config/i18next';
import path from 'path';
import fs from 'fs';

const languages = ['en', 'fr'];

// Register translation directory and namespace for tests
registerTranslationDir(path.join(__dirname, '../../../../../../../../locales/'));
addTranslationNamespace('audits');

// This test is used to ensure that all audit error codes are defined
// in the locale i18n files in at least fr and en languages.

describe('Audit Locales', () => {
    // Initialize i18n before running tests
    beforeAll(() => {
        // Force i18n initialization by calling it
        i18n();
    });

    // Collect all audit error codes from all audit check modules
    const getAllAuditErrorCodes = (): string[] => {
        const allErrorCodes: string[] = [];

        // Add error codes from each audit check module
        allErrorCodes.push(...Object.keys(interviewAuditChecks));
        allErrorCodes.push(...Object.keys(householdAuditChecks));
        allErrorCodes.push(...Object.keys(homeAuditChecks));
        allErrorCodes.push(...Object.keys(personAuditChecks));
        allErrorCodes.push(...Object.keys(journeyAuditChecks));
        allErrorCodes.push(...Object.keys(visitedPlaceAuditChecks));
        allErrorCodes.push(...Object.keys(tripAuditChecks));
        allErrorCodes.push(...Object.keys(segmentAuditChecks));

        // Remove duplicates and sort
        return [...new Set(allErrorCodes)].sort();
    };

    describe('Audit error code translations', () => {
        const allErrorCodes = getAllAuditErrorCodes();

        it('should have all audit error codes defined in audit check modules', () => {
            expect(allErrorCodes.length).toBeGreaterThan(0);
        });

        describe.each(languages)('Language: %s', (language) => {
            it.each(allErrorCodes)('should have translation for error code: %s', (errorCode) => {
                const translate = i18n().getFixedT(language, 'audits');
                const translation = translate(errorCode);

                expect(translation).not.toBe(errorCode); // Translation should not be the key itself
                expect(translation.trim()).not.toBe(''); // Translation should not be empty
            });
        });

    });

    describe('Orphaned audit translations', () => {
        // Get all translation keys from the audit translation files
        let getTranslationKeysFromFile: (language: string) => string[] = (language) => {
            const translationFilePath = path.join(__dirname, '../../../../../../../../locales/', language, 'audits.json');
            if (!fs.existsSync(translationFilePath)) {
                throw new Error(`Translation file not found: ${translationFilePath}`);
            }
            const translationFile = fs.readFileSync(translationFilePath, 'utf-8');
            const translations = JSON.parse(translationFile);
            return Object.keys(translations);
        };

        // Define the mapping between prefixes and audit check modules
        const auditCheckModules: { [prefix: string]: Record<string, unknown> } = {
            'I_': interviewAuditChecks,
            'HM_': homeAuditChecks,
            'HH_': householdAuditChecks,
            'J_': journeyAuditChecks,
            'P_': personAuditChecks,
            'S_': segmentAuditChecks,
            'T_': tripAuditChecks,
            'VP_': visitedPlaceAuditChecks
        };

        describe.each(languages)('Language: %s', (language) => {
            describe.each(Object.entries(auditCheckModules))('Prefix: %s', (prefix, auditChecks) => {
                it(`should not have orphaned translations starting with ${prefix}`, () => {
                    const translationKeys = getTranslationKeysFromFile(language);
                    const keysWithPrefix = translationKeys.filter((key) => key.startsWith(prefix));
                    const auditCheckCodes = Object.keys(auditChecks);

                    // Find translations that exist but are not in the audit check module
                    const orphanedKeys = keysWithPrefix.filter((key) => !auditCheckCodes.includes(key));
                    expect(orphanedKeys).toEqual([]);
                });
            });
        });

        describe('Empty audit checks', () => {
            it('should handle no audit error codes and no translations without failing', () => {
                // Mock empty audit modules
                const originalModules = { ...auditCheckModules };
                Object.keys(auditCheckModules).forEach((prefix) => {
                    auditCheckModules[prefix] = {};
                });

                // Mock getTranslationKeysFromFile to return empty array (no translations)
                const originalGetKeys = getTranslationKeysFromFile;
                getTranslationKeysFromFile = jest.fn(() => []) as (language: string) => string[];

                try {
                    // Simulate running orphaned checks - should pass with no orphans
                    expect(() => {
                        languages.forEach((language) => {
                            Object.entries(auditCheckModules).forEach(([prefix, auditChecks]) => {
                                const translationKeys = getTranslationKeysFromFile(language);
                                const keysWithPrefix = translationKeys.filter((key) => key.startsWith(prefix));
                                const auditCheckCodes = Object.keys(auditChecks);
                                const orphanedKeys = keysWithPrefix.filter((key) => !auditCheckCodes.includes(key));
                                expect(orphanedKeys).toEqual([]);
                            });
                        });
                    }).not.toThrow();
                } finally {
                    // Restore originals
                    Object.assign(auditCheckModules, originalModules);
                    getTranslationKeysFromFile = originalGetKeys;
                }

            });
        });
    });

});
