/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { BaseInterview, BaseInterviewAttributes } from '../BaseInterview';
import { BaseHousehold, BaseHouseholdAttributes } from '../BaseHousehold';
import { BasePerson, BasePersonAttributes } from '../BasePerson';
import { BaseOrganization, BaseOrganizationAttributes } from '../BaseOrganization';
import { Survey } from '../Survey';
import { Sample } from '../Sample';
import { SurveyableAttributes } from '../Surveyable';

const validUUID = uuidV4();

describe('BaseInterview', () => {
    const surveyableAttributes: SurveyableAttributes = {
        survey: new Survey({ name: 'Survey name', shortname: 'survey_shortname', startDate: new Date('2023-10-01'), endDate: new Date('2023-10-31') }),
        sample: new Sample({ name: 'Sample name', shortname: 'sample_shortname' }),
        sampleBatchNumber: 123,
    };

    const baseHouseholdAttributes: BaseHouseholdAttributes = {
        _uuid: validUUID
    };

    const basePersonAttributes: BasePersonAttributes = {
        _uuid: validUUID
    };

    const baseOrganizationAttributes: BaseOrganizationAttributes = {
        _uuid: validUUID
    };

    const baseInterviewAttributes: BaseInterviewAttributes = {
        ...surveyableAttributes,
        _uuid: validUUID,
        accessCode: '0000-0000',
        baseHousehold: new BaseHousehold(baseHouseholdAttributes),
        basePerson: new BasePerson(basePersonAttributes),
        baseOrganization: new BaseOrganization(baseOrganizationAttributes),
        _startedAt: new Date('2023-10-05 02:34:55'),
        _updatedAt: new Date('2023-10-06 07:00:23'),
        _completedAt: new Date('2023-10-07 09:12:00'),
        assignedDate: new Date('2023-10-03'),
        contactPhoneNumber: '+1 514-999-9999',
        contactEmail: 'test@test.test',
        _language: 'en',
        _source: 'web',
        _isCompleted: true,
        _device: 'mobile',
    };

    it('should create a new BaseInterview instance', () => {
        const interview = new BaseInterview(baseInterviewAttributes);
        expect(interview).toBeInstanceOf(BaseInterview);
        expect(interview._uuid).toEqual(validUUID);
        expect(interview.accessCode).toEqual('0000-0000');
        expect(interview.baseHousehold).toBeInstanceOf(BaseHousehold);
        expect(interview.basePerson).toBeInstanceOf(BasePerson);
        expect(interview.baseOrganization).toBeInstanceOf(BaseOrganization);
        expect(interview._startedAt).toEqual(new Date('2023-10-05 02:34:55'));
        expect(interview._updatedAt).toEqual(new Date('2023-10-06 07:00:23'));
        expect(interview._completedAt).toEqual(new Date('2023-10-07 09:12:00'));
        expect(interview.assignedDate).toEqual(new Date('2023-10-03'));
        expect(interview.contactPhoneNumber).toEqual('+1 514-999-9999');
        expect(interview.contactEmail).toEqual('test@test.test');
        expect(interview._language).toEqual('en');
        expect(interview._source).toEqual('web');
        expect(interview._isCompleted).toEqual(true);
        expect(interview._device).toEqual('mobile');

    });

    it('should create a new BaseInterview instance with minimal attributes', () => {
        const minimalAttributes: BaseInterviewAttributes = {
            _uuid: validUUID,
            survey: surveyableAttributes.survey,
            sample: surveyableAttributes.sample,
        };

        const interview = new BaseInterview(minimalAttributes);
        expect(interview).toBeInstanceOf(BaseInterview);
        expect(interview._uuid).toEqual(validUUID);
        expect(interview.accessCode).toBeUndefined();
        expect(interview.baseHousehold).toBeUndefined();
        expect(interview.basePerson).toBeUndefined();
        expect(interview.baseOrganization).toBeUndefined();
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
            assignedDate: new Date(),
            baseHousehold: new BaseHousehold({ _uuid: uuidV4() }),
            basePerson: new BasePerson({ _uuid: uuidV4() }),
            baseOrganization: new BaseOrganization({ _uuid: uuidV4() }),
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
            _updatedAt: 122,
            assignedDate: -22.2,
            _completedAt: {},
            baseHousehold: 'invalid-household',
            basePerson: 'invalid-person',
            baseOrganization: 'invalid-organization',
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
            new Error('BaseInterview validateParams: invalid assignedDate'),
            new Error('BaseInterview validateParams: invalid _startedAt'),
            new Error('BaseInterview validateParams: invalid _completedAt'),
            new Error('BaseInterview validateParams: invalid _updatedAt'),
            new Error('BaseInterview validateParams: baseHousehold should be an instance of BaseHousehold'),
            new Error('BaseInterview validateParams: basePerson should be an instance of BasePerson'),
            new Error('BaseInterview validateParams: baseOrganization should be an instance of BaseOrganization'),
            new Error('BaseInterview validateParams: contactPhoneNumber should be a string'),
            new Error('BaseInterview validateParams: contactEmail should be a string'),
            new Error('BaseInterview validateParams: _device is invalid'),
        ]);
    });

});
