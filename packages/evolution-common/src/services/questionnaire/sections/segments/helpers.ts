/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _isEqual from 'lodash/isEqual';
import { isFeature, isPoint } from 'geojson-validation';
import * as odHelpers from '../../../odSurvey/helpers';
import { simpleModes, Mode, ModePre, modeValues, modePreValues, modeToModePreMap } from '../../../odSurvey/types';
import type { Optional } from '../../../../types/Optional.type';
import type {
    Journey,
    Person,
    Segment,
    SegmentSectionConfiguration,
    Trip,
    UserInterviewAttributes,
    WidgetConditional
} from '../../types';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

/**
 * Get the mode used in the single segment of the previous trip of the current
 * one
 *
 * @param {Object} options - The options object.
 * @param {Object} options.journey The journey object that these trips are part of
 * @param {Object} options.trip The current trip object
 * @returns If there is a single mode in the previous trip, return it, otherwise
 * undefined
 */
export const getPreviousTripSingleSegment = ({
    journey,
    trip
}: {
    journey: Journey;
    trip: Trip;
}): Optional<Segment> => {
    if (!journey || !trip) {
        return undefined;
    }
    const previousTrip = odHelpers.getPreviousTrip({ currentTrip: trip, journey });
    if (previousTrip) {
        const previousSegments = odHelpers.getSegmentsArray({ trip: previousTrip });
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
    const visitedPlaces = odHelpers.getVisitedPlaces({ journey });
    const origin = odHelpers.getOrigin({ trip, visitedPlaces });
    const destination = odHelpers.getDestination({ trip, visitedPlaces });
    const previousOrigin = odHelpers.getOrigin({ trip: previousTrip, visitedPlaces });

    // If origin or destination is not found, we cannot determine if it is a simple chain
    if (!origin || !destination || !previousOrigin) {
        return false;
    }

    // ignore loop/moving activities:
    if (odHelpers.isLoopActivity({ visitedPlace: origin }) || odHelpers.isLoopActivity({ visitedPlace: destination })) {
        return false;
    }
    // If the trip already has more than one segment, it is not a simple chain
    const segments = trip.segments || {};
    const segmentsArray = Object.values(segments);
    if (segmentsArray.length > 1) {
        return false;
    }

    const previousTripOriginGeography = odHelpers.getVisitedPlaceGeography({
        visitedPlace: previousOrigin,
        interview,
        person
    });
    const tripDestinationGeography = odHelpers.getVisitedPlaceGeography({
        visitedPlace: destination,
        interview,
        person
    });
    if (
        previousTripOriginGeography &&
        tripDestinationGeography &&
        tripDestinationGeography.geometry &&
        previousTripOriginGeography.geometry &&
        _isEqual(previousTripOriginGeography.geometry.coordinates, tripDestinationGeography.geometry.coordinates)
    ) {
        const previousTripSegmentsAsArray = odHelpers.getSegmentsArray({ trip: previousTrip });
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
    path
}: {
    interview: UserInterviewAttributes;
    path: string;
}): boolean => {
    const segmentContext = odHelpers.getSegmentContextFromPath({ interview, path });
    if (!segmentContext) {
        throw new Error('shouldShowSameAsReverseTripQuestion: segment context not found for path ' + path);
    }
    const { person, journey, trip, segment } = segmentContext;
    // Do not display if segment is not new
    if (segment._isNew === false) {
        return false;
    }
    // Display this question if the segment is new and the previous and current
    // trips form a simple chain with a single mode
    const previousTrip = odHelpers.getPreviousTrip({ currentTrip: trip, journey });
    return (
        previousTrip !== null && isSimpleChainSingleModeReturnTrip({ interview, journey, person, trip, previousTrip })
    );
};

export const conditionalPersonMayHaveDisability: WidgetConditional = (interview) => {
    const person = odHelpers.getActivePerson({ interview });
    const personMayHaveDisability = person ? odHelpers.personMayHaveDisability({ person: person as Person }) : true;
    return personMayHaveDisability;
};

export const conditionalHhMayHaveDisability: WidgetConditional = (interview) =>
    odHelpers.householdMayHaveDisability({ interview });

/**
 * Filter the available modes based on the segment section configuration.
 * If the section is enabled and modesIncludeOnly is set, keep only those modes in the order specified.
 * If the section is enabled and modesExclude is set, exclude those modes.
 */
export const getFilteredModes = (segmentConfig: SegmentSectionConfiguration): Mode[] => {
    if (segmentConfig.enabled === false) {
        return [] as unknown as Mode[];
    }

    if (segmentConfig.modesIncludeOnly) {
        // Keep only modes that exist in both modesIncludeOnly and modeValues, in the order specified in modesIncludeOnly
        return segmentConfig.modesIncludeOnly.filter((mode) => modeValues.includes(mode)) as Mode[];
    }

    if (segmentConfig.modesExclude) {
        // Exclude modes that are in modesExclude
        return modeValues.filter((mode) => !segmentConfig.modesExclude!.includes(mode)) as Mode[];
    }

    return modeValues as unknown as Mode[];
};

/**
 * Filter the available mode categories (modePre) based on the filtered modes.
 * Only keep modePre values that have at least one available mode.
 */
export const getFilteredModesPre = (availableModes: Mode[]): ModePre[] => {
    // Keep only modePre values that have at least one mode in the availableModes
    return modePreValues.filter((modePre) => {
        // Get all modes for this modePre from the reverse map
        const modesForThisModePre = Object.entries(modeToModePreMap)
            .filter(([_mode, modePres]) => modePres.includes(modePre))
            .map(([mode, _modePres]) => mode as Mode);

        // Check if at least one of these modes is in the availableModes
        return modesForThisModePre.some((mode) => availableModes.includes(mode));
    }) as ModePre[];
};

// Internal interface for various implementations of the segment next/previous
// locations, depending on the received configuration.
interface SegmentSectionHelpersImplementation {
    getSegmentPreviousLocation: (params: {
        segment: Segment;
        journey: Journey;
        trip: Trip;
        person: Person;
        interview: UserInterviewAttributes;
    }) => GeoJSON.Feature<GeoJSON.Point> | null;
    getSegmentNextLocation: (params: {
        segment: Segment;
        journey: Journey;
        trip: Trip;
        person: Person;
        interview: UserInterviewAttributes;
    }) => GeoJSON.Feature<GeoJSON.Point> | null;
    getCurrentSegmentOriginLocation: (param: { segment: Segment }) => GeoJSON.Feature<GeoJSON.Point> | null;
    getCurrentSegmentDestinationLocation: (param: { segment: Segment }) => GeoJSON.Feature<GeoJSON.Point> | null;
}

/**
 * Get the origin of a segment, as the origin of the trip it is part of. This
 * function can be used if we do not know of any other possible location during
 * segment entry.
 * @param options the argument
 * @param options.trip The trip the segment is part of
 * @param options.journey The journey the trip is part of
 * @returns
 */
const getTripOrigin = ({
    trip,
    journey,
    interview,
    person
}: {
    journey: Journey;
    trip: Trip;
    interview: UserInterviewAttributes;
    person: Person;
}): GeoJSON.Feature<GeoJSON.Point> | null => {
    const visitedPlaces = odHelpers.getVisitedPlaces({ journey });
    const origin = odHelpers.getOrigin({ trip, visitedPlaces });
    return origin !== null ? odHelpers.getVisitedPlaceGeography({ visitedPlace: origin, interview, person }) : null;
};

/**
 * Get the destination of a segment, as the destination of the trip it is part of.
 * This function can be used if we do not know of any other possible location during
 * segment entry.
 * @param options the argument
 * @param options.trip The trip the segment is part of
 * @param options.journey The journey the trip is part of
 * @returns
 */
const getTripDestination = ({
    trip,
    journey,
    interview,
    person
}: {
    journey: Journey;
    trip: Trip;
    interview: UserInterviewAttributes;
    person: Person;
}): GeoJSON.Feature<GeoJSON.Point> | null => {
    const visitedPlaces = odHelpers.getVisitedPlaces({ journey });
    const destination = odHelpers.getDestination({ trip, visitedPlaces });
    return destination !== null
        ? odHelpers.getVisitedPlaceGeography({ visitedPlace: destination, interview, person })
        : null;
};

class SegmentSectionHelpersWithFields implements SegmentSectionHelpersImplementation {
    private fieldsWithGeojsonPoint: Exclude<SegmentSectionConfiguration['fieldsWithGeojsonPoint'], undefined>;

    constructor(fieldsWithGeojsonPoint: Exclude<SegmentSectionConfiguration['fieldsWithGeojsonPoint'], undefined>) {
        this.fieldsWithGeojsonPoint = fieldsWithGeojsonPoint;
    }

    // Extract a geojson location from a segment based on a field description.
    private getLocationFromSegmentField = (
        segment: Segment,
        fieldDescription: Exclude<SegmentSectionConfiguration['fieldsWithGeojsonPoint'], undefined>[number]
    ): GeoJSON.Feature<GeoJSON.Point> | null => {
        if (_isBlank(segment[fieldDescription.fieldName])) {
            return null;
        }

        if (
            fieldDescription.type === 'point' &&
            isFeature(segment[fieldDescription.fieldName]) &&
            isPoint(segment[fieldDescription.fieldName].geometry)
        ) {
            return segment[fieldDescription.fieldName];
        } else if (fieldDescription.type === 'fromCollection') {
            // Find the corresponding value in the feature collection
            const location = fieldDescription.featureCollection.features.find(
                (feature) => feature.id === segment[fieldDescription.fieldName]
            );
            if (location) {
                return location;
            }
        }

        return null;
    };

    public getSegmentPreviousLocation({
        segment,
        trip,
        journey,
        person,
        interview
    }: {
        segment: Segment;
        journey: Journey;
        trip: Trip;
        person: Person;
        interview: UserInterviewAttributes;
    }): GeoJSON.Feature<GeoJSON.Point> | null {
        const segments = odHelpers.getSegmentsArray({ trip });
        const previousSegments = segments.slice(
            0,
            segments.findIndex((seg: Segment) => seg._sequence === segment._sequence)
        );

        for (let lookupIndex = previousSegments.length - 1; lookupIndex >= 0; lookupIndex--) {
            const segmentLookup = previousSegments[lookupIndex];
            const location = this.getCurrentSegmentDestinationLocation({ segment: segmentLookup });
            if (location) {
                return location;
            }
        }
        return getTripOrigin({ trip, journey, interview, person });
    }

    public getSegmentNextLocation({
        segment,
        trip,
        journey,
        person,
        interview
    }: {
        segment: Segment;
        journey: Journey;
        trip: Trip;
        person: Person;
        interview: UserInterviewAttributes;
    }): GeoJSON.Feature<GeoJSON.Point> | null {
        const segments = odHelpers.getSegmentsArray({ trip });
        const nextSegments = segments.slice(
            segments.findIndex((seg: Segment) => seg._sequence === segment._sequence) + 1
        );

        for (let lookupIndex = 0; lookupIndex < nextSegments.length; lookupIndex++) {
            const segmentLookup = nextSegments[lookupIndex];
            const location = this.getCurrentSegmentOriginLocation({ segment: segmentLookup });
            if (location) {
                return location;
            }
        }
        return getTripDestination({ trip, journey, person, interview });
    }

    public getCurrentSegmentOriginLocation({ segment }: { segment: Segment }): GeoJSON.Feature<GeoJSON.Point> | null {
        for (let keyIndex = 0; keyIndex < this.fieldsWithGeojsonPoint.length; keyIndex++) {
            const fieldDescription = this.fieldsWithGeojsonPoint[keyIndex];
            const location = this.getLocationFromSegmentField(segment, fieldDescription);
            if (location) {
                return location;
            }
        }
        return null;
    }

    public getCurrentSegmentDestinationLocation({
        segment
    }: {
        segment: Segment;
    }): GeoJSON.Feature<GeoJSON.Point> | null {
        for (let keyIndex = this.fieldsWithGeojsonPoint.length - 1; keyIndex >= 0; keyIndex--) {
            const fieldDescription = this.fieldsWithGeojsonPoint[keyIndex];
            const location = this.getLocationFromSegmentField(segment, fieldDescription);
            if (location) {
                return location;
            }
        }
        return null;
    }
}

class DefaultSegmentSectionHelpers implements SegmentSectionHelpersImplementation {
    public getSegmentPreviousLocation({
        trip,
        journey,
        person,
        interview
    }: {
        segment: Segment;
        journey: Journey;
        trip: Trip;
        person: Person;
        interview: UserInterviewAttributes;
    }): GeoJSON.Feature<GeoJSON.Point> | null {
        return getTripOrigin({ trip, journey, person, interview });
    }

    public getSegmentNextLocation({
        trip,
        journey,
        person,
        interview
    }: {
        segment: Segment;
        journey: Journey;
        trip: Trip;
        person: Person;
        interview: UserInterviewAttributes;
    }): GeoJSON.Feature<GeoJSON.Point> | null {
        return getTripDestination({ trip, journey, person, interview });
    }

    public getCurrentSegmentOriginLocation(): GeoJSON.Feature<GeoJSON.Point> | null {
        return null;
    }

    public getCurrentSegmentDestinationLocation(): GeoJSON.Feature<GeoJSON.Point> | null {
        return null;
    }
}

const defaultSegmentSectionHelpers = new DefaultSegmentSectionHelpers();

let segmentSectionHelpers: SegmentSectionHelpersImplementation = defaultSegmentSectionHelpers;

export const initializeSegmentSectionHelpers = (segmentConfig: SegmentSectionConfiguration): void => {
    // Set to use the helper with fieldsWithGeojsonPoint if it has length greater than 0
    const fieldsWithGeojsonPoint = segmentConfig.fieldsWithGeojsonPoint ?? [];
    segmentSectionHelpers =
        fieldsWithGeojsonPoint.length === 0
            ? defaultSegmentSectionHelpers
            : new SegmentSectionHelpersWithFields(fieldsWithGeojsonPoint);
};

/**
 * Get the previous known location before this segment. It excludes the current
 * segment's location, which can be obtained with the
 * {@link getCurrentSegmentOriginLocation} and
 * {@link getCurrentSegmentDestinationLocation}. It will lookup all previous
 * segments to see if there are any known location and falls back to the trip's
 * origin.
 * @param arg The argument object
 * @param arg.segment The reference segment from which to get the previous
 * location
 * @param arg.trip The trip this segment is part of
 * @param arg.journey The journey this trip is part of
 * @returns The segment's previous location before the current segment, or `null`
 * if no location available
 */
export const getSegmentPreviousLocation = ({
    segment,
    trip,
    journey,
    person,
    interview
}: {
    segment: Segment;
    journey: Journey;
    trip: Trip;
    person: Person;
    interview: UserInterviewAttributes;
}): GeoJSON.Feature<GeoJSON.Point> | null => {
    return segmentSectionHelpers.getSegmentPreviousLocation({ segment, trip, journey, person, interview });
};

/**
 * Get the previous known location after this segment. It excludes the current
 * segment's location, which can be obtained with the
 * {@link getCurrentSegmentOriginLocation} and
 * {@link getCurrentSegmentDestinationLocation}. It will lookup all next
 * segments to see if there are any known location and falls back to the trip's
 * destination.
 * @param arg The argument object
 * @param arg.segment The reference segment from which to get the next location
 * @param arg.trip The trip this segment is part of
 * @param arg.journey The journey this trip is part of
 * @returns The segment's next location after the current segment, or `null` if
 * no location available
 */
export const getSegmentNextLocation = ({
    segment,
    trip,
    journey,
    person,
    interview
}: {
    segment: Segment;
    journey: Journey;
    trip: Trip;
    person: Person;
    interview: UserInterviewAttributes;
}): GeoJSON.Feature<GeoJSON.Point> | null => {
    return segmentSectionHelpers.getSegmentNextLocation({ segment, trip, journey, person, interview });
};

/**
 * Get the current segment's origin location. It looks only at the current
 * segment and see if any geography field has a value to use as origin. It looks
 * up from first to last field.
 * @param arg The argument object
 * @param arg.segment The reference segment from which to get the next location
 * @returns The segment's origin if available, or `null` otherwise
 */
export const getCurrentSegmentOriginLocation = ({
    segment
}: {
    segment: Segment;
}): GeoJSON.Feature<GeoJSON.Point> | null => {
    return segmentSectionHelpers.getCurrentSegmentOriginLocation({ segment });
};

/**
 * Get the current segment's destination location. It looks only at the current
 * segment and see if any geography field has a value to use as destination. It
 * looks up from last to first field.
 * @param arg The argument object
 * @param arg.segment The reference segment from which to get the next location
 * @returns The segment's destination if available, or `null` otherwise
 */
export const getCurrentSegmentDestinationLocation = ({
    segment
}: {
    segment: Segment;
}): GeoJSON.Feature<GeoJSON.Point> | null => {
    return segmentSectionHelpers.getCurrentSegmentDestinationLocation({ segment });
};
