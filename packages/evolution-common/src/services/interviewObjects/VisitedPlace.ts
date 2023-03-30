/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Place } from './Place';

/**
 * A visited place is a place that is used as an origin or destination in a trip,
 * or as a usually visited place for a person or a household.
 *
 * @export
 * @interface VisitedPlace
 */
export type VisitedPlace<CustomVisitedPlace, CustomPlace> = Place<CustomPlace> & {
    personId: string; // uuid of a person
    householdId: string; // uuid of a household, if the place is shared between household members
    arrivalTime?: number; // in seconds since midnight
    departureTime?: number; // in seconds since midnight
} & CustomVisitedPlace;
