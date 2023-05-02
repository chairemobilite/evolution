/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { ResponseObject } from './ResponseObject';

/**
 * A trip segment is a part of a trip using a single mode
 *
 * @export
 * @interface Segment
 */
export type Segment<CustomSegment> = ResponseObject & {
    tripId: string; // uuid of a trip
    sequence: number; // the sequence of the segment in the whole trip
    mode?: string; // TODO: type mode object
    modeCategory?: string; // TODO: type mode category object
} & CustomSegment;
