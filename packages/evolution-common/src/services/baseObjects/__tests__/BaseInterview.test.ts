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
        baseHousehold: new BaseHousehold(baseHouseholdAttributes),
        basePerson: new BasePerson(basePersonAttributes),
        baseOrganization: new BaseOrganization(baseOrganizationAttributes),
        startedDate: new Date('2023-10-05'),
        startedTime: 36000, // 10 hours in seconds
        completedDate: new Date('2023-10-06'),
        completedTime: 72000, // 20 hours in seconds
    };

    it('should create a new BaseInterview instance', () => {
        const interview = new BaseInterview(baseInterviewAttributes);
        expect(interview).toBeInstanceOf(BaseInterview);
        expect(interview._uuid).toEqual(validUUID);
        expect(interview.baseHousehold).toBeInstanceOf(BaseHousehold);
        expect(interview.basePerson).toBeInstanceOf(BasePerson);
        expect(interview.baseOrganization).toBeInstanceOf(BaseOrganization);
        expect(interview.startedDate).toEqual(new Date('2023-10-05'));
        expect(interview.startedTime).toEqual(36000);
        expect(interview.completedDate).toEqual(new Date('2023-10-06'));
        expect(interview.completedTime).toEqual(72000);
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
        expect(interview.baseHousehold).toBeUndefined();
        expect(interview.basePerson).toBeUndefined();
        expect(interview.baseOrganization).toBeUndefined();
        expect(interview.startedDate).toBeUndefined();
        expect(interview.startedTime).toBeUndefined();
        expect(interview.completedDate).toBeUndefined();
        expect(interview.completedTime).toBeUndefined();
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
            startedDate: new Date(),
            startedTime: 3600,
            completedDate: new Date(),
            completedTime: 7200,
            baseHousehold: new BaseHousehold({ _uuid: uuidV4() }),
            basePerson: new BasePerson({ _uuid: uuidV4() }),
            baseOrganization: new BaseOrganization({ _uuid: uuidV4() }),
        };

        const validErrors = BaseInterview.validateParams(validParams);
        expect(validErrors).toEqual([]);

        const invalidParams = {
            _uuid: 'invalid-uuid',
            startedDate: 'invalid-date',
            startedTime: 'invalid-time',
            completedDate: 'invalid-date',
            completedTime: 'invalid-time',
            baseHousehold: 'invalid-household',
            basePerson: 'invalid-person',
            baseOrganization: 'invalid-organization',
        };

        const invalidErrors = BaseInterview.validateParams(invalidParams);
        expect(invalidErrors.length).toBeGreaterThan(0);
        expect(invalidErrors).toEqual([
            new Error('Uuidable validateParams: invalid uuid'),
            new Error('BaseInterview validateParams: invalid startedDate'),
            new Error('BaseInterview validateParams: startedTime should be a non-negative number'),
            new Error('BaseInterview validateParams: invalid completedDate'),
            new Error('BaseInterview validateParams: completedTime should be a non-negative number'),
            new Error('BaseInterview validateParams: baseHousehold should be an instance of BaseHousehold'),
            new Error('BaseInterview validateParams: basePerson should be an instance of BasePerson'),
            new Error('BaseInterview validateParams: baseOrganization should be an instance of BaseOrganization'),
        ]);
    });

});
