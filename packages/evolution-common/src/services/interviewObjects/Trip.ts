/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { ResponseObject } from './ResponseObject';
import { Segment } from './Segment';

/**
 * A trip has an origin and a destination, using modes (separated in segments)
 *
 * @export
 * @interface Trip
 */
export type Trip<CustomTrip, CustomSegment> = ResponseObject & {
    personId: string; // uuid of a person
    sequence: number; // the sequence of the trip in the whole journey/day/week/etc.
    departureTime?: number; // in seconds since midnight
    arrivalTime?: number; // in seconds since midnight
    originId: string; // uuid of a visited place
    destinationId: string; // uuid of a visited place
    segments?: {
        [segmentId: string]: Segment<CustomSegment>;
    };
} & CustomTrip;
