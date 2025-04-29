import { test } from '@playwright/test';
import * as testHelpers from 'evolution-frontend/tests/ui-testing/testHelpers';
import { SurveyObjectDetector } from 'evolution-frontend/tests/ui-testing/SurveyObjectDetectors';
import * as commonTestsHelpers from './common-tests-helpers';

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

// Complete landing page tests
commonTestsHelpers.completeLandingPageTests({ context });

// Complete login page tests
commonTestsHelpers.completeLoginPageTests({ context });

// Complete home section tests for a one-person household
commonTestsHelpers.completeHomeSectionTests({ context, householdSize: 1 });
