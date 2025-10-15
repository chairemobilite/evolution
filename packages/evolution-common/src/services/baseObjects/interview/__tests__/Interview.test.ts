/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Interview, InterviewAttributes } from '../Interview';
import { InterviewParadata, InterviewParadataAttributes } from '../InterviewParadata';
import { create } from '../InterviewUnserializer';
import { isOk, hasErrors } from '../../../../types/Result.type';
import { validate as uuidValidate } from 'uuid';
import { SurveyObjectsRegistry } from '../../SurveyObjectsRegistry';
import { InterviewAttributes as RawInterviewAttributes } from '../../../../services/questionnaire/types';

let registry: SurveyObjectsRegistry;

beforeEach(() => {
    registry = new SurveyObjectsRegistry();
});

describe('Interview', () => {
    const validParams: InterviewAttributes = {
        _uuid: '123e4567-e89b-12d3-a456-426614174000',
        accessCode: 'ABC123',
        assignedDate: '2023-05-01',
        contactPhoneNumber: '1234567890',
        contactEmail: 'test@example.com'
    };

    const createRawInterviewAttributes = (overrides?: Partial<RawInterviewAttributes>): RawInterviewAttributes => ({
        id: 1,
        participant_id: 1,
        uuid: validParams._uuid as string,
        is_valid: true,
        is_completed: false,
        is_questionable: false,
        is_validated: false,
        response: {},
        validations: {},
        ...overrides
    });

    const validParadataParams: InterviewParadataAttributes = {
        startedAt: 1625097600000,
        updatedAt: 1625184000000,
        completedAt: 1625270400000,
        source: 'web',
        languages: [
            { language: 'en', startTimestamp: 1625097600000, endTimestamp: 1625270400000 }
        ],
        browsers: [
            {
                _ua: 'Mozilla/5.0...',
                browser: { name: 'Chrome', version: '91.0.4472.124' },
                os: { name: 'Windows', version: '10' },
                platform: { type: 'desktop' },
                startTimestamp: 1625097600000,
                endTimestamp: 1625270400000
            }
        ],
        sections: {
            'home': [
                {
                    startTimestamp: 1625097600000,
                    endTimestamp: 1625184000000,
                    widgets: {
                        'widgetShortname': [
                            { startTimestamp: 1625097600000, endTimestamp: 1625140800000 }
                        ]
                    }
                }
            ]
        }
    };

    describe('constructor', () => {
        it('should create an Interview instance with valid parameters', () => {
            const interview = new Interview(validParams, createRawInterviewAttributes(), registry);
            expect(interview).toBeInstanceOf(Interview);
            expect(interview._uuid).toBe(validParams._uuid);
            expect(interview.accessCode).toBe(validParams.accessCode);
        });

        it('should create an Interview instance with acceptToBeContactedForHelp', () => {
            const paramsWithAcceptContact = {
                ...validParams,
                acceptToBeContactedForHelp: true
            };
            const interview = new Interview(paramsWithAcceptContact, createRawInterviewAttributes(), registry);
            expect(interview.acceptToBeContactedForHelp).toBe(true);
        });

        it('should handle acceptToBeContactedForHelp as undefined by default', () => {
            const interview = new Interview(validParams, createRawInterviewAttributes(), registry);
            expect(interview.acceptToBeContactedForHelp).toBeUndefined();
        });

        it('should generate a UUID if not provided', () => {
            const paramsWithoutUuid = { ...validParams };
            delete paramsWithoutUuid._uuid;
            const interview = new Interview(paramsWithoutUuid, createRawInterviewAttributes({ uuid: undefined }), registry);
            expect(interview._uuid).toBeDefined();
            expect(typeof interview._uuid).toBe('string');
        });

        it('should throw an error for invalid UUID', () => {
            const invalidParams = { ...validParams, _uuid: 'invalid-uuid' };
            expect(() => new Interview(invalidParams, createRawInterviewAttributes({ uuid: 'invalid-uuid' }), registry)).toThrow('Uuidable: invalid uuid');
        });
    });

    describe('create', () => {
        it('should create an Interview instance with valid parameters', () => {
            const result = create(validParams, createRawInterviewAttributes(), registry);
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                expect(result.result).toBeInstanceOf(Interview);
                expect(result.result._uuid).toBe(validParams._uuid);
            }
        });

        it('should create an Interview instance with acceptToBeContactedForHelp using create method', () => {
            const paramsWithAcceptContact = {
                ...validParams,
                acceptToBeContactedForHelp: false
            };
            const result = create(paramsWithAcceptContact, createRawInterviewAttributes(), registry);
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                expect(result.result.acceptToBeContactedForHelp).toBe(false);
            }
        });

        it('should return errors for invalid parameters', () => {
            const invalidParams = {
                ...validParams,
                contactEmail: 123 // other attributes are tested in validateParams test file
            };
            const result = create(invalidParams, createRawInterviewAttributes(), registry);
            expect(hasErrors(result)).toBe(true);
            if (hasErrors(result)) {
                expect(result.errors.length).toBeGreaterThan(0);
                expect(result.errors[0].message).toContain('contactEmail');
            }
        });
    });

    describe('UUID handling', () => {
        it('should accept a valid UUID', () => {
            const interview = new Interview(validParams, createRawInterviewAttributes(), registry);
            expect(interview._uuid).toBe(validParams._uuid);
        });

        it('should generate a valid UUID if not provided', () => {
            const paramsWithoutUuid = { ...validParams };
            delete paramsWithoutUuid._uuid;
            const interview = new Interview(paramsWithoutUuid, createRawInterviewAttributes({ uuid: undefined }), registry);
            expect(uuidValidate(interview._uuid as string)).toBe(true);
        });

        it('should throw an error for an invalid UUID', () => {
            const invalidUuidParams = { ...validParams, _uuid: 'invalid-uuid' };
            expect(() => new Interview(invalidUuidParams, createRawInterviewAttributes({ uuid: 'invalid-uuid' }), registry)).toThrow('Uuidable: invalid uuid');
        });
    });

    describe('paradata handling', () => {
        it('should create an Interview instance with valid paradata', () => {
            const paramsWithParadata = {
                ...validParams,
                _paradata: validParadataParams
            };
            const interview = new Interview(paramsWithParadata, createRawInterviewAttributes(), registry);
            expect(interview.paradata).toBeInstanceOf(InterviewParadata);
            expect(interview.paradata?.startedAt).toBe(validParadataParams.startedAt);
        });

        it('should create an Interview instance with valid paradata using create method', () => {
            const paramsWithParadata = {
                ...validParams,
                _paradata: validParadataParams
            };
            const result = create(paramsWithParadata, createRawInterviewAttributes(), registry);
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                expect(result.result).toBeInstanceOf(Interview);
                expect(result.result.paradata).toBeInstanceOf(InterviewParadata);
                expect(result.result.paradata?.startedAt).toBe(validParadataParams.startedAt);
            }
        });

        it('should return errors for invalid paradata', () => {
            const invalidParadataParams = {
                ...validParadataParams,
                startedAt: 'invalid' // should be a number
                // other attributes are tested in a separate file (InterviewParadata.validateParams)
            };
            const paramsWithInvalidParadata = {
                ...validParams,
                _paradata: invalidParadataParams
            };
            const result = create(paramsWithInvalidParadata, createRawInterviewAttributes(), registry);
            expect(hasErrors(result)).toBe(true);
            if (hasErrors(result)) {
                expect(result.errors.length).toBeGreaterThan(0);
                expect(result.errors[0].message).toContain('startedAt');
            }
        });

    });

    describe('Interview - Custom attributes and composed objects', () => {
        it('should handle custom attributes', () => {
            const customParams = {
                ...validParams,
                customField1: 'value1',
                customField2: 42
            };
            const interview = new Interview(customParams, createRawInterviewAttributes(), registry);
            expect(interview.customAttributes.customField1).toBe('value1');
            expect(interview.customAttributes.customField2).toBe(42);
        });

        it('should get and set paradata', () => {
            const interview = new Interview(validParams, createRawInterviewAttributes(), registry);
            const paradata = new InterviewParadata(validParadataParams);
            interview.paradata = paradata;
            expect(interview.paradata).toBe(paradata);
        });

        // Add similar tests for household, person, and organization
        // once their implementations are complete
    });

    describe('confidential attributes', () => {
        it('should include acceptToBeContactedForHelp in confidential attributes', () => {
            expect(Interview._confidentialAttributes).toContain('acceptToBeContactedForHelp');
        });

        it('should include all expected confidential attributes', () => {
            const expectedConfidentialAttributes = [
                '_id',
                '_participant_id',
                'accessCode',
                'contactPhoneNumber',
                'helpContactPhoneNumber',
                'contactEmail',
                'helpContactEmail',
                'acceptToBeContactedForHelp',
                'wouldLikeToParticipateInOtherSurveys',
                'respondentComments',
                'interviewerComments',
                'auditorComments',
                'durationRange',
                'durationRespondentEstimationMin',
                'interestRange',
                'difficultyRange',
                'burdenRange',
                'consideredAbandoning'
            ];

            expectedConfidentialAttributes.forEach((attr) => {
                expect(Interview._confidentialAttributes).toContain(attr);
            });
        });
    });
});
