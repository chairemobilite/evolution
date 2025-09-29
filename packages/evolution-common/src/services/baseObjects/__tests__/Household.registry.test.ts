/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';
import { Household } from '../Household';
import { Interview } from '../interview/Interview';
import { Place } from '../Place';
import { v4 as uuidV4 } from 'uuid';

const validUuid = uuidV4();
const validUuid2 = uuidV4();
const validUuid3 = uuidV4();
const validUuid4 = uuidV4();
const validUuid5 = uuidV4();
const validUuid6 = uuidV4();
const validUuid7 = uuidV4();

describe('Household Registry Functionality', () => {
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

            const household = new Household({
                _uuid: validUuid3,
                size: 2,
                _interviewUuid: validUuid
            });

            registry.registerInterview(mockInterview);
            registry.registerHousehold(household);

            expect(household.interview).toBe(mockInterview);
        });

        it('should access home through registry', () => {
            const mockHome = new Place({
                _uuid: validUuid2,
                name: 'Test Home'
            });

            const household = new Household({
                _uuid: validUuid3,
                size: 2,
                _homeUuid: validUuid2
            });

            registry.registerPlace(mockHome);
            registry.registerHousehold(household);

            expect(household.home).toBe(mockHome);
        });

        it('should return undefined for missing interview', () => {
            const household = new Household({
                _uuid: validUuid3,
                size: 2,
                _interviewUuid: validUuid7
            });

            registry.registerHousehold(household);

            expect(household.interview).toBeUndefined();
        });

        it('should return undefined for missing home', () => {
            const household = new Household({
                _uuid: validUuid3,
                size: 2,
                _homeUuid: validUuid6
            });

            registry.registerHousehold(household);

            expect(household.home).toBeUndefined();
        });

        it('should return undefined when no parent UUIDs are set', () => {
            const household = new Household({
                _uuid: validUuid3,
                size: 2
            });

            registry.registerHousehold(household);

            expect(household.interview).toBeUndefined();
            expect(household.home).toBeUndefined();
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

            const household = new Household({
                _uuid: validUuid3,
                size: 2,
                _interviewUuid: validUuid
            });

            registry.registerInterview(interview1);
            registry.registerHousehold(household);

            expect(household.interview).toBe(interview1);

            // Update interview in registry
            registry.registerInterview(interview2);

            expect(household.interview).toBe(interview2);
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

            const household = new Household({
                _uuid: validUuid3,
                size: 2,
                _interviewUuid: validUuid
            });

            registry.registerInterview(mockInterview);
            registry.registerHousehold(household);

            expect(household.interview).toBe(mockInterview);

            // Remove interview from registry
            registry.unregisterInterview(validUuid);

            expect(household.interview).toBeUndefined();
        });
    });

    describe('UUID Management', () => {
        it('should handle interviewUuid setter', () => {
            const mockInterview = new Interview({
                _uuid: validUuid4,
                _id: 1,
                _participant_id: 1,
                _isValid: true,
                _isCompleted: false,
                _isQuestionable: false,
                _isValidated: undefined
            }, {
                id: 1,
                uuid: validUuid4,
                participant_id: 1,
                is_completed: false,
                response: {},
                validations: {},
                is_valid: true,
                is_questionable: false,
                is_validated: undefined
            });

            const household = new Household({
                _uuid: validUuid3,
                size: 2
            });

            registry.registerInterview(mockInterview);
            registry.registerHousehold(household);

            // Initially no interview
            expect(household.interview).toBeUndefined();

            // Set interview UUID
            household.interviewUuid = validUuid4;

            expect(household.interview).toBe(mockInterview);
        });

        it('should handle homeUuid setter', () => {
            const mockHome = new Place({
                _uuid: validUuid5,
                name: 'New Home'
            });

            const household = new Household({
                _uuid: validUuid3,
                size: 2
            });

            registry.registerPlace(mockHome);
            registry.registerHousehold(household);

            // Initially no home
            expect(household.home).toBeUndefined();

            // Set home UUID
            household.homeUuid = validUuid5;

            expect(household.home).toBe(mockHome);
        });
    });
});
