/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { Household } from 'evolution-common/lib/services/baseObjects/Household';
import type { Person } from 'evolution-common/lib/services/baseObjects/Person';
import type { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { getBirdDistanceMeters } from 'evolution-common/lib/utils/PhysicsUtils';

/** Same origin and destination, within this bird distance, count as the same place. From the 2023 prototype. */
const matchingTripMaxDistanceMeters = 100;

/** Departure and arrival are seconds since midnight and may differ by at most this many seconds. The date is ignored. */
const matchingTripMaxTimeDifferenceSeconds = 15 * 60;

const tripsOf = (person: Person): Trip[] => (person.journeys ?? []).flatMap((journey) => journey.trips ?? []);

const timeDifferenceSeconds = (left: number | undefined, right: number | undefined): number | undefined =>
    left !== undefined && right !== undefined ? Math.abs(left - right) : undefined;

/**
 * A single-mode car driver trip matches a passenger trip when the origin,
 * destination, departure and arrival are close enough.
 * A driver trip with more than one mode is ignored.
 * @param passengerTrip Single-mode trip declared as a car passenger
 * @param driverTrip Trip of the person identified as the driver
 */
const isMatchingCarDriverTrip = (passengerTrip: Trip, driverTrip: Trip): boolean => {
    if (!driverTrip.isSingleMode() || driverTrip.getModes()[0] !== 'carDriver') {
        return false;
    }
    const originDistanceMeters = getBirdDistanceMeters(passengerTrip.origin?.geography, driverTrip.origin?.geography);
    const destinationDistanceMeters = getBirdDistanceMeters(
        passengerTrip.destination?.geography,
        driverTrip.destination?.geography
    );
    const departureTimeDifferenceSeconds = timeDifferenceSeconds(passengerTrip.startTime, driverTrip.startTime);
    const arrivalTimeDifferenceSeconds = timeDifferenceSeconds(passengerTrip.endTime, driverTrip.endTime);

    return (
        originDistanceMeters !== undefined &&
        destinationDistanceMeters !== undefined &&
        originDistanceMeters <= matchingTripMaxDistanceMeters &&
        destinationDistanceMeters <= matchingTripMaxDistanceMeters &&
        departureTimeDifferenceSeconds !== undefined &&
        arrivalTimeDifferenceSeconds !== undefined &&
        departureTimeDifferenceSeconds <= matchingTripMaxTimeDifferenceSeconds &&
        arrivalTimeDifferenceSeconds <= matchingTripMaxTimeDifferenceSeconds
    );
};

/**
 * True when a household member has a single-mode car passenger trip of another
 * member who has no matching single-mode car driver trip.
 * A driver outside the household is ignored. A passenger trip with more than one
 * mode is ignored.
 *
 * TripFactory drops implicit walking before this check runs. A car driver or car passenger trip
 * with a walking segment is therefore a single-mode trip here. Trips that still have several
 * modes are left out; matching those is a separate check.
 * @param household Household whose members and trips are compared
 */
export const householdHasUnmatchedCarPassengerTrip = (household: Household): boolean => {
    for (const person of household.members ?? []) {
        for (const trip of tripsOf(person)) {
            if (!trip.isSingleMode() || trip.getModes()[0] !== 'carPassenger') {
                continue;
            }
            for (const segment of trip.segments ?? []) {
                if (segment.driverUuid === undefined) {
                    continue;
                }
                const driver = (household.members ?? []).find((member) => member._uuid === segment.driverUuid);
                if (
                    driver !== undefined &&
                    !tripsOf(driver).some((driverTrip) => isMatchingCarDriverTrip(trip, driverTrip))
                ) {
                    return true;
                }
            }
        }
    }
    return false;
};
