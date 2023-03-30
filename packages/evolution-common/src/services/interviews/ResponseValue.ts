/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { SingleGeometry, SingleGeoFeature } from 'chaire-lib-common/lib/services/geodata/GeoJSONUtils';
import { ResponseObject } from '../interviewObjects/ResponseObject';

/**
 * Type the generic response value, which is any value associated with a widget path or specific question.
 * When possible, precise types should be used instead of this.
 *
 * @export
 * @interface ResponseValue
 */
export type ResponseValue =
    | number
    | string
    | boolean
    | number[]
    | string[]
    | boolean[]
    | SingleGeoFeature
    | GeoJSON.FeatureCollection<SingleGeometry>
    | { [attribute: string]: ResponseObject };
