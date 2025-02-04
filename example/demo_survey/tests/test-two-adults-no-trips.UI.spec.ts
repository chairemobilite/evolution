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
surveyTestHelpers.startAndLoginAnonymously({ context, title: 'Démo', hasUser: false });

// Test the home page
testHelpers.inputStringTest({ context, path: 'accessCode', value: '1111-2222' });
testHelpers.inputRadioTest({ context, path: 'household.size', value: '2' });
testHelpers.inputStringTest({ context, path: 'household.carNumber', value: '2' });
testHelpers.inputStringTest({ context, path: 'home.address', value: '7373 Langelier Bd' });
testHelpers.inputStringTest({ context, path: 'home.city', value: 'Montreal' });
testHelpers.inputStringTest({ context, path: 'home.region', value: 'Quebec' });
testHelpers.inputStringTest({ context, path: 'home.country', value: 'Canada' });
testHelpers.inputStringTest({ context, path: 'home.postalCode', value: 'H1S1V7' });
//testHelpers.inputMapFindPlaceTest({ context, path: 'home.geography' });
testHelpers.inputSelectTest({ context, path: 'home.dwellingType', value: 'tenantSingleDetachedHouse' });
testHelpers.waitForMapToBeLoaded({ context });
testHelpers.inputNextButtonTest({ context, text: 'Save and continue', nextPageUrl: '/survey/householdMembers' });

// Test the household page
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
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.didTripsOnTripsDate', value: 'no' });

// Data for the second person
testHelpers.inputStringTest({ context, path: 'household.persons.${personId[1]}.nickname', value: 'alice' });
testHelpers.inputStringTest({ context, path: 'household.persons.${personId[1]}.age', value: '60' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.gender', value: 'female' });
testHelpers.inputSelectTest({ context, path: 'household.persons.${personId[1]}.occupation', value: 'fullTimeWorker' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.drivingLicenseOwnership', value: 'yes' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.carsharingMember', value: 'yes' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.transitPassOwner', value: 'no' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.bikesharingMember', value: 'yes' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.hasDisability', value: 'no' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.cellphoneOwner', value: 'no' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.didTripsOnTripsDate', value: 'no' });

// Go to next page
testHelpers.inputNextButtonTest({ context, text: 'Save and continue', nextPageUrl: '/survey/selectPerson' });

// Select the first person and continue
testHelpers.inputRadioTest({ context, path: '_activePersonId', value: '${personId[0]}' });
testHelpers.inputNextButtonTest({ context, text: 'Select this person and continue', nextPageUrl: '/survey/profile' });

// Test the profile page
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.workOnTheRoad', value: false });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.usualWorkPlaceIsHome', value: true });
testHelpers.inputNextButtonTest({ context, text: 'Save and continue', nextPageUrl: '/survey/travelBehavior' });

// Test the travel behavior page for first person
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.whoAnsweredForThisPerson', value: '${personId[0]}' });
testHelpers.inputNextButtonTest({ context, text: 'Continue', nextPageUrl: '/survey/profile' });

// Test the profile for the second
testHelpers.inputPopupButtonTest({ context, text: 'Continue', popupText: 'If alice is available, she can come and continue the interview, or you can answer for her' });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.workOnTheRoad', value: false });
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.usualWorkPlaceIsHome', value: true });
testHelpers.inputNextButtonTest({ context, text: 'Save and continue', nextPageUrl: '/survey/travelBehavior' });

// Second person is retired, straight to travel behavior for her too
testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.whoAnsweredForThisPerson', value: '${personId[0]}' });
testHelpers.inputNextButtonTest({ context, text: 'Continue', nextPageUrl: '/survey/end' });

// Test the end page
testHelpers.inputSelectTest({ context, path: 'household.residentialPhoneType', value: 'landLine' });
testHelpers.inputRadioTest({ context, path: 'household.didAlsoRespondByPhone', value: false });
testHelpers.inputRadioTest({ context, path: 'household.wouldLikeToParticipateInOtherSurveys', value: false });
testHelpers.inputSelectTest({ context, path: 'household.income', value: '060000_089999' });
testHelpers.inputNextButtonTest({ context, text: 'Complete interview', nextPageUrl: '/survey/completed' });

surveyTestHelpers.logout({ context });
