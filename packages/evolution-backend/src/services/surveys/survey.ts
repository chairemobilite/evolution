/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

export type SurveyAttributes = {
    id: number;
    uuid: string;
    shortname: string;
    start_date?: Date;
    end_date?: Date;
    config?: {
        [key: string]: string;
    };
};
