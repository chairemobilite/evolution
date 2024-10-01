/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Interview } from '../../Interview';
import { Result, isOk, unwrap } from '../../../../types/Result.type';
import { Language, Browser, SectionMetadata } from '../../attributeTypes/InterviewAttributes';

describe('Interview - Getters and Setters', () => {
    let interview: Interview;

    beforeEach(() => {
        const validParams = {
            _uuid: '123e4567-e89b-12d3-a456-426614174001',
            _id: 123,
            _participant_id: 456,
            accessCode: 'ABC123',
            assignedDate: '2023-09-30',
            _startedAt: 1632929461
        };
        const result = Interview.create(validParams) as Result<Interview>;
        if (isOk(result)) {
            interview = unwrap(result) as Interview;
        } else {
            throw new Error('Failed to create interview');
        }
    });

    it('should allow undefined id and participant id', () => {
        let _interview: Interview;
        const validParamsWithoutIdAndParticipantId = {
            _uuid: '123e4567-e89b-12d3-a456-426614174001',
        };
        const result = Interview.create(validParamsWithoutIdAndParticipantId) as Result<Interview>;
        if (isOk(result)) {
            _interview = unwrap(result) as Interview;
        } else {
            throw new Error('Failed to create interview');
        }
        expect(_interview._id).toBeUndefined();
        expect(_interview._participant_id).toBeUndefined();
    });

    it('should get _id', () => {
        expect(interview._id).toBe(123);
    });

    it('should get _participant_id', () => {
        expect(interview._participant_id).toBe(456);
    });

    it('should get and set accessCode', () => {
        interview.accessCode = 'NEW123';
        expect(interview.accessCode).toBe('NEW123');
        interview.accessCode = undefined;
        expect(interview.accessCode).toBeUndefined();
    });

    it('should get and set assignedDate', () => {
        interview.assignedDate = '2023-10-01';
        expect(interview.assignedDate).toBe('2023-10-01');
        interview.assignedDate = undefined;
        expect(interview.assignedDate).toBeUndefined();
    });

    it('should get and set contactPhoneNumber', () => {
        interview.contactPhoneNumber = '1234567890';
        expect(interview.contactPhoneNumber).toBe('1234567890');
        interview.contactPhoneNumber = undefined;
        expect(interview.contactPhoneNumber).toBeUndefined();
    });

    it('should get and set helpContactPhoneNumber', () => {
        interview.helpContactPhoneNumber = '0987654321';
        expect(interview.helpContactPhoneNumber).toBe('0987654321');
        interview.helpContactPhoneNumber = undefined;
        expect(interview.helpContactPhoneNumber).toBeUndefined();
    });

    it('should get and set contactEmail', () => {
        interview.contactEmail = 'test@example.com';
        expect(interview.contactEmail).toBe('test@example.com');
        interview.contactEmail = undefined;
        expect(interview.contactEmail).toBeUndefined();
    });

    it('should get and set helpContactEmail', () => {
        interview.helpContactEmail = 'help@example.com';
        expect(interview.helpContactEmail).toBe('help@example.com');
        interview.helpContactEmail = undefined;
        expect(interview.helpContactEmail).toBeUndefined();
    });

    it('should get and set wouldLikeToParticipateInOtherSurveys', () => {
        interview.wouldLikeToParticipateInOtherSurveys = true;
        expect(interview.wouldLikeToParticipateInOtherSurveys).toBe(true);
        interview.wouldLikeToParticipateInOtherSurveys = undefined;
        expect(interview.wouldLikeToParticipateInOtherSurveys).toBeUndefined();
    });

    it('should get and set respondentComments', () => {
        interview.respondentComments = 'Test comment';
        expect(interview.respondentComments).toBe('Test comment');
        interview.respondentComments = undefined;
        expect(interview.respondentComments).toBeUndefined();
    });

    it('should get and set interviewerComments', () => {
        interview.interviewerComments = 'Interviewer note';
        expect(interview.interviewerComments).toBe('Interviewer note');
        interview.interviewerComments = undefined;
        expect(interview.interviewerComments).toBeUndefined();
    });

    it('should get and set validatorComments', () => {
        interview.validatorComments = 'Validator note';
        expect(interview.validatorComments).toBe('Validator note');
        interview.validatorComments = undefined;
        expect(interview.validatorComments).toBeUndefined();
    });

    it('should get and set durationRange', () => {
        interview.durationRange = 5;
        expect(interview.durationRange).toBe(5);
        interview.durationRange = undefined;
        expect(interview.durationRange).toBeUndefined();
    });

    it('should get and set durationRespondentEstimationMin', () => {
        interview.durationRespondentEstimationMin = 30;
        expect(interview.durationRespondentEstimationMin).toBe(30);
        interview.durationRespondentEstimationMin = undefined;
        expect(interview.durationRespondentEstimationMin).toBeUndefined();
    });

    it('should get and set interestRange', () => {
        interview.interestRange = 4;
        expect(interview.interestRange).toBe(4);
        interview.interestRange = undefined;
        expect(interview.interestRange).toBeUndefined();
    });

    it('should get and set difficultyRange', () => {
        interview.difficultyRange = 3;
        expect(interview.difficultyRange).toBe(3);
        interview.difficultyRange = undefined;
        expect(interview.difficultyRange).toBeUndefined();
    });

    it('should get and set burdenRange', () => {
        interview.burdenRange = 2;
        expect(interview.burdenRange).toBe(2);
        interview.burdenRange = undefined;
        expect(interview.burdenRange).toBeUndefined();
    });

    it('should get and set consideredToAbandonRange', () => {
        interview.consideredToAbandonRange = 'yes';
        expect(interview.consideredToAbandonRange).toBe('yes');
        interview.consideredToAbandonRange = undefined;
        expect(interview.consideredToAbandonRange).toBeUndefined();
    });

    it('should get and set _startedAt', () => {
        interview._startedAt = 1633015861;
        expect(interview._startedAt).toBe(1633015861);
        interview._startedAt = undefined;
        expect(interview._startedAt).toBeUndefined();
    });

    it('should get and set _updatedAt', () => {
        interview._updatedAt = 1633015962;
        expect(interview._updatedAt).toBe(1633015962);
        interview._updatedAt = undefined;
        expect(interview._updatedAt).toBeUndefined();
    });

    it('should get and set _completedAt', () => {
        interview._completedAt = 1633016063;
        expect(interview._completedAt).toBe(1633016063);
        interview._completedAt = undefined;
        expect(interview._completedAt).toBeUndefined();
    });

    it('should get and set _isValid', () => {
        interview._isValid = false;
        expect(interview._isValid).toBe(false);
        interview._isValid = undefined;
        expect(interview._isValid).toBeUndefined();
    });

    it('should get and set _isCompleted', () => {
        interview._isCompleted = true;
        expect(interview._isCompleted).toBe(true);
        interview._isCompleted = undefined;
        expect(interview._isCompleted).toBeUndefined();
    });

    it('should get and set _isQuestionable', () => {
        interview._isQuestionable = true;
        expect(interview._isQuestionable).toBe(true);
        interview._isQuestionable = undefined;
        expect(interview._isQuestionable).toBeUndefined();
    });

    it('should get and set _source', () => {
        interview._source = 'web';
        expect(interview._source).toBe('web');
        interview._source = undefined;
        expect(interview._source).toBeUndefined();
    });

    it('should get and set _personsRandomSequence', () => {
        const sequence = ['uuid1', 'uuid2', 'uuid3'];
        interview._personsRandomSequence = sequence;
        expect(interview._personsRandomSequence).toEqual(sequence);
        interview._personsRandomSequence = undefined;
        expect(interview._personsRandomSequence).toBeUndefined();
    });

    it('should get and set _languages', () => {
        const languages = [{ language: 'en', startTimestamp: 1632929461, endTimestamp: 1632929761 } as Language ];
        interview._languages = languages;
        expect(interview._languages).toEqual(languages);
        interview._languages = undefined;
        expect(interview._languages).toEqual([]);
    });

    it('should get and set _browsers', () => {
        const browsers = [{
            _ua: 'Mozilla/5.0',
            browser: { name: 'Chrome', version: '94.0.4606.61' },
            os: { name: 'Windows', version: '10' },
            platform: { type: 'desktop' },
            startTimestamp: 1632929461,
            endTimestamp: 1632929761
        } as Browser];
        interview._browsers = browsers;
        expect(interview._browsers).toEqual(browsers);
        interview._browsers = undefined;
        expect(interview._browsers).toEqual([]);
    });

    it('should get and set _sections', () => {
        let sections = {
            home: [{
                startTimestamp: 1632929461,
                endTimestamp: 1632929761,
                widgets: {
                    widgetShortname: [{ startTimestamp: 1632929461, endTimestamp: 1632929561 }]
                }
            } as SectionMetadata]
        };
        interview._sections = sections;
        expect(interview._sections).toEqual(sections);
        sections = {
            home: [{
                startTimestamp: 1632929461,
                endTimestamp: 1632929761,
                widgets: {}
            } as SectionMetadata]
        };
        interview._sections = sections;
        expect(interview._sections).toEqual(sections);
        interview._sections = undefined;
        expect(interview._sections).toEqual({});
    });
});
