/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Interview } from '../../Interview';

describe('Interview - validateParams', () => {
    const validParams = {
        _uuid: '123e4567-e89b-12d3-a456-426614174000',
        _id: 123,
        _participant_id: 456,
        accessCode: 'ABC123',
        assignedDate: '2023-09-30',
        _startedAt: 1632929461,
        contactPhoneNumber: '1234567890',
        helpContactPhoneNumber: '0987654321',
        contactEmail: 'test@example.com',
        helpContactEmail: 'help@example.com',
        wouldLikeToParticipateInOtherSurveys: true,
        respondentComments: 'Test comment',
        interviewerComments: 'Interviewer note',
        validatorComments: 'Validator note',
        durationRange: 15,
        durationRespondentEstimationMin: 30,
        interestRange: 43,
        difficultyRange: 300,
        burdenRange: 200,
        consideredToAbandonRange: 'yes',
        _isValid: true,
        _isCompleted: false,
        _isQuestionable: false,
        _source: 'web',
        _personsRandomSequence: ['uuid1', 'uuid2'],
        _languages: [{ language: 'en', startTimestamp: 1632929461, endTimestamp: 1632929761 }],
        _browsers: [{
            _ua: 'Mozilla/5.0',
            browser: { name: 'Chrome', version: '94.0.4606.61' },
            os: { name: 'Windows', version: '10' },
            platform: { type: 'desktop' },
            startTimestamp: 1632929461,
            endTimestamp: 1632929761
        }],
        _sections: {
            home: [{
                startTimestamp: 1632929461,
                endTimestamp: 1632929761,
                widgets: {
                    widgetShortname: [{ startTimestamp: 1632929461, endTimestamp: 1632929561 }]
                }
            }]
        }
    };

    it('should validate valid params', () => {
        const errors = Interview.validateParams(validParams);
        expect(errors).toHaveLength(0);
    });

    it('should validate _uuid', () => {
        const params = { ...validParams, _uuid: 'invalid-uuid' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('_uuid'))).toBe(true);
    });

    it('should validate _id', () => {
        const params = { ...validParams, _id: 'not-a-number' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('_id'))).toBe(true);
    });

    it('should validate _participant_id', () => {
        const params = { ...validParams, _participant_id: 'not-a-number' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('_participant_id'))).toBe(true);
    });

    it('should validate accessCode', () => {
        const params = { ...validParams, accessCode: 123 };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('accessCode'))).toBe(true);
    });

    it('should validate assignedDate', () => {
        const params = { ...validParams, assignedDate: 'invalid-date' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('assignedDate'))).toBe(true);
    });

    it('should validate contactPhoneNumber', () => {
        const params = { ...validParams, contactPhoneNumber: 12345 };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('contactPhoneNumber'))).toBe(true);
    });

    it('should validate helpContactPhoneNumber', () => {
        const params = { ...validParams, helpContactPhoneNumber: 12345 };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('helpContactPhoneNumber'))).toBe(true);
    });

    it('should validate contactEmail', () => {
        const params = { ...validParams, contactEmail: 123 };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('contactEmail'))).toBe(true);
    });

    it('should validate helpContactEmail', () => {
        const params = { ...validParams, helpContactEmail: {} };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('helpContactEmail'))).toBe(true);
    });

    it('should validate wouldLikeToParticipateInOtherSurveys', () => {
        const params = { ...validParams, wouldLikeToParticipateInOtherSurveys: 'not-a-boolean' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('wouldLikeToParticipateInOtherSurveys'))).toBe(true);
    });

    it('should validate respondentComments', () => {
        const params = { ...validParams, respondentComments: 123 };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('respondentComments'))).toBe(true);
    });

    it('should validate interviewerComments', () => {
        const params = { ...validParams, interviewerComments: 123 };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('interviewerComments'))).toBe(true);
    });

    it('should validate validatorComments', () => {
        const params = { ...validParams, validatorComments: 123 };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('validatorComments'))).toBe(true);
    });

    it('should validate durationRange', () => {
        const params = { ...validParams, durationRange: 'not-a-number' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('durationRange'))).toBe(true);
    });

    it('should validate durationRespondentEstimationMin', () => {
        const params = { ...validParams, durationRespondentEstimationMin: 'not-a-number' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('durationRespondentEstimationMin'))).toBe(true);
    });

    it('should validate interestRange', () => {
        const params = { ...validParams, interestRange: 'not-a-number' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('interestRange'))).toBe(true);
    });

    it('should validate difficultyRange', () => {
        const params = { ...validParams, difficultyRange: 'not-a-number' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('difficultyRange'))).toBe(true);
    });

    it('should validate burdenRange', () => {
        const params = { ...validParams, burdenRange: 'not-a-number' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('burdenRange'))).toBe(true);
    });

    it('should validate consideredToAbandonRange', () => {
        const params = { ...validParams, consideredToAbandonRange: 'invalid-value' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('consideredToAbandonRange'))).toBe(true);
    });

    it('should validate _startedAt', () => {
        const params = { ...validParams, _startedAt: 'not-a-number' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('_startedAt'))).toBe(true);
    });

    it('should validate _updatedAt', () => {
        const params = { ...validParams, _updatedAt: 'not-a-number' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('_updatedAt'))).toBe(true);
    });

    it('should validate _completedAt', () => {
        const params = { ...validParams, _completedAt: 'not-a-number' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('_completedAt'))).toBe(true);
    });

    it('should validate _isValid', () => {
        const params = { ...validParams, _isValid: 'not-a-boolean' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('_isValid'))).toBe(true);
    });

    it('should validate _isCompleted', () => {
        const params = { ...validParams, _isCompleted: 'not-a-boolean' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('_isCompleted'))).toBe(true);
    });

    it('should validate _isQuestionable', () => {
        const params = { ...validParams, _isQuestionable: 'not-a-boolean' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('_isQuestionable'))).toBe(true);
    });

    it('should validate _source', () => {
        const params = { ...validParams, _source: 123 };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('_source'))).toBe(true);
    });

    it('should validate _personsRandomSequence', () => {
        const params = { ...validParams, _personsRandomSequence: 'not-an-array' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('_personsRandomSequence'))).toBe(true);
    });

    it('should validate _languages', () => {
        const params = { ...validParams, _languages: 'not-an-array' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('_languages'))).toBe(true);
    });

    it('should validate _browsers', () => {
        const params = { ...validParams, _browsers: 'not-an-array' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('_browsers'))).toBe(true);
    });

    it('should validate _sections', () => {
        const params = { ...validParams, _sections: 'not-an-object' };
        const errors = Interview.validateParams(params);
        expect(errors.some((e) => e.message.includes('_sections'))).toBe(true);
    });
});

