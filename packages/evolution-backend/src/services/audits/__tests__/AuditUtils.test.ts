/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import slugify from 'slugify';

import { mergeWithExisting, convertParamsErrorsToAudits } from '../AuditUtils';
import type { Audits } from 'evolution-common/lib/services/audits/types';
import type { SurveyObjectNames } from 'evolution-common/lib/services/baseObjects/types';

const arbitraryUuid = uuidV4();

describe('convertParamsErrorsToAudits', () => {
    it('should convert error messages to audits', async () => {
        const errors = [new Error('Error message 1'), new Error('Error message 2')];
        const result = convertParamsErrorsToAudits(errors, { objectType: 'interview', objectUuid: arbitraryUuid });

        expect(result[0]).toEqual({
            errorCode: slugify('Error message 1'),
            objectUuid: arbitraryUuid,
            objectType: 'interview',
            message: errors[0].message,
            version: 1,
            ignore: false,
            level: 'error'
        });
        expect(result[1]).toEqual({
            errorCode: slugify('Error message 2'),
            objectUuid: arbitraryUuid,
            objectType: 'interview',
            message: errors[1].message,
            version: 1,
            ignore: false,
            level: 'error'
        });
    });
});

describe('mergeWithExisting', () => {
    it('should merge new audits with existing audits', async () => {
        const existingAudits: Audits = {
            'test-error': {
                version: 1,
                errorCode: 'test-error',
                message: 'Test error message',
                level: 'error',
                ignore: true,
            },
            'outdated-error': {
                version: 1,
                errorCode: 'oudated-error',
                message: 'Outdated error message',
                level: 'error',
                ignore: true,
            },
            'version-changed-error': {
                version: 1,
                errorCode: 'oudated-error',
                message: 'Outdated error message',
                level: 'error',
                ignore: true,
            },
        };

        const newAudits: Audits = {
            'test-error': {
                version: 1,
                errorCode: 'test-error',
                message: 'Test error message updated',
                level: 'warning',
                ignore: false,
            },
            'version-changed-error': {
                version: 2,
                errorCode: 'oudated-error',
                message: 'Outdated error message',
                level: 'error',
                ignore: false,
            },
        };

        const mergedAudits = mergeWithExisting(existingAudits, newAudits);

        expect(Object.keys(mergedAudits).length).toEqual(Object.keys(newAudits).length);
        expect(mergedAudits['test-error'].ignore).toBe(true);
        expect(mergedAudits['test-error'].level).toBe('warning');
        expect(mergedAudits['outdated-error']).toBeUndefined();
        expect(mergedAudits['version-changed-error'].version).toBe(2);
        expect(mergedAudits['version-changed-error'].ignore).toBe(false);
    });
});

