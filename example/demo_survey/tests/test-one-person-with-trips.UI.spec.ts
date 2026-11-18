import { test } from '@playwright/test';
import * as testHelpers from 'evolution-frontend/tests/ui-testing/testHelpers';
import * as surveyTestHelpers from 'evolution-frontend/tests/ui-testing/surveyTestHelpers';
import * as onePersonTestHelpers from './test-one-person-helpers.ts';
import * as tripsTestHelpers from './test-trips-helpers.ts';
import { SurveyObjectDetector } from 'evolution-frontend/tests/ui-testing/SurveyObjectDetectors';

const context = {
    page: null as any,
    objectDetector: new SurveyObjectDetector(),
    title: '',
    widgetTestCounters: {}
};

// Configure the tests to run in serial mode (one after the other)
test.describe.configure({ mode: 'serial' });

// Initialize the test page and add it to the context
test.beforeAll(async ({ browser }) => {
    context.page = await testHelpers.initializeTestPage(browser, context.objectDetector);
});

/* Test the survey with a one-person household with trips: home -> work -> home */
surveyTestHelpers.startAndLoginAnonymously({ context, title: 'Démo', hasUser: false });

// Test the home page
onePersonTestHelpers.completeHomePage(context);

// Test the household page
onePersonTestHelpers.completeHouseholdPage(context, { didTripsOnTripsDate: 'yes' });

// Test the profile page
onePersonTestHelpers.completeProfilePage(context, { nextPageUrl: '/survey/tripsIntro' });

// Test the trips pages. The visited places and segments sections do not show the progress bar
tripsTestHelpers.completeTripsIntroPage(context, { completionPercentage: 38, departurePlaceType: 'home' });
tripsTestHelpers.completeVisitedPlacesPage(context, {
    visitedPlaces: [
        { activityCategory: 'home', nextPlaceCategory: 'visitedAnotherPlace', departureTime: 8 * 3600 },
        {
            activityCategory: 'work',
            activity: 'workNotUsual',
            name: 'Polytechnique Montreal',
            arrivalTime: 8.5 * 3600,
            nextPlaceCategory: 'wentBackHome',
            departureTime: 17 * 3600
        },
        { activityCategory: 'home', arrivalTime: 17.5 * 3600, nextPlaceCategory: 'stayedThereUntilTheNextDay' }
    ]
});
// The travel behavior section is skipped, as the person went to work
tripsTestHelpers.completeSegmentsPage(context, {
    trips: [{ modePre: 'walk' }, { sameModeAsReverseTrip: true }],
    nextPageUrl: '/survey/end'
});

// Test the end page
onePersonTestHelpers.completeEndPage(context);

// Test the completed page
onePersonTestHelpers.completeCompletedPage(context);

surveyTestHelpers.logout({ context });
