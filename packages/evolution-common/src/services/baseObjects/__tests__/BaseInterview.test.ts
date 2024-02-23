/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { BaseInterview, BaseInterviewAttributes } from '../BaseInterview';
import { Survey, SurveyAttributes } from '../Survey';
import { Sample, SampleAttributes } from '../Sample';
import { SurveyableAttributes } from '../Surveyable';

const validUUID = uuidV4();

describe('BaseInterview', () => {

    const surveyAttributes: SurveyAttributes = {
        name: 'Survey name',
        shortname: 'survey_shortname',
        startDate: '2023-10-01',
        endDate: '2023-10-31'
    };

    const sampleAttributes: SampleAttributes = {
        name: 'Sample name',
        shortname: 'sample_shortname'
    };

    const surveyableAttributes: SurveyableAttributes = {
        survey: new Survey(surveyAttributes),
        sample: new Sample(sampleAttributes),
        sampleBatchNumber: 123,
    };

    const interviewAttributes: BaseInterviewAttributes = {
        _uuid: validUUID,
        accessCode: '0000-0000',
        _startedAt: new Date('2023-10-05 02:34:55'),
        _updatedAt: new Date('2023-10-06 07:00:23'),
        _completedAt: '2023-10-07 09:12:00',
        assignedDate: '2023-10-03',
        contactPhoneNumber: '+1 514-999-9999',
        contactEmail: 'test@test.test',
        _language: 'en',
        _source: 'web',
        _isCompleted: true,
        _device: 'mobile'
    };
    const baseInterviewAttributes: BaseInterviewAttributes & SurveyableAttributes = {
        ...surveyableAttributes,
        ...interviewAttributes
    };

    it('should create a new BaseInterview instance', () => {
        const interview = new BaseInterview(baseInterviewAttributes);
        expect(interview).toBeInstanceOf(BaseInterview);
        expect(interview._uuid).toEqual(validUUID);
        expect(interview.accessCode).toEqual('0000-0000');
        expect(interview._startedAt).toEqual(new Date('2023-10-05 02:34:55'));
        expect(interview._updatedAt).toEqual(new Date('2023-10-06 07:00:23'));
        expect(interview._completedAt).toEqual(new Date('2023-10-07 09:12:00'));
        expect(interview.assignedDate).toEqual('2023-10-03');
        expect(interview.contactPhoneNumber).toEqual('+1 514-999-9999');
        expect(interview.contactEmail).toEqual('test@test.test');
        expect(interview._language).toEqual('en');
        expect(interview._source).toEqual('web');
        expect(interview._isCompleted).toEqual(true);
        expect(interview._device).toEqual('mobile');

    });

    it('should create a new BaseInterview instance with minimal attributes', () => {
        const minimalAttributes: BaseInterviewAttributes & SurveyableAttributes = {
            _uuid: validUUID,
            survey: surveyableAttributes.survey,
            sample: surveyableAttributes.sample,
        };

        const interview = new BaseInterview(minimalAttributes);
        expect(interview).toBeInstanceOf(BaseInterview);
        expect(interview._uuid).toEqual(validUUID);
        expect(interview.accessCode).toBeUndefined();
        expect(interview._startedAt).toBeUndefined();
        expect(interview._updatedAt).toBeUndefined();
        expect(interview._completedAt).toBeUndefined();
        expect(interview.assignedDate).toBeUndefined();
        expect(interview.contactPhoneNumber).toBeUndefined();
        expect(interview.contactEmail).toBeUndefined();
        expect(interview._language).toBeUndefined();
        expect(interview._source).toBeUndefined();
        expect(interview._isCompleted).toBeUndefined();
        expect(interview._device).toBeUndefined();

    });

    it('should validate a BaseInterview instance', () => {
        const interview = new BaseInterview(baseInterviewAttributes);
        expect(interview.isValid()).toBeUndefined();
        const validationResult = interview.validate();
        expect(validationResult).toBe(true);
        expect(interview.isValid()).toBe(true);
    });

    it('should validate params', () => {
        const validParams = {
            _uuid: uuidV4(),
            accessCode: '0000-0000',
            _startedAt: new Date(),
            _updatedAt: new Date(),
            _completedAt: new Date(),
            assignedDate: '2023-01-01',
            constactEmail: 'test@test.test',
            contactPhoneNumber: '514-999-9999 #999',
            _language: 'fr',
            _source: 'postal',
            _isCompleted: false,
            _device: 'unknown',
        };

        const validErrors = BaseInterview.validateParams(validParams);
        expect(validErrors).toEqual([]);

        const invalidParams = {
            _uuid: 'invalid-uuid',
            accessCode: {},
            _startedAt: 'invalid-date',
            _updatedAt: 'invalid-date',
            assignedDate: {},
            _completedAt: {},
            contactEmail: new Date(),
            contactPhoneNumber: Infinity,
            _language: 'aaa',
            _source: {},
            _isCompleted: 'true',
            _device: 'foo',
        };

        const invalidErrors = BaseInterview.validateParams(invalidParams);
        expect(invalidErrors.length).toBeGreaterThan(0);
        expect(invalidErrors).toEqual([
            new Error('Uuidable validateParams: invalid uuid'),
            new Error('BaseInterview validateParams: accessCode should be a string'),
            new Error('BaseInterview validateParams: _language should be a string of two letters'),
            new Error('BaseInterview validateParams: _source should be a string'),
            new Error('BaseInterview validateParams: _isCompleted should be a boolean'),
            new Error('BaseInterview validateParams: assignedDate should be a valid date string'),
            new Error('BaseInterview validateParams: invalid _startedAt'),
            new Error('BaseInterview validateParams: invalid _completedAt'),
            new Error('BaseInterview validateParams: invalid _updatedAt'),
            new Error('BaseInterview validateParams: contactPhoneNumber should be a string'),
            new Error('BaseInterview validateParams: contactEmail should be a string'),
            new Error('BaseInterview validateParams: _device is invalid'),
        ]);
    });

    it('should unserialize object', () => {
        const instance = BaseInterview.unserialize({
            ...interviewAttributes,
            sample: sampleAttributes,
            survey: surveyAttributes,
            sampleBatchNumber: 123
        });
        expect(instance).toBeInstanceOf(BaseInterview);
        expect(instance.accessCode).toEqual(baseInterviewAttributes.accessCode);
        expect(instance.survey).toBeInstanceOf(Survey);
        expect(instance.survey.name).toEqual(surveyAttributes.name);
        expect(instance.sample).toBeInstanceOf(Sample);
        expect(instance.sample.name).toEqual(sampleAttributes.name);
    });

});
