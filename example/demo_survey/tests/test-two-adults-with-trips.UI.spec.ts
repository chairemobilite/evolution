import { test } from '@playwright/test';
import * as testHelpers from 'evolution-frontend/tests/ui-testing/testHelpers';
import * as surveyTestHelpers from 'evolution-frontend/tests/ui-testing/surveyTestHelpers';
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
/* Test the survey with a two-adult household with trips: bob goes to work, alice goes shopping */
surveyTestHelpers.startAndLoginAnonymously({ context, title: 'Démo', hasUser: false });

// Test the home page
testHelpers.inputStringTest({ context, path: 'accessCode', value: '1111-2222' });
testHelpers.inputRadioTest({ context, path: 'household.size', value: '2' });
testHelpers.inputStringTest({ context, path: 'household.carNumber', value: '2' });
testHelpers.inputStringTest({ context, path: 'home.address', value: '7373 Langelier Bd' });
testHelpers.inputStringTest({ context, path: 'home.city', value: 'Montreal' });
testHelpers.inputStringTest({ context, path: 'home.region', value: 'Quebec' });
testHelpers.inputStringTest({ context, path: 'home.country', value: 'Canada' });
testHelpers.inputStringTest({ context, path: 'home.postalCode', value: 'H1S1V7', expectedValue: 'H1S 1V7' });
testHelpers.inputSelectTest({ context, path: 'home.dwellingType', value: 'tenantSingleDetachedHouse' });
testHelpers.inputMapFindPlaceTest({ context, path: 'home.geography' });
testHelpers.inputNextButtonTest({ context, text: 'Save and continue', nextPageUrl: '/survey/householdMembers' });

// Test the household page, the progress counts the sections of both persons
testHelpers.sectionProgressBarTest({ context, sectionName: 'Household members', completionPercentage: 8 });
// Data for the first person
testHelpers.inputStringTest({ context, path: 'household.persons.${personId[0]}.nickname', value: 'bob' });
testHelpers.inputStringTest({ context, path: 'household.persons.${personId[0]}.age', value: '30' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.gender', value: 'male' });
testHelpers.inputSelectTest({ context, path: 'household.persons.${personId[0]}.occupation', value: 'fullTimeWorker' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.drivingLicenseOwnership', value: 'no' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.transitPassOwner', value: 'no' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.bikesharingMember', value: 'yes' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.hasDisability', value: 'no' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.cellphoneOwner', value: 'yes' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.didTripsOnTripsDate', value: 'yes' });

// Data for the second person
testHelpers.inputStringTest({ context, path: 'household.persons.${personId[1]}.nickname', value: 'alice' });
testHelpers.inputStringTest({ context, path: 'household.persons.${personId[1]}.age', value: '60' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.gender', value: 'female' });
testHelpers.inputSelectTest({ context, path: 'household.persons.${personId[1]}.occupation', value: 'fullTimeWorker' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.drivingLicenseOwnership', value: 'yes' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.carsharingMember', value: 'yes' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.transitPassOwner', value: 'no' });
// Not a bikesharing member, so the trips by bicycle do not ask if it was a shared bicycle
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.bikesharingMember', value: 'no' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.hasDisability', value: 'no' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.cellphoneOwner', value: 'no' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.didTripsOnTripsDate', value: 'yes' });

// Go to next page, should skip selection section and go to bob's interview
testHelpers.inputNextButtonTest({ context, text: 'Save and continue', nextPageUrl: '/survey/profile' });
testHelpers.waitTextVisible({ context, text: 'bob\'s interview' });

// Test the profile page for the first person
testHelpers.sectionProgressBarTest({ context, sectionName: 'Profile', completionPercentage: 15 });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.workOnTheRoad', value: false });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.usualWorkPlaceIsHome', value: true });
testHelpers.inputNextButtonTest({ context, text: 'Save and continue', nextPageUrl: '/survey/tripsIntro' });

// Test the trips pages for the first person: home -> work -> home
tripsTestHelpers.completeTripsIntroPage(context, { completionPercentage: 23, departurePlaceType: 'home' });
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
tripsTestHelpers.completeSegmentsPage(context, {
    trips: [{ modePre: 'walk' }, { sameModeAsReverseTrip: true }],
    nextPageUrl: '/survey/travelBehavior'
});

// Test the travel behavior page for the first person
testHelpers.sectionProgressBarTest({ context, sectionName: 'Travel behavior', completionPercentage: 46 });
testHelpers.inputRadioTest({
    context,
    path: 'household.persons.${personId[0]}.whoAnsweredForThisPerson',
    value: '${personId[0]}'
});
testHelpers.inputNextButtonTest({ context, text: 'Continue', nextPageUrl: '/survey/profile' });
testHelpers.waitTextVisible({ context, text: 'alice\'s interview' });

// Test the profile page for the second person
testHelpers.sectionProgressBarTest({ context, sectionName: 'Profile', completionPercentage: 54 });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.workOnTheRoad', value: false });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.usualWorkPlaceIsHome', value: true });
testHelpers.inputNextButtonTest({ context, text: 'Save and continue', nextPageUrl: '/survey/tripsIntro' });

// Test the trips pages for the second person: home -> shopping -> home
tripsTestHelpers.completeTripsIntroPage(context, { completionPercentage: 62, departurePlaceType: 'home' });
tripsTestHelpers.completeVisitedPlacesPage(context, {
    visitedPlaces: [
        { activityCategory: 'home', nextPlaceCategory: 'visitedAnotherPlace', departureTime: 10 * 3600 },
        {
            activityCategory: 'shoppingServiceRestaurant',
            activity: 'shopping',
            name: 'Marche Jean-Talon',
            arrivalTime: 10.5 * 3600,
            nextPlaceCategory: 'wentBackHome',
            departureTime: 12 * 3600
        },
        { activityCategory: 'home', arrivalTime: 12.5 * 3600, nextPlaceCategory: 'stayedThereUntilTheNextDay' }
    ]
});
tripsTestHelpers.completeSegmentsPage(context, {
    trips: [{ modePre: 'bicycle', mode: 'bicycle' }, { sameModeAsReverseTrip: true }],
    nextPageUrl: '/survey/travelBehavior'
});

// Test the travel behavior page for the second person
testHelpers.sectionProgressBarTest({ context, sectionName: 'Travel behavior', completionPercentage: 85 });
testHelpers.inputRadioTest({
    context,
    path: 'household.persons.${personId[1]}.whoAnsweredForThisPerson',
    value: '${personId[0]}'
});
testHelpers.inputNextButtonTest({ context, text: 'Continue', nextPageUrl: '/survey/end' });

// Test the end page
testHelpers.sectionProgressBarTest({ context, sectionName: 'End', completionPercentage: 92 });
testHelpers.inputSelectTest({ context, path: 'household.residentialPhoneType', value: 'landLine' });
testHelpers.inputRadioTest({ context, path: 'household.didAlsoRespondByPhone', value: false });
testHelpers.inputRadioTest({ context, path: 'household.wouldLikeToParticipateInOtherSurveys', value: false });
testHelpers.inputSelectTest({ context, path: 'household.income', value: '060000_089999' });
testHelpers.inputRangeTest({
    context,
    path: 'perceivedBurden.difficultyRange',
    value: 75,
    sliderColor: 'green-yellow-red'
});
testHelpers.inputNextButtonTest({ context, text: 'Complete interview', nextPageUrl: '/survey/completed' });

surveyTestHelpers.logout({ context });
