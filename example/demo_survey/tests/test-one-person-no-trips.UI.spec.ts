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

// Test the home page
onePersonTestHelpers.completeHomePage(context);

// Test the household page
onePersonTestHelpers.completeHouseholdPage(context);

// Test the profile page
onePersonTestHelpers.completeProfilePage(context);

// Test the end page
onePersonTestHelpers.completeEndPage(context);

surveyTestHelpers.logout({ context });
