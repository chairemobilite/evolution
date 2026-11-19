import * as testHelpers from 'evolution-frontend/tests/ui-testing/testHelpers';

// These functions fill the trips sections (tripsIntro, visitedPlaces and segments) for the active person

const activeJourneyPath = 'household.persons.${activePersonId}.journeys.${activeJourneyId}';
const activeVisitedPlacePath = `${activeJourneyPath}.visitedPlaces.\${activeVisitedPlaceId}`;
const firstSegmentOfActiveTripPath = `${activeJourneyPath}.trips.\${activeTripId}.segments.\${segmentId[0]}`;

export type VisitedPlace = {
    activityCategory: string;
    // Only for places that are not home
    activity?: string;
    // Only for places that are not home, the place is then located on the map from its name
    name?: string;
    // Times are in seconds since midnight. The first place has no arrival time
    arrivalTime?: number;
    nextPlaceCategory: 'visitedAnotherPlace' | 'wentBackHome' | 'stayedThereUntilTheNextDay';
    // The last place has no departure time
    departureTime?: number;
};

// A trip with a single mode of transport. The `mode` is required when the `modePre` has many modes
export type Trip = { modePre: string; mode?: string } | { sameModeAsReverseTrip: true };

export function completeTripsIntroPage(
    context,
    { completionPercentage, departurePlaceType }: { completionPercentage: number; departurePlaceType: 'home' | 'other' }
) {
    testHelpers.sectionProgressBarTest({ context, sectionName: 'Trips introduction', completionPercentage });
    testHelpers.inputRadioTest({ context, path: `${activeJourneyPath}.departurePlaceType`, value: departurePlaceType });
    testHelpers.inputNextButtonTest({ context, text: 'Continue', nextPageUrl: '/survey/visitedPlaces' });
}

const fillVisitedPlace = (context, place: VisitedPlace) => {
    testHelpers.inputRadioTest({ context, path: `${activeVisitedPlacePath}.activityCategory`, value: place.activityCategory });
    if (place.activity !== undefined) {
        testHelpers.inputRadioTest({ context, path: `${activeVisitedPlacePath}.activity`, value: place.activity });
    }
    if (place.name !== undefined) {
        testHelpers.inputStringTest({ context, path: `${activeVisitedPlacePath}.name`, value: place.name });
        testHelpers.inputMapFindPlaceTest({ context, path: `${activeVisitedPlacePath}.geography` });
    }
    if (place.arrivalTime !== undefined) {
        testHelpers.inputSelectTest({
            context,
            path: `${activeVisitedPlacePath}.arrivalTime`,
            value: String(place.arrivalTime)
        });
    }
    testHelpers.inputRadioTest({
        context,
        path: `${activeVisitedPlacePath}.nextPlaceCategory`,
        value: place.nextPlaceCategory
    });
    if (place.departureTime !== undefined) {
        testHelpers.inputSelectTest({
            context,
            path: `${activeVisitedPlacePath}.departureTime`,
            value: String(place.departureTime)
        });
    }
    testHelpers.inputNextButtonTest({ context, text: 'Confirm', nextPageUrl: '/survey/visitedPlaces' });
};

export function completeVisitedPlacesPage(context, { visitedPlaces }: { visitedPlaces: VisitedPlace[] }) {
    visitedPlaces.forEach((place, index) => {
        fillVisitedPlace(context, place);
        // Wait for the next place to be active, otherwise the next tests may use the previous place
        if (index !== visitedPlaces.length - 1) {
            testHelpers.waitTextVisible({ context, text: `Location #${index + 2}` });
        }
    });
    testHelpers.inputNextButtonTest({
        context,
        text: 'Confirm locations and continue',
        nextPageUrl: '/survey/segments'
    });
}

export function completeSegmentsPage(context, { trips, nextPageUrl }: { trips: Trip[]; nextPageUrl: string }) {
    trips.forEach((trip, index) => {
        if ('sameModeAsReverseTrip' in trip) {
            // Wait for this trip to be active, otherwise the test may use the previous trip
            testHelpers.waitTextVisible({ context, text: 'Was it the same mode of transport used for the return home trip' });
            testHelpers.inputRadioTest({
                context,
                path: `${firstSegmentOfActiveTripPath}.sameModeAsReverseTrip`,
                value: 'true'
            });
        } else {
            if (index !== 0) {
                testHelpers.waitTextVisible({ context, text: 'Which mode of transport was used first?' });
            }
            testHelpers.inputRadioTest({ context, path: `${firstSegmentOfActiveTripPath}.modePre`, value: trip.modePre });
            if (trip.mode !== undefined) {
                testHelpers.inputRadioTest({ context, path: `${firstSegmentOfActiveTripPath}.mode`, value: trip.mode });
            }
            testHelpers.inputRadioTest({ context, path: `${firstSegmentOfActiveTripPath}.hasNextMode`, value: 'false' });
        }
        testHelpers.inputNextButtonTest({ context, text: 'Confirm this trip', nextPageUrl: '/survey/segments' });
    });
    testHelpers.inputNextButtonTest({ context, text: 'Confirm and continue', nextPageUrl });
}
