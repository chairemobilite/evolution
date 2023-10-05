/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Uuidable } from './Uuidable';
import { Sample } from './Sample';
import { Survey } from './Survey';

/**
 * Surveyable is a composition class for objects that can be associated with a survey
 * It includes both the survey object and the sample object, alongside the
 * sample batch number (lot number)
 */

export type SurveyableAttributes = {

    sample: Sample;
    survey: Survey;
    sampleBatchNumber?: number;

}

export class Surveyable extends Uuidable {

    sample: Sample;
    survey: Survey;
    sampleBatchNumber?: number;

    constructor(survey: Survey, sample: Sample, sampleBatchNumber?: number, _uuid?: string) {

        super(_uuid);
        this.sample = sample;
        this.survey = survey;
        this.sampleBatchNumber = sampleBatchNumber;

    }

}
