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

/* Test the survey's input widget to make sure that they accept only the right data and will not continue until then. */
surveyTestHelpers.startAndLoginAnonymously({ context, title: 'Démo', hasUser: false });

// Test the home page
testHelpers.tryToContinueWithInvalidInputs({ context, text: 'Save and continue', currentPageUrl: '/survey/home' , nextPageUrl: '/survey/householdMembers' });
testHelpers.inputStringInvalidValueTest({ context, path: 'household.carNumber', value: '14' });
testHelpers.inputStringTest({ context, path: 'home.postalCode', value: 'H1S1V77', expectedValue: 'H1S 1V7' }); // We check that the postal code doesn't accept characters past 6. This does not make the box invalid.
testHelpers.inputStringInvalidValueTest({ context, path: 'home.postalCode', value: 'H1S1V'}); // The space isn't added for codes with less than 6 characters
testHelpers.inputStringInvalidValueTest({ context, path: 'home.postalCode', value: '1H1S7V', expectedValue: '1H1 S7V' });
testHelpers.inputStringInvalidValueTest({ context, path: 'home.postalCode', value: 'H1D1F7', expectedValue: 'H1D 1F7' });

onePersonTestHelpers.completeHomePage(context);

// Test the household page
testHelpers.inputStringInvalidTypeTest({ context, path: 'household.persons.${personId[0]}.age', value: testHelpers.nonNumericString });
testHelpers.inputStringTest({ context, path: 'household.persons.${personId[0]}.age', value: '15' });
testHelpers.tryToContinueWithPopup({ context, text: 'Save and continue', currentPageUrl: '/survey/householdMembers' , nextPageUrl: '/survey/profile' });
testHelpers.inputStringTest({ context, path: 'household.persons.${personId[0]}.age', value: '30' });
testHelpers.tryToContinueWithInvalidInputs({ context, text: 'Save and continue', currentPageUrl: '/survey/householdMembers' , nextPageUrl: '/survey/profile' });

onePersonTestHelpers.completeHouseholdPage(context);

// Test the profile page
testHelpers.tryToContinueWithInvalidInputs({ context, text: 'Save and continue', currentPageUrl: '/survey/profile' , nextPageUrl: '/survey/end' });

onePersonTestHelpers.completeProfilePage(context);

// Test the end page
testHelpers.tryToContinueWithInvalidInputs({ context, text: 'Complete interview', currentPageUrl: '/survey/end' , nextPageUrl: '/survey/completed' });

onePersonTestHelpers.completeEndPage(context);


surveyTestHelpers.logout({ context });