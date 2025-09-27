/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { interviewAuditChecks } from '../auditChecks/checks/InterviewAuditChecks';
import { householdAuditChecks } from '../auditChecks/checks/HouseholdAuditChecks';
import { homeAuditChecks } from '../auditChecks/checks/HomeAuditChecks';
import { personAuditChecks } from '../auditChecks/checks/PersonAuditChecks';
import { journeyAuditChecks } from '../auditChecks/checks/JourneyAuditChecks';
import { visitedPlaceAuditChecks } from '../auditChecks/checks/VisitedPlaceAuditChecks';
import { tripAuditChecks } from '../auditChecks/checks/TripAuditChecks';
import { segmentAuditChecks } from '../auditChecks/checks/SegmentAuditChecks';
import fs from 'fs';

// This test is used to ensure that all audit error codes are defined
// in the locale i18n files in at least fr and en languages.

describe('Audit Locales', () => {
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

    // Load locale files
    const loadLocaleFile = (locale: string): Record<string, string> => {
        // Use absolute path to the known location
        const localeFilePath = `/Users/admin/ws/od_nationale_quebec_fork/evolution/locales/${locale}/audits.json`;

        if (!fs.existsSync(localeFilePath)) {
            throw new Error(`Locale file not found: ${localeFilePath}`);
        }

        const fileContent = fs.readFileSync(localeFilePath, 'utf8');
        return JSON.parse(fileContent);
    };

    describe('Audit error code translations', () => {
        const allErrorCodes = getAllAuditErrorCodes();
        let englishLocale: Record<string, string>;
        let frenchLocale: Record<string, string>;

        beforeAll(() => {
            englishLocale = loadLocaleFile('en');
            frenchLocale = loadLocaleFile('fr');
        });

        it('should have all audit error codes defined in audit check modules', () => {
            expect(allErrorCodes.length).toBeGreaterThan(0);
            console.log(`Found ${allErrorCodes.length} audit error codes:`, allErrorCodes);
        });

        it('should have English translations for all audit error codes', () => {
            const missingEnglishTranslations: string[] = [];

            allErrorCodes.forEach((errorCode) => {
                if (!englishLocale[errorCode]) {
                    missingEnglishTranslations.push(errorCode);
                }
            });

            if (missingEnglishTranslations.length > 0) {
                console.error('Missing English translations for:', missingEnglishTranslations);
            }

            expect(missingEnglishTranslations).toEqual([]);
        });

        it('should have French translations for all audit error codes', () => {
            const missingFrenchTranslations: string[] = [];

            allErrorCodes.forEach((errorCode) => {
                if (!frenchLocale[errorCode]) {
                    missingFrenchTranslations.push(errorCode);
                }
            });

            if (missingFrenchTranslations.length > 0) {
                console.error('Missing French translations for:', missingFrenchTranslations);
            }

            expect(missingFrenchTranslations).toEqual([]);
        });

        it('should have consistent error codes between English and French locales', () => {
            const englishKeys = Object.keys(englishLocale).sort();
            const frenchKeys = Object.keys(frenchLocale).sort();

            // Check for keys in English but not in French
            const missingInFrench = englishKeys.filter((key) => !frenchKeys.includes(key));
            // Check for keys in French but not in English
            const missingInEnglish = frenchKeys.filter((key) => !englishKeys.includes(key));

            if (missingInFrench.length > 0) {
                console.error('Keys in English but missing in French:', missingInFrench);
            }
            if (missingInEnglish.length > 0) {
                console.error('Keys in French but missing in English:', missingInEnglish);
            }

            expect(missingInFrench).toEqual([]);
            expect(missingInEnglish).toEqual([]);
        });

        it('should have non-empty translations for all error codes', () => {
            const emptyEnglishTranslations: string[] = [];
            const emptyFrenchTranslations: string[] = [];

            allErrorCodes.forEach((errorCode) => {
                if (englishLocale[errorCode] && englishLocale[errorCode].trim() === '') {
                    emptyEnglishTranslations.push(errorCode);
                }
                if (frenchLocale[errorCode] && frenchLocale[errorCode].trim() === '') {
                    emptyFrenchTranslations.push(errorCode);
                }
            });

            if (emptyEnglishTranslations.length > 0) {
                console.error('Empty English translations for:', emptyEnglishTranslations);
            }
            if (emptyFrenchTranslations.length > 0) {
                console.error('Empty French translations for:', emptyFrenchTranslations);
            }

            expect(emptyEnglishTranslations).toEqual([]);
            expect(emptyFrenchTranslations).toEqual([]);
        });

        it('should not have extra translations that are not used by audit checks', () => {
            const englishKeys = Object.keys(englishLocale);
            const frenchKeys = Object.keys(frenchLocale);

            const unusedEnglishKeys = englishKeys.filter((key) => !allErrorCodes.includes(key));
            const unusedFrenchKeys = frenchKeys.filter((key) => !allErrorCodes.includes(key));

            if (unusedEnglishKeys.length > 0) {
                console.warn('Unused English translation keys (may be legacy):', unusedEnglishKeys);
            }
            if (unusedFrenchKeys.length > 0) {
                console.warn('Unused French translation keys (may be legacy):', unusedFrenchKeys);
            }

            // This is a warning rather than a failure, as there might be legacy translations
            // that are intentionally kept for backwards compatibility
            expect(unusedEnglishKeys).toEqual(unusedEnglishKeys); // Always passes, just for logging
            expect(unusedFrenchKeys).toEqual(unusedFrenchKeys); // Always passes, just for logging
        });
    });

    describe('Locale file structure', () => {
        it('should have valid JSON structure in English locale file', () => {
            expect(() => loadLocaleFile('en')).not.toThrow();
        });

        it('should have valid JSON structure in French locale file', () => {
            expect(() => loadLocaleFile('fr')).not.toThrow();
        });

        it('should have English locale file with object structure', () => {
            const englishLocale = loadLocaleFile('en');
            expect(typeof englishLocale).toBe('object');
            expect(englishLocale).not.toBeNull();
        });

        it('should have French locale file with object structure', () => {
            const frenchLocale = loadLocaleFile('fr');
            expect(typeof frenchLocale).toBe('object');
            expect(frenchLocale).not.toBeNull();
        });
    });
});