describe('Interview - validateParams (Nested Attributes)', () => {
    const validParams = {
        _uuid: '123e4567-e89b-12d3-a456-426614174000',
        _languages: [
            { language: 'en', startTimestamp: 1632929461, endTimestamp: 1632929761 }
        ],
        _browsers: [{
            _ua: 'Mozilla/5.0',
            browser: { name: 'Chrome', version: '94.0.4606.61' },
            engine: { name: 'Blink', version: '94.0.4606.61' },
            os: { name: 'Windows', version: '10' },
            platform: { type: 'desktop', vendor: 'Microsoft' },
            startTimestamp: 1632929461,
            endTimestamp: 1632929761
        }],
        _sections: {
            home: [{
                startTimestamp: 1632929461,
                endTimestamp: 1632929761,
                widgets: {
                    widgetShortname: [{ startTimestamp: 1632929461, endTimestamp: 1632929561 }]
                }
            }]
        }
    };

    describe('_languages validation', () => {
        it('should validate valid _languages', () => {
            const errors = Interview.validateParams(validParams);
            expect(errors.filter((e) => e.message.includes('_languages'))).toHaveLength(0);
        });

        it('should validate invalid language in _languages', () => {
            const params = {
                ...validParams,
                _languages: [{ language: 123, startTimestamp: 1632929461, endTimestamp: 1632929761 }]
            };
            const errors = Interview.validateParams(params);
            expect(errors.some((e) => e.message.includes('_languages.[0].language'))).toBe(true);
        });

        it('should validate invalid startTimestamp in _languages', () => {
            const params = {
                ...validParams,
                _languages: [{ language: 'en', startTimestamp: 'invalid', endTimestamp: 1632929761 }]
            };
            const errors = Interview.validateParams(params);
            expect(errors.some((e) => e.message.includes('_languages.[0].startTimestamp'))).toBe(true);
        });

        it('should validate invalid endTimestamp in _languages', () => {
            const params = {
                ...validParams,
                _languages: [{ language: 'en', startTimestamp: 1632929461, endTimestamp: 'invalid' }]
            };
            const errors = Interview.validateParams(params);
            expect(errors.some((e) => e.message.includes('_languages.[0].endTimestamp'))).toBe(true);
        });
    });

    describe('_browsers validation', () => {
        it('should validate valid _browsers', () => {
            const errors = Interview.validateParams(validParams);
            expect(errors.filter((e) => e.message.includes('_browsers'))).toHaveLength(0);
        });

        it('should validate invalid _ua in _browsers', () => {
            const params = {
                ...validParams,
                _browsers: [{ ...validParams._browsers[0], _ua: 123 }]
            };
            const errors = Interview.validateParams(params);
            expect(errors.some((e) => e.message.includes('_browsers.[0]._ua'))).toBe(true);
        });

        it('should validate invalid browser name in _browsers', () => {
            const params = {
                ...validParams,
                _browsers: [{ ...validParams._browsers[0], browser: { name: 123, version: '94.0.4606.61' } }]
            };
            const errors = Interview.validateParams(params);
            expect(errors.some((e) => e.message.includes('_browsers.[0].browser.name'))).toBe(true);
        });

        it('should validate invalid engine name in _browsers', () => {
            const params = {
                ...validParams,
                _browsers: [{ ...validParams._browsers[0], engine: { name: 123, version: '94.0.4606.61' } }]
            };
            const errors = Interview.validateParams(params);
            expect(errors.some((e) => e.message.includes('_browsers.[0].engine.name'))).toBe(true);
        });

        it('should validate invalid os name in _browsers', () => {
            const params = {
                ...validParams,
                _browsers: [{ ...validParams._browsers[0], os: { name: 123, version: '10' } }]
            };
            const errors = Interview.validateParams(params);
            expect(errors.some((e) => e.message.includes('_browsers.[0].os.name'))).toBe(true);
        });

        it('should validate invalid platform type in _browsers', () => {
            const params = {
                ...validParams,
                _browsers: [{ ...validParams._browsers[0], platform: { type: 123, vendor: 'Microsoft' } }]
            };
            const errors = Interview.validateParams(params);
            expect(errors.some((e) => e.message.includes('_browsers.[0].platform.type'))).toBe(true);
        });

        it('should validate invalid startTimestamp in _browsers', () => {
            const params = {
                ...validParams,
                _browsers: [{ ...validParams._browsers[0], startTimestamp: 'invalid' }]
            };
            const errors = Interview.validateParams(params);
            expect(errors.some((e) => e.message.includes('_browsers.[0].startTimestamp'))).toBe(true);
        });
    });

    describe('_sections validation', () => {
        it('should validate valid _sections', () => {
            const errors = Interview.validateParams(validParams);
            expect(errors.filter((e) => e.message.includes('_sections'))).toHaveLength(0);
        });

        it('should validate invalid section startTimestamp', () => {
            const params = {
                ...validParams,
                _sections: {
                    home: [{
                        startTimestamp: 'invalid',
                        endTimestamp: 1632929761,
                        widgets: {
                            widgetShortname: [{ startTimestamp: 1632929461, endTimestamp: 1632929561 }]
                        }
                    }]
                }
            };
            const errors = Interview.validateParams(params);
            expect(errors.some((e) => e.message.includes('_sections.home.[0].startTimestamp'))).toBe(true);
        });

        it('should validate invalid widget startTimestamp', () => {
            const params = {
                ...validParams,
                _sections: {
                    home: [{
                        startTimestamp: 1632929461,
                        endTimestamp: 1632929761,
                        widgets: {
                            widgetShortname: [{ startTimestamp: 'invalid', endTimestamp: 1632929561 }]
                        }
                    }]
                }
            };
            const errors = Interview.validateParams(params);
            expect(errors.some((e) => e.message.includes('_sections.home.[0].widgets.widgetShortname.[0].startTimestamp'))).toBe(true);
        });

        it('should validate invalid widget structure', () => {
            const params = {
                ...validParams,
                _sections: {
                    home: [{
                        startTimestamp: 1632929461,
                        endTimestamp: 1632929761,
                        widgets: 'invalid'
                    }]
                }
            };
            const errors = Interview.validateParams(params);
            expect(errors.some((e) => e.message.includes('_sections.home.[0].widgets'))).toBe(true);
        });
    });
});
