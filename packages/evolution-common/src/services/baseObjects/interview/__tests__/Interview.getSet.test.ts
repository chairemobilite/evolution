/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Interview } from '../Interview';
import { create } from '../InterviewUnserializer';
import { Result, isOk, unwrap } from '../../../../types/Result.type';

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
        const interviewResult = create(validParams) as Result<Interview>;
        if (isOk(interviewResult)) {
            interview = unwrap(interviewResult) as Interview;
        } else {
            throw new Error('Failed to create interview');
        }
    });

    it('should allow undefined id and participant id', () => {
        let _interview: Interview;
        const validParamsWithoutIdAndParticipantId = {
            _uuid: '123e4567-e89b-12d3-a456-426614174001',
        };
        const result = create(validParamsWithoutIdAndParticipantId) as Result<Interview>;
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

    it('should get and set auditorComments', () => {
        interview.auditorComments = 'Auditor note';
        expect(interview.auditorComments).toBe('Auditor note');
        interview.auditorComments = undefined;
        expect(interview.auditorComments).toBeUndefined();
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

    it('should get and set consideredAbandoningRange', () => {
        interview.consideredAbandoningRange = 'yes';
        expect(interview.consideredAbandoningRange).toBe('yes');
        interview.consideredAbandoningRange = undefined;
        expect(interview.consideredAbandoningRange).toBeUndefined();
    });

    it('should get and set acceptToBeContactedForHelp', () => {
        interview.acceptToBeContactedForHelp = true;
        expect(interview.acceptToBeContactedForHelp).toBe(true);
        interview.acceptToBeContactedForHelp = false;
        expect(interview.acceptToBeContactedForHelp).toBe(false);
        interview.acceptToBeContactedForHelp = undefined;
        expect(interview.acceptToBeContactedForHelp).toBeUndefined();
    });

});