// Note: These tests use jest.isolateModulesAsync to ensure projectConfig mutations don't leak between tests
// running in parallel across different test files. We use await import() inside isolateModulesAsync to get
// fresh module instances per test, ensuring each test has an isolated projectConfig state.
describe('fieldIsRequired', () => {
    it.each<{ objectType: SurveyObjectNames; field: string; isRequired: boolean }>([
        // Test all SurveyObjectNames with required fields
        { objectType: 'interview', field: 'accessCode', isRequired: true },
        { objectType: 'household', field: 'size', isRequired: true },
        { objectType: 'home', field: 'address', isRequired: true },
        { objectType: 'organization', field: 'name', isRequired: true },
        { objectType: 'vehicle', field: 'type', isRequired: true },
        { objectType: 'person', field: 'age', isRequired: true },
        { objectType: 'journey', field: 'startDate', isRequired: true },
        { objectType: 'tripChain', field: 'origin', isRequired: true },
        { objectType: 'visitedPlace', field: 'activity', isRequired: true },
        { objectType: 'trip', field: 'origin', isRequired: true },
        { objectType: 'segment', field: 'mode', isRequired: true },
        { objectType: 'junction', field: 'location', isRequired: true },
        { objectType: 'workPlace', field: 'name', isRequired: true },
        { objectType: 'schoolPlace', field: 'name', isRequired: true },
        // Test all SurveyObjectNames with non-required fields
        { objectType: 'interview', field: 'accessCode', isRequired: false },
        { objectType: 'household', field: 'size', isRequired: false },
        { objectType: 'home', field: 'address', isRequired: false },
        { objectType: 'organization', field: 'name', isRequired: false },
        { objectType: 'vehicle', field: 'type', isRequired: false },
        { objectType: 'person', field: 'age', isRequired: false },
        { objectType: 'journey', field: 'startDate', isRequired: false },
        { objectType: 'tripChain', field: 'origin', isRequired: false },
        { objectType: 'visitedPlace', field: 'activity', isRequired: false },
        { objectType: 'trip', field: 'origin', isRequired: false },
        { objectType: 'segment', field: 'mode', isRequired: false },
        { objectType: 'junction', field: 'location', isRequired: false },
        { objectType: 'workPlace', field: 'name', isRequired: false },
        { objectType: 'schoolPlace', field: 'name', isRequired: false }
    ])('$objectType field "$field" should be $isRequired', async ({ objectType, field, isRequired }) => {
        await jest.isolateModulesAsync(async () => {
            // Import modules inside isolateModules to get fresh instances
            const { default: projectConfig } = await import('evolution-common/lib/config/project.config');
            const { fieldIsRequired } = await import('../AuditUtils');

            // Set config for this test
            projectConfig.requiredFieldsBySurveyObject = {
                ...projectConfig.requiredFieldsBySurveyObject,
                [objectType]: isRequired ? [field] : []
            };

            const result = fieldIsRequired(objectType, field);

            expect(result).toBe(isRequired);
        });
    });

    describe('should return false when top-level config is undefined', () => {
        it('handles missing requiredFieldsBySurveyObject safely', async () => {
            await jest.isolateModulesAsync(async () => {
                const { default: projectConfig } = await import('evolution-common/lib/config/project.config');
                const { fieldIsRequired } = await import('../AuditUtils');

                // Simulate entirely missing config section
                (projectConfig as any).requiredFieldsBySurveyObject = undefined;

                expect(fieldIsRequired('interview', 'accessCode')).toBe(false);
            });
        });
    });

    describe('should handle multiple required fields', () => {
        it('should return true for all required fields and false for non-required', async () => {
            await jest.isolateModulesAsync(async () => {
                // Import modules inside isolateModules to get fresh instances
                const { default: projectConfig } = await import('evolution-common/lib/config/project.config');
                const { fieldIsRequired } = await import('../AuditUtils');

                // Set config with multiple required fields
                projectConfig.requiredFieldsBySurveyObject = {
                    ...projectConfig.requiredFieldsBySurveyObject,
                    interview: ['accessCode', 'assignedDate', 'contactEmail']
                };

                expect(fieldIsRequired('interview', 'accessCode')).toBe(true);
                expect(fieldIsRequired('interview', 'assignedDate')).toBe(true);
                expect(fieldIsRequired('interview', 'contactEmail')).toBe(true);
                expect(fieldIsRequired('interview', 'contactPhoneNumber')).toBe(false);
                expect(fieldIsRequired('interview', 'nonExistentField')).toBe(false);
            });
        });
    });

    describe('should return false when object type key is absent', () => {
        it('handles missing config key safely', async () => {
            await jest.isolateModulesAsync(async () => {
                const { default: projectConfig } = await import('evolution-common/lib/config/project.config');
                const { fieldIsRequired } = await import('../AuditUtils');

                // Remove key entirely for this test
                projectConfig.requiredFieldsBySurveyObject = {
                    ...projectConfig.requiredFieldsBySurveyObject,
                };
                delete (projectConfig.requiredFieldsBySurveyObject as any).organization;

                expect(fieldIsRequired('organization', 'name')).toBe(false);
            });
        });
    });

    describe('should handle different object types independently', () => {
        it('should check required fields per object type', async () => {
            await jest.isolateModulesAsync(async () => {
                // Import modules inside isolateModules to get fresh instances
                const { default: projectConfig } = await import('evolution-common/lib/config/project.config');
                const { fieldIsRequired } = await import('../AuditUtils');

                // Set different required fields for different object types
                projectConfig.requiredFieldsBySurveyObject = {
                    ...projectConfig.requiredFieldsBySurveyObject,
                    interview: ['accessCode'],
                    household: ['size'],
                    home: ['address']
                };

                expect(fieldIsRequired('interview', 'accessCode')).toBe(true);
                expect(fieldIsRequired('interview', 'size')).toBe(false);
                expect(fieldIsRequired('household', 'size')).toBe(true);
                expect(fieldIsRequired('household', 'accessCode')).toBe(false);
                expect(fieldIsRequired('home', 'address')).toBe(true);
                expect(fieldIsRequired('home', 'accessCode')).toBe(false);
            });
        });
    });
});
