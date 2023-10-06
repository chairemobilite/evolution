/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { OptionalValidity, IValidatable } from './Validatable';
import { Surveyable, SurveyableAttributes } from './Surveyable';
import { BasePerson } from './BasePerson';
import { BaseHousehold } from './BaseHousehold';
import { BaseOrganization } from './BaseOrganization';

export type BaseInterviewAttributes = {

    _uuid?: string;
    startedDate?: Date;
    startedTime?: number; // secondsSinceMidnight
    completedDate?: Date;
    completedTime?: number; // secondsSinceMidnight

    baseHousehold?: BaseHousehold; // for household-based surveys
    basePerson?: BasePerson; // for person-based with no household data surveys
    baseOrganization?: BaseOrganization; // for organization-based surveys

} & SurveyableAttributes;

export type ExtendedInterviewAttributes = BaseInterviewAttributes & { [key: string]: any };

export class BaseInterview extends Surveyable implements IValidatable {

    _isValid: OptionalValidity;

    baseHousehold?: BaseHousehold;
    basePerson?: BasePerson;
    baseOrganization?: BaseOrganization;

    startedDate?: Date;
    startedTime?: number; // secondsSinceMidnight
    completedDate?: Date;
    completedTime?: number; // secondsSinceMidnight

    constructor(params: BaseInterviewAttributes | ExtendedInterviewAttributes) {

        super(params.survey, params.sample, params.sampleBatchNumber, params._uuid);

        this.baseHousehold = params.baseHousehold;
        this.basePerson = params.basePerson;
        this.baseOrganization = params.baseOrganization;

        this.startedDate = params.startedDate;
        this.startedTime = params.startedTime;
        this.completedDate = params.completedDate;
        this.completedTime = params.completedTime;

    }

    validate(): OptionalValidity {
        // TODO: implement:
        this._isValid = true;
        return true;
    }

    isValid(): OptionalValidity {
        return this._isValid;
    }

    /**
     * Factory that validates input from an interview and makes
     * sure types and required fields are valid before returning a new object
     * @param dirtyParams
     * @returns BaseInterview
     */
    static create(dirtyParams: { [key: string]: any }) {
        const allParamsValid = true;
        // validate types and required attributes
        // TODO: implement dirtyParams validation:
        const params: BaseInterviewAttributes = {
            sample: dirtyParams.sample,
            survey: dirtyParams.survey
        };
        if (allParamsValid === true) {
            return new BaseInterview(params);
        }
    }

    // TODO: methods to get started and completed date/time with any format using moment or DateTime

}
