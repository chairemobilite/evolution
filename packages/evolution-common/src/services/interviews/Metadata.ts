/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { ResponseValue } from './ResponseValue';

/**
 * Type the metadata used for response objects (can include timestamps, respondent behaviour data, optinal information, etc.).
 * This data is usually not exported in standard exports, but can be in extended exports which are used to analyze respondent behaviour, interview progresses, etc.
 *
 * @export
 * @interface Metadata
 */
export type Metadata = {
    [metadataAttribute: string]: ResponseValue;
};
