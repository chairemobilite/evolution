/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _isEqual from 'lodash/isEqual';
import { isFeature, isPoint } from 'geojson-validation';
import * as odHelpers from '../../../odSurvey/helpers';
import {
    simpleModes,
    Mode,
    modeValues,
    defaultModePreValues,
    defaultModeToModePreMap,
    defaultModePreToModeMap
} from '../../../odSurvey/types';
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
import { addGroupedObjects } from '../../../../utils/helpers';
import { getBirdDistanceMeters } from '../../../../utils/PhysicsUtils';

/**
 * Values to set to make a trip the active one of the segments section: the
 * active trip ID and, when the trip has no segment yet, an empty first segment,
 * so that its mode is asked directly instead of behind an add button.
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The interview
 * @param {Person} options.person The person the trip belongs to
 * @param {Journey} options.journey The journey the trip is part of
 * @param {Trip} options.trip The trip to activate
 * @param {boolean} [options.segmentsAreCleared] `true` when the same update
 * deletes the trip's segments, because its origin or destination changed. The
 * segments still on the interview are then to be considered absent.
 * @returns Values to merge into the interview update. The returned segment
 * paths must come after the caller's own deletions, as values are applied in
 * insertion order.
 */
export const getValuesByPathForActiveTrip = ({
    interview,
    person,
    journey,
    trip,
    segmentsAreCleared = false
}: {
    interview: UserInterviewAttributes;
    person: Person;
    journey: Journey;
    trip: Trip;
    segmentsAreCleared?: boolean;
}): { [path: string]: unknown } => {
    const valuesByPath: { [path: string]: unknown } = { 'response._activeTripId': trip._uuid };
    if (!segmentsAreCleared && odHelpers.getSegmentsArray({ trip }).length > 0) {
        return valuesByPath;
    }
    const segmentsPath = `household.persons.${person._uuid}.journeys.${journey._uuid}.trips.${trip._uuid}.segments`;
    const { valuesByPath: addedValuesByPath, newObjects } = addGroupedObjects(interview, 1, 1, segmentsPath, [
        { _isNew: true }
    ]);
    // Initialize the current trip's segments object. Keep only the new segment
    // from the addedValuesByPath: the other paths resequence the segments that
    // the caller deletes in the same update.
    const newSegmentPath = `${segmentsPath}.${newObjects[0]._uuid}`;
    valuesByPath[`response.${segmentsPath}`] = {
        [newObjects[0]._uuid]: addedValuesByPath[`response.${newSegmentPath}`]
    };
    valuesByPath[`validations.${newSegmentPath}`] = addedValuesByPath[`validations.${newSegmentPath}`];
    return valuesByPath;
};

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
        if (previousSegments.length === 1 && odHelpers.tripHasDefinedSegments({ trip: previousTrip })) {
            return previousSegments[0];
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

const getFilteredModesPreFromDefault = (availableModes: Mode[]) =>
    // Keep only modePre values that have at least one mode in the availableModes
    defaultModePreValues.filter((modePre) => {
        // Get all modes for this modePre from the reverse map
        const modesForThisModePre = Object.entries(defaultModeToModePreMap)
            .filter(([_mode, modePres]) => modePres.includes(modePre))
            .map(([mode, _modePres]) => mode as Mode);

        // Check if at least one of these modes is in the availableModes
        return modesForThisModePre.some((mode) => availableModes.includes(mode));
    });

const getFilteredModesPreFromConfig = (
    modeCategoryToModeMap: Exclude<SegmentSectionConfiguration['modeCategoryToModeMap'], undefined>,
    availableModes: Mode[]
) => {
    const modeToModePreMap = Object.entries(modeCategoryToModeMap).reduce((acc, [category, catDesc]) => {
        catDesc.modes.forEach((mode) => {
            if (!acc[mode]) {
                acc[mode] = [];
            }
            acc[mode].push(category);
        });
        return acc;
    }, {});
    // Make sure all available modes are configured in the category mapping
    const missingModes = availableModes.filter((mode) => !Object.keys(modeToModePreMap).includes(mode));
    if (missingModes.length > 0) {
        throw new Error('modeCategoryToModeMap: some modes are not part of any mapping: ' + missingModes.join(', '));
    }
    // Return only categories with available modes
    return Object.keys(modeCategoryToModeMap).filter((category) =>
        modeCategoryToModeMap[category].modes.some((mode) => availableModes.includes(mode))
    );
};

export const getModePreToModeMap = (sectionConfig: SegmentSectionConfiguration) =>
    sectionConfig.modeCategoryToModeMap === undefined
        ? defaultModePreToModeMap
        : Object.entries(sectionConfig.modeCategoryToModeMap).reduce((acc, [category, catDesc]) => {
            if (catDesc.modes.length > 0) {
                acc[category] = catDesc.modes;
            }
            return acc;
        }, {});

/**
 * Filter the available mode categories (modePre) based on the filtered modes.
 * Only keep modePre values that have at least one available mode.
 */
export const getFilteredModesPre = (sectionConfig: SegmentSectionConfiguration, availableModes: Mode[]): string[] => {
    if (sectionConfig.modeCategoryToModeMap) {
        return getFilteredModesPreFromConfig(sectionConfig.modeCategoryToModeMap, availableModes);
    } else {
        return getFilteredModesPreFromDefault(availableModes);
    }
};

type SegmentLocationGetterReturnType = GeoJSON.Feature<GeoJSON.Point> | null;
type SegmentLocationGetterWithUnknownReturnType = SegmentLocationGetterReturnType | 'unknown';
type SegmentLocationGetterParams = {
    segment: Segment;
    journey: Journey;
    trip: Trip;
    person: Person;
    interview: UserInterviewAttributes;
};
// Internal interface for various implementations of the segment next/previous
// locations, depending on the received configuration.
interface SegmentSectionHelpersImplementation {
    getSegmentPreviousLocation: (params: SegmentLocationGetterParams) => SegmentLocationGetterWithUnknownReturnType;
    getSegmentNextLocation: (params: SegmentLocationGetterParams) => SegmentLocationGetterWithUnknownReturnType;
    getSegmentPreviousKnownLocation: (params: SegmentLocationGetterParams) => SegmentLocationGetterReturnType;
    getSegmentNextKnownLocation: (params: SegmentLocationGetterParams) => SegmentLocationGetterReturnType;
    getCurrentSegmentOriginLocation: (param: { segment: Segment }) => SegmentLocationGetterWithUnknownReturnType;
    getCurrentSegmentDestinationLocation: (param: { segment: Segment }) => SegmentLocationGetterWithUnknownReturnType;
}

/**
 * Get the origin geography of a trip (the GeoJSON point of the origin
 * visited place). This can be used if we do not know of any other possible
 * location during segment entry.
 * @param options the argument
 * @param options.trip The trip the segment is part of
 * @param options.journey The journey the trip is part of
 * @returns The origin point, or null if the visited place has no geography
 */
const getTripOriginGeography = ({
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
 * Get the destination geography of a trip (the GeoJSON point of the destination
 * visited place). This can be used if we do not know of any other possible
 * location during segment entry.
 * @param options the argument
 * @param options.trip The trip the segment is part of
 * @param options.journey The journey the trip is part of
 * @returns The destination point, or null if the visited place has no geography
 */
const getTripDestinationGeography = ({
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

/**
 * Bird distance in meters between the trip origin and destination for a
 * segment widget path. Returns undefined when origin or destination geography
 * is missing.
 * @param interview current interview
 * @param path widget path under the trip (e.g. a segment mode path)
 */
export const getTripBirdDistanceMetersFromPath = (
    interview: UserInterviewAttributes,
    path: string
): number | undefined => {
    const tripContext = odHelpers.getTripContextFromPath({ interview, path });
    if (tripContext === null) {
        return undefined;
    }
    const origin = getTripOriginGeography({ ...tripContext, interview });
    const destination = getTripDestinationGeography({ ...tripContext, interview });
    return getBirdDistanceMeters(origin ?? undefined, destination ?? undefined);
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
    ): SegmentLocationGetterWithUnknownReturnType => {
        if (_isBlank(segment[fieldDescription.fieldName])) {
            return null;
        }

        if (
            fieldDescription.type === 'point' &&
            isFeature(segment[fieldDescription.fieldName]) &&
            isPoint(segment[fieldDescription.fieldName].geometry)
        ) {
            return segment[fieldDescription.fieldName];
        } else if (fieldDescription.type === 'fromCollection' && !_isBlank(segment[fieldDescription.fieldName])) {
            // Find the corresponding value in the feature collection
            const location = fieldDescription.featureCollection.features.find(
                (feature) => feature.id === segment[fieldDescription.fieldName]
            );
            if (location) {
                return location;
            }
            return 'unknown';
        }

        return null;
    };

    private getCurrentSegmentOriginLocationMayBeUnknown(
        { segment }: { segment: Segment },
        withUnknown: boolean
    ): SegmentLocationGetterWithUnknownReturnType {
        for (let keyIndex = 0; keyIndex < this.fieldsWithGeojsonPoint.length; keyIndex++) {
            const fieldDescription = this.fieldsWithGeojsonPoint[keyIndex];
            const location = this.getLocationFromSegmentField(segment, fieldDescription);
            if (location !== null && (withUnknown || location !== 'unknown')) {
                return location;
            }
        }
        return null;
    }

    private getCurrentSegmentDestinationLocationMayBeUnknown(
        {
            segment
        }: {
            segment: Segment;
        },
        withUnknown: boolean
    ): SegmentLocationGetterWithUnknownReturnType {
        for (let keyIndex = this.fieldsWithGeojsonPoint.length - 1; keyIndex >= 0; keyIndex--) {
            const fieldDescription = this.fieldsWithGeojsonPoint[keyIndex];
            const location = this.getLocationFromSegmentField(segment, fieldDescription);
            if (location !== null && (withUnknown || location !== 'unknown')) {
                return location;
            }
        }
        return null;
    }

    private getSegmentPreviousLocationMayBeUnknown(
        { segment, trip, journey, person, interview }: SegmentLocationGetterParams,
        withUnknown: boolean
    ): SegmentLocationGetterWithUnknownReturnType {
        const segments = odHelpers.getSegmentsArray({ trip });
        const previousSegments = segments.slice(
            0,
            segments.findIndex((seg: Segment) => seg._sequence === segment._sequence)
        );

        for (let lookupIndex = previousSegments.length - 1; lookupIndex >= 0; lookupIndex--) {
            const segmentLookup = previousSegments[lookupIndex];
            const location = this.getCurrentSegmentDestinationLocationMayBeUnknown(
                { segment: segmentLookup },
                withUnknown
            );
            if (location) {
                return location;
            }
        }
        return getTripOriginGeography({ trip, journey, interview, person });
    }

    private getSegmentNextLocationMayBeUnknown(
        { segment, trip, journey, person, interview }: SegmentLocationGetterParams,
        withUnknown: boolean
    ): SegmentLocationGetterWithUnknownReturnType {
        const segments = odHelpers.getSegmentsArray({ trip });
        const nextSegments = segments.slice(
            segments.findIndex((seg: Segment) => seg._sequence === segment._sequence) + 1
        );

        for (let lookupIndex = 0; lookupIndex < nextSegments.length; lookupIndex++) {
            const segmentLookup = nextSegments[lookupIndex];
            const location = this.getCurrentSegmentOriginLocationMayBeUnknown({ segment: segmentLookup }, withUnknown);
            if (location) {
                return location;
            }
        }
        return getTripDestinationGeography({ trip, journey, person, interview });
    }

    public getSegmentPreviousLocation(params: SegmentLocationGetterParams): SegmentLocationGetterWithUnknownReturnType {
        return this.getSegmentPreviousLocationMayBeUnknown(params, true);
    }

    public getSegmentNextLocation(params: SegmentLocationGetterParams): SegmentLocationGetterWithUnknownReturnType {
        return this.getSegmentNextLocationMayBeUnknown(params, true);
    }

    public getSegmentPreviousKnownLocation(params: SegmentLocationGetterParams): SegmentLocationGetterReturnType {
        return this.getSegmentPreviousLocationMayBeUnknown(params, false) as SegmentLocationGetterReturnType;
    }

    public getSegmentNextKnownLocation(params: SegmentLocationGetterParams): SegmentLocationGetterReturnType {
        return this.getSegmentNextLocationMayBeUnknown(params, false) as SegmentLocationGetterReturnType;
    }

    public getCurrentSegmentOriginLocation({
        segment
    }: {
        segment: Segment;
    }): SegmentLocationGetterWithUnknownReturnType {
        return this.getCurrentSegmentOriginLocationMayBeUnknown({ segment }, true);
    }

    public getCurrentSegmentDestinationLocation({
        segment
    }: {
        segment: Segment;
    }): SegmentLocationGetterWithUnknownReturnType {
        return this.getCurrentSegmentDestinationLocationMayBeUnknown({ segment }, true);
    }
}

class DefaultSegmentSectionHelpers implements SegmentSectionHelpersImplementation {
    public getSegmentPreviousLocation({
        trip,
        journey,
        person,
        interview
    }: SegmentLocationGetterParams): GeoJSON.Feature<GeoJSON.Point> | null {
        return getTripOriginGeography({ trip, journey, person, interview });
    }

    public getSegmentNextLocation({
        trip,
        journey,
        person,
        interview
    }: SegmentLocationGetterParams): GeoJSON.Feature<GeoJSON.Point> | null {
        return getTripDestinationGeography({ trip, journey, person, interview });
    }

    public getSegmentPreviousKnownLocation({
        trip,
        journey,
        person,
        interview
    }: SegmentLocationGetterParams): GeoJSON.Feature<GeoJSON.Point> | null {
        return getTripOriginGeography({ trip, journey, person, interview });
    }

    public getSegmentNextKnownLocation({
        trip,
        journey,
        person,
        interview
    }: SegmentLocationGetterParams): GeoJSON.Feature<GeoJSON.Point> | null {
        return getTripDestinationGeography({ trip, journey, person, interview });
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
 * Get the previous defined location before this segment. It excludes the current
 * segment's location, which can be obtained with the
 * {@link getCurrentSegmentOriginLocation} and
 * {@link getCurrentSegmentDestinationLocation}. It will lookup all previous
 * segments to see if there are any defined location and falls back to the trip's
 * origin. The previous location can be defined, but with unknown geography.
 *
 * @param arg The argument object
 * @param arg.segment The reference segment from which to get the previous
 * location
 * @param arg.trip The trip this segment is part of
 * @param arg.journey The journey this trip is part of
 * @returns The segment's previous location before the current segment,
 * 'unknown' if the segment has a previous location defined, but it is not
 * associated with an actual location, or `null` if no location available
 */
export const getSegmentPreviousLocation = ({
    segment,
    trip,
    journey,
    person,
    interview
}: SegmentLocationGetterParams): SegmentLocationGetterWithUnknownReturnType => {
    return segmentSectionHelpers.getSegmentPreviousLocation({ segment, trip, journey, person, interview });
};

/**
 * Get the next defined location after this segment. It excludes the current
 * segment's location, which can be obtained with the
 * {@link getCurrentSegmentOriginLocation} and
 * {@link getCurrentSegmentDestinationLocation}. It will lookup all next
 * segments to see if there are any defined location and falls back to the trip's
 * destination. The next destination can be defined, but with an unknown geography.
 *
 * @param arg The argument object
 * @param arg.segment The reference segment from which to get the next location
 * @param arg.trip The trip this segment is part of
 * @param arg.journey The journey this trip is part of
 * @returns The segment's next location after the current segment, 'unknown' if
 * the segment has a next location defined, but it is not associated with an
 * actual location, or `null` if no location available
 */
export const getSegmentNextLocation = ({
    segment,
    trip,
    journey,
    person,
    interview
}: SegmentLocationGetterParams): SegmentLocationGetterWithUnknownReturnType => {
    return segmentSectionHelpers.getSegmentNextLocation({ segment, trip, journey, person, interview });
};

/**
 * Get the previous known location before this segment. It excludes the current
 * segment's location, which can be obtained with the
 * {@link getCurrentSegmentOriginLocation} and
 * {@link getCurrentSegmentDestinationLocation}. It will lookup all previous
 * segments to see if there are any known location and falls back to the trip's
 * origin.
 *
 * @param arg The argument object
 * @param arg.segment The reference segment from which to get the previous
 * location
 * @param arg.trip The trip this segment is part of
 * @param arg.journey The journey this trip is part of
 * @returns The segment's previous location before the current segment,
 * or `null` if no location available
 */
export const getSegmentPreviousKnownLocation = ({
    segment,
    trip,
    journey,
    person,
    interview
}: SegmentLocationGetterParams): SegmentLocationGetterReturnType => {
    return segmentSectionHelpers.getSegmentPreviousKnownLocation({ segment, trip, journey, person, interview });
};

/**
 * Get the previous known location after this segment. It excludes the current
 * segment's location, which can be obtained with the
 * {@link getCurrentSegmentOriginLocation} and
 * {@link getCurrentSegmentDestinationLocation}. It will lookup all next
 * segments to see if there are any known location and falls back to the trip's
 * destination.
 *
 * @param arg The argument object
 * @param arg.segment The reference segment from which to get the next location
 * @param arg.trip The trip this segment is part of
 * @param arg.journey The journey this trip is part of
 * @returns The segment's next location after the current segment, or `null`
 * if no location available
 */
export const getSegmentNextKnownLocation = ({
    segment,
    trip,
    journey,
    person,
    interview
}: SegmentLocationGetterParams): SegmentLocationGetterReturnType => {
    return segmentSectionHelpers.getSegmentNextKnownLocation({ segment, trip, journey, person, interview });
};

/**
 * Get the current segment's origin location. It looks only at the current
 * segment and see if any geography field has a value to use as origin. It looks
 * up from first to last field.
 *
 * @param arg The argument object
 * @param arg.segment The reference segment from which to get the next location
 * @returns The segment's origin if available, 'unknown' if the segment has an
 * origin defined, but it is not associated with an actual location, or `null`
 * otherwise
 */
export const getCurrentSegmentOriginLocation = ({
    segment
}: {
    segment: Segment;
}): SegmentLocationGetterWithUnknownReturnType => {
    return segmentSectionHelpers.getCurrentSegmentOriginLocation({ segment });
};

/**
 * Get the current segment's destination location. It looks only at the current
 * segment and see if any geography field has a value to use as destination. It
 * looks up from last to first field.
 *
 * @param arg The argument object
 * @param arg.segment The reference segment from which to get the next location
 * @returns The segment's destination if available, 'unknown' if the segment has
 * a destination defined, but it is not associated with an actual location, or
 * `null` otherwise
 */
export const getCurrentSegmentDestinationLocation = ({
    segment
}: {
    segment: Segment;
}): SegmentLocationGetterWithUnknownReturnType => {
    return segmentSectionHelpers.getCurrentSegmentDestinationLocation({ segment });
};
