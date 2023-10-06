/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Uuidable } from './Uuidable';

/**
 * A specific survey for which a questionnaire is built. Can have single or multiple sample(s).
 */

type SurveyAttributes = {

    _uuid?: string;

    name: string;
    shortname: string;
    description?: string;
    startDate: Date;
    endDate: Date;

}

type ExtendedSurveyAttributes = SurveyAttributes & { [key: string]: any };

class Survey extends Uuidable {

    name: string;
    shortname: string;
    description?: string;
    startDate: Date;
    endDate: Date;

    constructor(params: SurveyAttributes | ExtendedSurveyAttributes) {

        super(params._uuid);

        this.name = params.name;
        this.shortname = params.shortname;
        this.description = params.description;
        this.startDate = params.startDate;
        this.endDate = params.endDate;

    }

}

export {
    Survey,
    SurveyAttributes,
    ExtendedSurveyAttributes
};
