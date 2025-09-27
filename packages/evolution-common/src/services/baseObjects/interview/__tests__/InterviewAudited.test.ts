/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { InterviewAudited } from '../InterviewAudited';
import { Interview } from '../Interview';
import { Audit } from '../../../audits/types';

describe('InterviewAudited', () => {
    let interview: Interview;
    let interviewAudited: InterviewAudited;

    beforeEach(() => {
        // Create a mock Interview instance
        interview = new Interview({
            _uuid: '123e4567-e89b-12d3-a456-426614174000',
            accessCode: 'TEST123',
            assignedDate: '2023-05-01'
        }, { id: 1, participant_id: 1 } as any);

        // Create an InterviewAudited instance
        interviewAudited = new InterviewAudited({
            _interview: interview,
            _originalInterviewId: 1
        });
    });

    it('should create an InterviewAudited instance', () => {
        expect(interviewAudited).toBeInstanceOf(InterviewAudited);
    });

    it('should get and set isValid', () => {
        expect(interviewAudited.isValid()).toBeUndefined();
        interviewAudited.setIsValid(true);
        expect(interviewAudited.isValid()).toBe(true);
    });

    it('should get and set isCompleted', () => {
        expect(interviewAudited.isCompleted()).toBeUndefined();
        interviewAudited.setIsCompleted(true);
        expect(interviewAudited.isCompleted()).toBe(true);
    });

    it('should get and set isQuestionable', () => {
        expect(interviewAudited.isQuestionable()).toBeUndefined();
        interviewAudited.setIsQuestionable(false);
        expect(interviewAudited.isQuestionable()).toBe(false);
    });

    it('should return an empty array of audits initially', () => {
        expect(interviewAudited.getAudits()).toEqual([]);
    });

    it('should return the associated Interview instance', () => {
        expect(interviewAudited.getAuditedObject()).toBe(interview);
    });

    it('should get original interview id', () => {
        expect(interviewAudited.getOriginalInterviewId()).toBe(1);
    });

    it('should handle different flag combinations', () => {
        interviewAudited.setIsValid(true);
        interviewAudited.setIsCompleted(false);
        interviewAudited.setIsQuestionable(true);
        expect(interviewAudited.isValid()).toBe(true);
        expect(interviewAudited.isCompleted()).toBe(false);
        expect(interviewAudited.isQuestionable()).toBe(true);
    });

    describe('constructor with initial values', () => {
        it('should set initial values when provided', () => {
            const initialAudits: Audit[] = [{
                version: 1,
                level: 'error',
                errorCode: 'TEST_ERROR',
                message: 'Test error message'
            }];

            const auditedWithInitialValues = new InterviewAudited({
                _interview: interview,
                _originalInterviewId: 1,
                _isValid: true,
                _isCompleted: false,
                _isQuestionable: true,
                _audits: initialAudits
            });

            expect(auditedWithInitialValues.isValid()).toBe(true);
            expect(auditedWithInitialValues.isCompleted()).toBe(false);
            expect(auditedWithInitialValues.isQuestionable()).toBe(true);
            expect(auditedWithInitialValues.getAudits()).toEqual(initialAudits);
            expect(auditedWithInitialValues.getAuditedObject().accessCode).toEqual(interview.accessCode);
            expect(auditedWithInitialValues.getOriginalInterviewId()).toBe(1);
        });
    });

    // Test for IAuditable interface compliance
    it('should implement IAuditable interface', () => {
        expect(interviewAudited.isValid).toBeDefined();
        expect(interviewAudited.isCompleted).toBeDefined();
        expect(interviewAudited.isQuestionable).toBeDefined();
        expect(interviewAudited.setIsValid).toBeDefined();
        expect(interviewAudited.setIsCompleted).toBeDefined();
        expect(interviewAudited.setIsQuestionable).toBeDefined();
        expect(interviewAudited.getAudits).toBeDefined();
        expect(interviewAudited.getAuditedObject).toBeDefined();
        expect(interviewAudited.getOriginalInterviewId).toBeDefined();
    });

});

