/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Uuidable } from './Uuidable';
import { Sample } from './Sample';
import { Survey } from './Survey';

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
