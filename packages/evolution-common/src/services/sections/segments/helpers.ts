/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _isEqual from 'lodash/isEqual';
import { Journey, Person, Segment, Trip, UserInterviewAttributes } from '../../interviews/interview';
import * as helper from '../../odSurvey/helpers';
import { loopActivities, simpleModes } from '../../odSurvey/types';
import { Optional } from '../../../types/Optional.type';

/**
 * Get the mode used in the single segment of the previous trip of the active
 * one
 *
 * @param {Object} options - The options object.
 * @param {Object} options.interview The interview object
 * @param {Object} options.person The person these trips belong to
 * @returns If there is a single mode in the previous trip, return it, otherwise
 * undefined
 */
export const getPreviousTripSingleSegment = ({
    interview,
    person
}: {
    interview: UserInterviewAttributes;
    person: Person;
}): Optional<Segment> => {
    const journey = helper.getActiveJourney({ interview, person });
    const trip = helper.getActiveTrip({ interview, journey });
    if (!journey || !trip) {
        return undefined;
    }
    const previousTrip = helper.getPreviousTrip({ currentTrip: trip, journey });
    if (previousTrip) {
        const previousSegments = helper.getSegmentsArray({ trip: previousTrip });
        if (previousSegments.length === 1) {
            const previousSegment = previousSegments[0];
            return previousSegment;
        }
    }
    return undefined;
};

/**
 * Return whether these 2 trips are part of a simple chain with a single mode,
 * ie the origin of the previous trip is the same as the destination of the trip
 * and there is only one segment in the previous trip that is one of the simple
 * modes.
 *
 * @param {Object} options - The options object.
 * @param {Trip} options.trip The potential return trip
 * @param {Trip} options.previousTrip The previous trip that can be part of the
 * chain
 * @param {Object} options.journey The journey object that these trips are part
 * of
 * @param {Object} options.interview The interview object
 * @param {Object} options.person The person these trips belong to
 * @returns Whether the `trip` is the return trip of a simple chain with simple
 * modes
 */
export const isSimpleChainSingleModeReturnTrip = ({
    trip,
    previousTrip,
    journey,
    interview,
    person
}: {
    trip: Trip;
    previousTrip: Trip;
    journey: Journey;
    interview: UserInterviewAttributes;
    person: Person;
}): boolean => {
    const visitedPlaces = helper.getVisitedPlaces({ journey });
    const origin = helper.getOrigin({ trip, visitedPlaces });
    const destination = helper.getDestination({ trip, visitedPlaces });
    const previousOrigin = helper.getOrigin({ trip: previousTrip, visitedPlaces });

    // If origin or destination is not found, we cannot determine if it is a simple chain
    if (!origin || !destination || !previousOrigin) {
        return false;
    }

    // ignore loop/moving activities:
    if (
        (origin.activity && loopActivities.includes(origin.activity)) ||
        (destination.activity && loopActivities.includes(destination.activity))
    ) {
        return false;
    }
    // If the trip already has more than one segment, it is not a simple chain
    const segments = trip.segments || {};
    const segmentsArray = Object.values(segments);
    if (segmentsArray.length > 1) {
        return false;
    }

    const previousTripOriginGeography = helper.getVisitedPlaceGeography({
        visitedPlace: previousOrigin,
        interview,
        person
    });
    const tripDestinationGeography = helper.getVisitedPlaceGeography({ visitedPlace: destination, interview, person });
    if (
        previousTripOriginGeography &&
        tripDestinationGeography &&
        tripDestinationGeography.geometry &&
        previousTripOriginGeography.geometry &&
        _isEqual(previousTripOriginGeography.geometry.coordinates, tripDestinationGeography.geometry.coordinates)
    ) {
        const previousTripSegmentsAsArray = helper.getSegmentsArray({ trip: previousTrip });
        if (
            previousTripSegmentsAsArray.length === 1 &&
            previousTripSegmentsAsArray[0].mode &&
            simpleModes.includes(previousTripSegmentsAsArray[0].mode)
        ) {
            // we have a simple chain with single simple mode
            return true;
        }
    }
    return false;
};

export const shouldShowSameAsReverseTripQuestion = ({
    interview,
    segment
}: {
    interview: UserInterviewAttributes;
    segment: Segment;
}): boolean => {
    // Do not display if segment is not new
    if (segment._isNew === false) {
        return false;
    }
    // Display this question if the segment is new and the previous and current
    // trips form a simple chain with a single mode
    const person = helper.getPerson({ interview }) as Person;
    const journey = helper.getActiveJourney({ interview, person }) as Journey;
    const trip = helper.getActiveTrip({ interview, journey });
    const previousTrip = trip !== null ? helper.getPreviousTrip({ currentTrip: trip, journey }) : null;
    return (
        trip !== null &&
        previousTrip !== null &&
        isSimpleChainSingleModeReturnTrip({ interview, journey, person, trip, previousTrip })
    );
};
