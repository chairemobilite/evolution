/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { validateParams } from '../InterviewUnserializer';

describe('Interview - validateParams', () => {
    const validParams = {
        _uuid: '123e4567-e89b-12d3-a456-426614174000',
        _id: 123,
        _participant_id: 456,
        accessCode: 'ABC123',
        assignedDate: '2023-09-30',
        contactPhoneNumber: '1234567890',
        helpContactPhoneNumber: '0987654321',
        contactEmail: 'test@example.com',
        helpContactEmail: 'help@example.com',
        acceptToBeContactedForHelp: true,
        wouldLikeToParticipateInOtherSurveys: true,
        respondentComments: 'Test comment',
        interviewerComments: 'Interviewer note',
        auditorComments: 'Auditor note',
        durationRange: 15,
        durationRespondentEstimationMin: 30,
        interestRange: 43,
        difficultyRange: 300,
        burdenRange: 200,
        consideredAbandoningRange: 'yes',
    };

    it('should validate valid params', () => {
        const errors = validateParams(validParams);
        expect(errors).toHaveLength(0);
    });

    it('should validate with empty params', () => {
        const params = {};
        const errors = validateParams(params);
        expect(errors).toHaveLength(0);
    });

    it('should validate _uuid', () => {
        const params = { ...validParams, _uuid: 'invalid-uuid' };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('_uuid'))).toBe(true);
    });

    it('should validate _id', () => {
        const params = { ...validParams, _id: 'not-a-number' };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('_id'))).toBe(true);
    });

    it('should validate _participant_id', () => {
        const params = { ...validParams, _participant_id: 'not-a-number' };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('_participant_id'))).toBe(true);
    });

    it('should validate accessCode', () => {
        const params = { ...validParams, accessCode: 123 };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('accessCode'))).toBe(true);
    });

    it('should validate assignedDate', () => {
        const params = { ...validParams, assignedDate: 'invalid-date' };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('assignedDate'))).toBe(true);
    });

    it('should validate contactPhoneNumber', () => {
        const params = { ...validParams, contactPhoneNumber: 12345 };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('contactPhoneNumber'))).toBe(true);
    });

    it('should validate helpContactPhoneNumber', () => {
        const params = { ...validParams, helpContactPhoneNumber: 12345 };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('helpContactPhoneNumber'))).toBe(true);
    });

    it('should validate contactEmail', () => {
        const params = { ...validParams, contactEmail: 123 };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('contactEmail'))).toBe(true);
    });

    it('should validate helpContactEmail', () => {
        const params = { ...validParams, helpContactEmail: {} };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('helpContactEmail'))).toBe(true);
    });

    it('should validate wouldLikeToParticipateInOtherSurveys', () => {
        const params = { ...validParams, wouldLikeToParticipateInOtherSurveys: 'not-a-boolean' };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('wouldLikeToParticipateInOtherSurveys'))).toBe(true);
    });

    it('should validate respondentComments', () => {
        const params = { ...validParams, respondentComments: 123 };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('respondentComments'))).toBe(true);
    });

    it('should validate interviewerComments', () => {
        const params = { ...validParams, interviewerComments: 123 };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('interviewerComments'))).toBe(true);
    });

    it('should validate auditorComments', () => {
        const params = { ...validParams, auditorComments: 123 };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('auditorComments'))).toBe(true);
    });

    it('should validate durationRange', () => {
        const params = { ...validParams, durationRange: 'not-a-number' };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('durationRange'))).toBe(true);
    });

    it('should validate durationRespondentEstimationMin', () => {
        const params = { ...validParams, durationRespondentEstimationMin: 'not-a-number' };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('durationRespondentEstimationMin'))).toBe(true);
    });

    it('should validate interestRange', () => {
        const params = { ...validParams, interestRange: 'not-a-number' };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('interestRange'))).toBe(true);
    });

    it('should validate difficultyRange', () => {
        const params = { ...validParams, difficultyRange: 'not-a-number' };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('difficultyRange'))).toBe(true);
    });

    it('should validate burdenRange', () => {
        const params = { ...validParams, burdenRange: 'not-a-number' };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('burdenRange'))).toBe(true);
    });

    it('should validate consideredAbandoningRange', () => {
        const params = { ...validParams, consideredAbandoningRange: 'invalid-value' };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('consideredAbandoningRange'))).toBe(true);
    });

    it('should validate acceptToBeContactedForHelp', () => {
        const params = { ...validParams, acceptToBeContactedForHelp: 'not-a-boolean' };
        const errors = validateParams(params);
        expect(errors.some((e) => e.message.includes('acceptToBeContactedForHelp'))).toBe(true);
    });

    it('should allow acceptToBeContactedForHelp to be undefined', () => {
        const params = { ...validParams };
        delete (params as any).acceptToBeContactedForHelp;
        const errors = validateParams(params);
        expect(errors).toHaveLength(0);
    });

    it ('should validate with valid paradata', () => {
        const params = {
            ...validParams,
            paradata: { startedAt: 123456789 }
        };
        const errors = validateParams(params);
        expect(errors).toHaveLength(0);
    });

});
