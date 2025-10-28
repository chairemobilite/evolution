/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { Interview, InterviewAttributes } from '../Interview';
import { InterviewParadata, InterviewParadataAttributes } from '../InterviewParadata';
import { create } from '../InterviewUnserializer';
import { isOk, hasErrors, unwrap } from '../../../../types/Result.type';
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
        startedAt: 1625097600,
        updatedAt: 1625184000,
        completedAt: 1625270400,
        source: 'web',
        languages: [
            { language: 'en', startTimestamp: 1625097600, endTimestamp: 1625270400 }
        ],
        browsers: [
            {
                _ua: 'Mozilla/5.0...',
                browser: { name: 'Chrome', version: '91.0.4472.124' },
                os: { name: 'Windows', version: '10' },
                platform: { type: 'desktop' },
                startTimestamp: 1625097600,
                endTimestamp: 1625270400
            }
        ],
        sections: {
            'home': {
                _startedAt: 1625097600,
                _isCompleted: true
            }
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

        it('should get and set preData', () => {
            const interview = new Interview(validParams, createRawInterviewAttributes(), registry);
            const preData = { importedInterviewData: 'value', respondentId: 'R123' };
            interview.preData = preData;
            expect(interview.preData).toEqual(preData);
            interview.preData = undefined;
            expect(interview.preData).toBeUndefined();
        });

        it('should handle preData in constructor', () => {
            const paramsWithPreData = {
                ...validParams,
                preData: { importedField: 'importedValue', surveyId: 'S456' }
            };
            const interview = new Interview(paramsWithPreData, createRawInterviewAttributes(), registry);
            expect(interview.preData).toEqual({ importedField: 'importedValue', surveyId: 'S456' });
        });

        // TODO: These tests are skipped until setter validation is implemented
        // The preData setter should validate using ParamsValidatorUtils.isRecord()
        it.skip('should reject invalid types for preData', () => {
            const interview = new Interview(validParams, createRawInterviewAttributes(), registry);
            expect(() => {
                interview.preData = [] as any;
            }).toThrow(/validation|TypeError|Invalid preData|should be a plain object \(Record\)/);
        });

        it.skip('should reject non-object types for preData', () => {
            const interview = new Interview(validParams, createRawInterviewAttributes(), registry);
            expect(() => {
                interview.preData = 'string value' as any;
            }).toThrow(/validation|TypeError|Invalid preData|should be a plain object \(Record\)/);
            expect(() => {
                interview.preData = 123 as any;
            }).toThrow(/validation|TypeError|Invalid preData|should be a plain object \(Record\)/);
            expect(() => {
                interview.preData = true as any;
            }).toThrow(/validation|TypeError|Invalid preData|should be a plain object \(Record\)/);
        });

        // Add similar tests for household, person, and organization
        // once their implementations are complete
    });

    describe('preData serialization', () => {
        test('should preserve preData through create and unserialize', () => {
            const paramsWithPreData = {
                ...validParams,
                preData: { importedInterviewData: 'value', respondentId: 'R123' }
            };
            const result1 = create(paramsWithPreData, createRawInterviewAttributes(), registry);
            expect(isOk(result1)).toBe(true);
            if (isOk(result1)) {
                const interview1 = result1.result;
                expect(interview1.preData).toEqual({ importedInterviewData: 'value', respondentId: 'R123' });

                // Also test direct constructor
                const interview2 = new Interview(paramsWithPreData, createRawInterviewAttributes(), registry);
                expect(interview2.preData).toEqual({ importedInterviewData: 'value', respondentId: 'R123' });
            }
        });
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

    describe('hasMinimumRequiredData', () => {
        it('should return true when paradata startedAt is defined', () => {
            const paramsWithRequiredData = {
                ...validParams,
                _paradata: {
                    ...validParadataParams,
                    startedAt: 1625097600
                }
            };
            const interview = new Interview(paramsWithRequiredData, createRawInterviewAttributes(), registry);
            expect(interview.hasMinimumRequiredData()).toBe(true);
        });

        it('should return false when startedAt is undefined', () => {
            const paramsWithoutStartedAt = {
                ...validParams,
                _paradata: {
                    ...validParadataParams,
                    startedAt: undefined
                }
            };
            const interview = new Interview(paramsWithoutStartedAt, createRawInterviewAttributes(), registry);
            expect(interview.hasMinimumRequiredData()).toBe(false);
        });

        it('should return false when paradata is undefined', () => {
            const paramsWithoutParadata = {
                ...validParams,
            };
            const interview = new Interview(paramsWithoutParadata, createRawInterviewAttributes(), registry);
            expect(interview.hasMinimumRequiredData()).toBe(false);
        });

    });

    describe('Interview - extractDirtyParadataParams', () => {
        it('should extract paradata params from dirty params with single language', () => {
            const dirtyParams = {
                _language: 'en',
                _startedAt: 1632929461,
                _updatedAt: 1632929561,
                _completedAt: 1632930461,
                _source: 'web',
                _personRandomSequence: [uuidV4(), uuidV4()],
                _sections: {
                    home: [{ startTimestamp: 1632929461, endTimestamp: 1632930461, widgets: {} }]
                }
            };

            const result = Interview.extractDirtyParadataParams(dirtyParams);

            expect(result.languages).toEqual([{ language: 'en' }]);
            expect(result.startedAt).toBe(1632929461);
            expect(result.updatedAt).toBe(1632929561);
            expect(result.completedAt).toBe(1632930461);
            expect(result.source).toBe('web');
            expect(result.personsRandomSequence).toEqual([dirtyParams._personRandomSequence[0], dirtyParams._personRandomSequence[1]]);
            expect(result.sections).toEqual(dirtyParams._sections);
        });

        it('should extract paradata params from dirty params with single browser', () => {
            const dirtyParams = {
                _browser: {
                    _ua: 'Mozilla/5.0',
                    browser: { name: 'Chrome', version: '93.0' },
                    startTimestamp: 1632929461,
                    endTimestamp: 1632930461
                },
                _startedAt: 1632929461
            };

            const result = Interview.extractDirtyParadataParams(dirtyParams);

            expect(result.browsers).toEqual([dirtyParams._browser]);
            expect(result.startedAt).toBe(1632929461);
        });

        it('should handle missing optional fields', () => {
            const dirtyParams = {
                _startedAt: 1632929461
            };

            const result = Interview.extractDirtyParadataParams(dirtyParams);

            expect(result.languages).toBeUndefined();
            expect(result.browsers).toBeUndefined();
            expect(result.startedAt).toBe(1632929461);
            expect(result.updatedAt).toBeUndefined();
            expect(result.completedAt).toBeUndefined();
            expect(result.source).toBeUndefined();
            expect(result.personsRandomSequence).toBeUndefined();
            expect(result.sections).toBeUndefined();
        });

        it('should handle empty params', () => {
            const dirtyParams = {};

            const result = Interview.extractDirtyParadataParams(dirtyParams);

            expect(result.languages).toBeUndefined();
            expect(result.browsers).toBeUndefined();
            expect(result.startedAt).toBeUndefined();
            expect(result.updatedAt).toBeUndefined();
            expect(result.completedAt).toBeUndefined();
            expect(result.source).toBeUndefined();
            expect(result.personsRandomSequence).toBeUndefined();
            expect(result.sections).toBeUndefined();
        });
    });

    describe('Interview - Paradata extraction during creation', () => {
        it('should use _paradata directly if provided', () => {
            const validParams = {
                _uuid: uuidV4(),
                accessCode: 'ABC123',
                assignedDate: '2023-09-30',
                _paradata: {
                    startedAt: 1632929461,
                    updatedAt: 1632929561,
                    completedAt: 1632930461,
                    source: 'web',
                    languages: [{ language: 'en', startTimestamp: 1632929461, endTimestamp: 1632930461 }]
                }
            };

            const result = create(validParams, { id: 123, participant_id: 456 } as RawInterviewAttributes, registry);
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                const interview = unwrap(result) as Interview;
                expect(interview.paradata?.startedAt).toBe(1632929461);
                expect(interview.paradata?.updatedAt).toBe(1632929561);
                expect(interview.paradata?.completedAt).toBe(1632930461);
                expect(interview.paradata?.source).toBe('web');
                expect(interview.paradata?.languages).toHaveLength(1);
                expect(interview.paradata?.languages?.[0].language).toBe('en');
            }
        });


        it('should extract paradata from dirty params when _paradata and paradata are not provided', () => {
            const validParams = {
                _uuid: uuidV4(),
                accessCode: 'ABC123',
                assignedDate: '2023-09-30',
                _startedAt: 1632929461,
                _updatedAt: 1632929561,
                _completedAt: 1632930461,
                _source: 'web',
                _language: 'fr',
                _browser: {
                    _ua: 'Mozilla/5.0',
                    browser: { name: 'Firefox', version: '92.0' },
                    startTimestamp: 1632929461,
                    endTimestamp: 1632930461
                },
                _personRandomSequence: ['uuid1', 'uuid2'],
                _sections: {
                    home: [{ startTimestamp: 1632929461, endTimestamp: 1632930461, widgets: {} }]
                }
            };

            const result = create(validParams, { id: 123, participant_id: 456 } as RawInterviewAttributes, registry);
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                const interview = unwrap(result) as Interview;
                expect(interview.paradata?.startedAt).toBe(1632929461);
                expect(interview.paradata?.updatedAt).toBe(1632929561);
                expect(interview.paradata?.completedAt).toBe(1632930461);
                expect(interview.paradata?.source).toBe('web');
                expect(interview.paradata?.languages).toHaveLength(1);
                expect(interview.paradata?.languages?.[0].language).toBe('fr');
                expect(interview.paradata?.browsers).toHaveLength(1);
                expect(interview.paradata?.browsers?.[0].browser?.name).toBe('Firefox');
                expect(interview.paradata?.personsRandomSequence).toEqual(['uuid1', 'uuid2']);
                expect(interview.paradata?.sections?.home).toBeDefined();
            }
        });

        it('should handle minimal dirty params without paradata fields', () => {
            const validParams = {
                _uuid: uuidV4(),
                accessCode: 'ABC123',
                assignedDate: '2023-09-30'
            };

            const result = create(validParams, { id: 123, participant_id: 456 } as RawInterviewAttributes, registry);
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                const interview = unwrap(result) as Interview;
                expect(interview.paradata?.startedAt).toBeUndefined();
                expect(interview.paradata?.languages).toEqual([]);
            }
        });
    });
});
