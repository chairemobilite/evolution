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
        survey: new Survey ({ name: 'Survey name', shortname: 'survey_shortname', startDate: new Date('2023-10-01'), endDate: new Date('2023-10-31') }),
        sample: new Sample ({ name: 'Sample name', shortname: 'sample_shortname' }),
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

});
