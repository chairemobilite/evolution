/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { interviewAuditChecks } from 'evolution-backend/lib/services/audits/auditChecks/checks/InterviewAuditChecks';
import { householdAuditChecks } from 'evolution-backend/lib/services/audits/auditChecks/checks/HouseholdAuditChecks';
import { homeAuditChecks } from 'evolution-backend/lib/services/audits/auditChecks/checks/HomeAuditChecks';
import { personAuditChecks } from 'evolution-backend/lib/services/audits/auditChecks/checks/PersonAuditChecks';
import { journeyAuditChecks } from 'evolution-backend/lib/services/audits/auditChecks/checks/JourneyAuditChecks';
import { visitedPlaceAuditChecks } from 'evolution-backend/lib/services/audits/auditChecks/checks/VisitedPlaceAuditChecks';
import { tripAuditChecks } from 'evolution-backend/lib/services/audits/auditChecks/checks/TripAuditChecks';
import { segmentAuditChecks } from 'evolution-backend/lib/services/audits/auditChecks/checks/SegmentAuditChecks';
import frLocale from '../fr/audits.json';
import enLocale from '../en/audits.json';

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

    describe('Audit error code translations', () => {
        const allErrorCodes = getAllAuditErrorCodes();

        it('should have all audit error codes defined in audit check modules', () => {
            expect(allErrorCodes.length).toBeGreaterThan(0);
            console.log(`Found ${allErrorCodes.length} audit error codes:`, allErrorCodes);
        });

        it('should have English translations for all audit error codes', () => {
            const missingEnglishTranslations: string[] = [];

            allErrorCodes.forEach((errorCode) => {
                if (!enLocale[errorCode]) {
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
                if (!frLocale[errorCode]) {
                    missingFrenchTranslations.push(errorCode);
                }
            });

            if (missingFrenchTranslations.length > 0) {
                console.error('Missing French translations for:', missingFrenchTranslations);
            }

            expect(missingFrenchTranslations).toEqual([]);
        });

        it('should have consistent error codes between English and French locales', () => {
            const englishKeys = Object.keys(enLocale).sort();
            const frenchKeys = Object.keys(frLocale).sort();

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
                if (enLocale[errorCode] && enLocale[errorCode].trim() === '') {
                    emptyEnglishTranslations.push(errorCode);
                }
                if (frLocale[errorCode] && frLocale[errorCode].trim() === '') {
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
    });

});
