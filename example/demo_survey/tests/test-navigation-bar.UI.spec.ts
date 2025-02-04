import { test } from '@playwright/test';
import * as testHelpers from 'evolution-frontend/tests/ui-testing/testHelpers';
import * as surveyTestHelpers from 'evolution-frontend/tests/ui-testing/surveyTestHelpers';
import * as onePersonTestHelpers from './test-one-person-helpers.ts';
import { SurveyObjectDetector } from 'evolution-frontend/tests/ui-testing/SurveyObjectDetectors';

const context = {
    page: null as any,
    objectDetector: new SurveyObjectDetector(),
    title: '',
    widgetTestCounters: {}
}

// Configure the tests to run in serial mode (one after the other)
test.describe.configure({ mode: 'serial' });

// Initialize the test page and add it to the context
test.beforeAll(async ({ browser }) => {
    context.page = await testHelpers.initializeTestPage(browser, context.objectDetector);
});

/* Test the survey with a one-person household */
surveyTestHelpers.startAndLoginAnonymously({ context, title: 'Démo', hasUser: false });

// Verify that the buttons have the expected class/colors and are disabled if we haven't been to the corresponding page yet.
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Home', buttonStatus: 'active', isDisabled: false });
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Your household', buttonStatus: 'inactive', isDisabled: true });
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Profile', buttonStatus: 'inactive', isDisabled: true });
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Trips', buttonStatus: 'inactive', isDisabled: true });
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'End', buttonStatus: 'inactive', isDisabled: true });

// Test the home page
onePersonTestHelpers.completeHomePage(context);

testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Home', buttonStatus: 'completed', isDisabled: false });
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Your household', buttonStatus: 'active', isDisabled: false });
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Profile', buttonStatus: 'inactive', isDisabled: true });
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Trips', buttonStatus: 'inactive', isDisabled: true });
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'End', buttonStatus: 'inactive', isDisabled: true });

// Input one widget to test with a page that is not empty but not complete either.
testHelpers.inputStringTest({ context, path: 'household.persons.${personId[0]}.age', value: '30' });

testHelpers.changePageFromNavBar({ context, buttonText: 'Home', nextPageUrl: '/survey/home' });

testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Home', buttonStatus: 'activeAndCompleted', isDisabled: false });
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Your household', buttonStatus: 'inactive', isDisabled: false });
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Profile', buttonStatus: 'inactive', isDisabled: true });
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Trips', buttonStatus: 'inactive', isDisabled: true });
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'End', buttonStatus: 'inactive', isDisabled: true });

testHelpers.changePageFromNavBar({ context, buttonText: 'Your household', nextPageUrl: '/survey/householdMembers' });

// Test the household page
onePersonTestHelpers.completeHouseholdPage(context);

// Test the profile page
onePersonTestHelpers.completeProfilePage(context);

testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Home', buttonStatus: 'completed', isDisabled: false });
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Your household', buttonStatus: 'completed', isDisabled: false });
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Profile', buttonStatus: 'completed', isDisabled: false });
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Trips', buttonStatus: 'completed', isDisabled: false });
testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'End', buttonStatus: 'active', isDisabled: false });

testHelpers.changePageFromNavBar({ context, buttonText: 'Home', nextPageUrl: '/survey/home' });
testHelpers.changePageFromNavBar({ context, buttonText: 'Your household', nextPageUrl: '/survey/householdMembers' });
// Since we are testing with no trips, the Trips button will redirect to the End page.
// As such, we switch the order with Profile so that we will not stay on the same URL when testing Trips and End
testHelpers.changePageFromNavBar({ context, buttonText: 'Trips', nextPageUrl: '/survey/end' });
testHelpers.changePageFromNavBar({ context, buttonText: 'Profile', nextPageUrl: '/survey/profile' });
testHelpers.changePageFromNavBar({ context, buttonText: 'End', nextPageUrl: '/survey/end' });

onePersonTestHelpers.completeEndPage(context);

testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'End', buttonStatus: 'activeAndCompleted', isDisabled: false });

surveyTestHelpers.logout({ context });