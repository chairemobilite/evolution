import { test } from '@playwright/test';
import * as testHelpers from 'evolution-frontend/tests/ui-testing/testHelpers';
import * as surveyTestHelpers from 'evolution-frontend/tests/ui-testing/surveyTestHelpers';
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
surveyTestHelpers.startAndLoginAnonymously({ context, title: 'Démo', hasUser: true });

// Test the home page
testHelpers.inputStringTest({ context, path: 'accessCode', value: '1111-2222' });
testHelpers.inputRadioTest({ context, path: 'household.size', value: '1' });
testHelpers.inputStringTest({ context, path: 'household.carNumber', value: '2' });
testHelpers.inputStringTest({ context, path: 'home.address', value: '7373 Langelier Bd' });
testHelpers.inputStringTest({ context, path: 'home.city', value: 'Montreal' });
testHelpers.inputStringTest({ context, path: 'home.region', value: 'Quebec' });
testHelpers.inputStringTest({ context, path: 'home.country', value: 'Canada' });
testHelpers.inputStringTest({ context, path: 'home.postalCode', value: 'H1S1V7' });
//testHelpers.inputMapFindPlaceTest({ context, path: 'home.geography' });
testHelpers.inputSelectTest({ context, path: 'home.dwellingType', value: 'tenantSingleDetachedHouse' });
testHelpers.inputNextButtonTest({ context, text: 'Save and continue', nextPageUrl: '/survey/householdMembers' });

// Test the household page
testHelpers.inputStringTest({ context, path: 'household.persons.${personId[0]}.age', value: '30' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.gender', value: 'male' });
testHelpers.inputSelectTest({ context, path: 'household.persons.${personId[0]}.occupation', value: 'fullTimeWorker' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.drivingLicenseOwner', value: 'no' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.transitPassOwner', value: 'no' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.bikesharingMember', value: 'yes' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.hasDisability', value: 'no' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.cellphoneOwner', value: 'yes' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.didTripsOnTripsDate', value: 'no' });
testHelpers.inputNextButtonTest({ context, text: 'Save and continue', nextPageUrl: '/survey/profile' });

// Test the profile page
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.workOnTheRoad', value: false });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.usualWorkPlaceIsHome', value: true });
testHelpers.inputNextButtonTest({ context, text: 'Save and continue', nextPageUrl: '/survey/end' });

// Test the end page
testHelpers.inputSelectTest({ context, path: 'household.residentialPhoneType', value: 'landLine' });
testHelpers.inputRadioTest({ context, path: 'household.didAlsoRespondByPhone', value: false });
testHelpers.inputRadioTest({ context, path: 'household.wouldLikeToParticipateInOtherSurveys', value: false });
testHelpers.inputSelectTest({ context, path: 'household.income', value: '060000_089999' });
testHelpers.inputNextButtonTest({ context, text: 'Complete interview', nextPageUrl: '/survey/completed' });

surveyTestHelpers.logout({ context });
