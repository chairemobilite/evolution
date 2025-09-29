/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';
import { Organization } from '../Organization';
import { Interview } from '../interview/Interview';
import { v4 as uuidV4 } from 'uuid';

const validUuid = uuidV4();
const validUuid2 = uuidV4();
const validUuid3 = uuidV4();
const validUuid4 = uuidV4();

describe('Organization Registry Functionality', () => {
    let registry: SurveyObjectsRegistry;

    beforeEach(() => {
        registry = SurveyObjectsRegistry.getInstance();
        registry.clear();
    });

    afterEach(() => {
        registry.clear();
    });

    describe('Parent Access', () => {
        it('should access interview through registry', () => {
            const mockInterview = new Interview({
                _uuid: validUuid,
                _id: 1,
                _participant_id: 1,
                _isValid: true,
                _isCompleted: false,
                _isQuestionable: false,
                _isValidated: undefined
            }, {
                id: 1,
                uuid: validUuid,
                participant_id: 1,
                is_completed: false,
                response: {},
                validations: {},
                is_valid: true,
                is_questionable: false,
                is_validated: undefined
            });

            const organization = new Organization({
                _uuid: validUuid2,
                name: 'Test Company',
                _interviewUuid: validUuid
            });

            registry.registerInterview(mockInterview);
            registry.registerOrganization(organization);

            expect(organization.interview).toBe(mockInterview);
        });

        it('should return undefined for missing interview', () => {
            const organization = new Organization({
                _uuid: validUuid2,
                name: 'Test Company',
                _interviewUuid: validUuid4
            });

            registry.registerOrganization(organization);

            expect(organization.interview).toBeUndefined();
        });

        it('should return undefined when no interview UUID is set', () => {
            const organization = new Organization({
                _uuid: validUuid2,
                name: 'Test Company'
            });

            registry.registerOrganization(organization);

            expect(organization.interview).toBeUndefined();
        });
    });

    describe('Registry State Changes', () => {
        it('should reflect changes when interview is updated in registry', () => {
            const interview1 = new Interview({
                _uuid: validUuid,
                _id: 1,
                _participant_id: 1,
                _isValid: true,
                _isCompleted: false,
                _isQuestionable: false,
                _isValidated: undefined
            }, {
                id: 1,
                uuid: validUuid,
                participant_id: 1,
                is_completed: false,
                response: {},
                validations: {},
                is_valid: true,
                is_questionable: false,
                is_validated: undefined
            });

            const interview2 = new Interview({
                _uuid: validUuid,
                _id: 2,
                _participant_id: 2,
                _isValid: true,
                _isCompleted: true,
                _isQuestionable: false,
                _isValidated: true
            }, {
                id: 2,
                uuid: validUuid,
                participant_id: 2,
                is_completed: true,
                response: {},
                validations: {},
                is_valid: true,
                is_questionable: false,
                is_validated: true
            });

            const organization = new Organization({
                _uuid: validUuid2,
                name: 'Test Company',
                _interviewUuid: validUuid
            });

            registry.registerInterview(interview1);
            registry.registerOrganization(organization);

            expect(organization.interview).toBe(interview1);

            // Update interview in registry
            registry.registerInterview(interview2);

            expect(organization.interview).toBe(interview2);
        });

        it('should return undefined when interview is removed from registry', () => {
            const mockInterview = new Interview({
                _uuid: validUuid,
                _id: 1,
                _participant_id: 1,
                _isValid: true,
                _isCompleted: false,
                _isQuestionable: false,
                _isValidated: undefined
            }, {
                id: 1,
                uuid: validUuid,
                participant_id: 1,
                is_completed: false,
                response: {},
                validations: {},
                is_valid: true,
                is_questionable: false,
                is_validated: undefined
            });

            const organization = new Organization({
                _uuid: validUuid2,
                name: 'Test Company',
                _interviewUuid: validUuid
            });

            registry.registerInterview(mockInterview);
            registry.registerOrganization(organization);

            expect(organization.interview).toBe(mockInterview);

            // Remove interview from registry
            registry.unregisterInterview(validUuid);

            expect(organization.interview).toBeUndefined();
        });
    });

    describe('UUID Management', () => {
        it('should handle interviewUuid setter', () => {
            const mockInterview = new Interview({
                _uuid: validUuid3,
                _id: 1,
                _participant_id: 1,
                _isValid: true,
                _isCompleted: false,
                _isQuestionable: false,
                _isValidated: undefined
            }, {
                id: 1,
                uuid: validUuid3,
                participant_id: 1,
                is_completed: false,
                response: {},
                validations: {},
                is_valid: true,
                is_questionable: false,
                is_validated: undefined
            });

            const organization = new Organization({
                _uuid: validUuid2,
                name: 'Test Company'
            });

            registry.registerInterview(mockInterview);
            registry.registerOrganization(organization);

            // Initially no interview
            expect(organization.interview).toBeUndefined();

            // Set interview UUID
            organization.interviewUuid = validUuid3;

            expect(organization.interview).toBe(mockInterview);
        });

        it('should handle null/undefined interview UUID', () => {
            const organization = new Organization({
                _uuid: validUuid2,
                name: 'Test Company'
            });

            registry.registerOrganization(organization);

            organization.interviewUuid = undefined;
            expect(organization.interview).toBeUndefined();

            organization.interviewUuid = null as any;
            expect(organization.interview).toBeUndefined();
        });
    });
});
