import {
    getPersonIds,
    inputNextButtonTest,
    inputRadioTest,
    inputSelectTest,
    inputStringTest,
    inputPopupButtonTest
} from 'evolution-frontend/tests/ui-testing/testHelpers';
import * as surveyTestHelpers from 'evolution-frontend/tests/ui-testing/surveyTestHelpers';

/* Test the survey with a one-person household */
surveyTestHelpers.startAndLoginAnonymously({ title: 'Démo' });

// Test the home page
inputStringTest({ path: 'accessCode', value: '1111-2222' });
inputRadioTest({ path: 'household.size', value: '2' });
inputStringTest({ path: 'household.carNumber', value: '2' });
inputStringTest({ path: 'home.address', value: '7373 Langelier Bd' });
inputStringTest({ path: 'home.city', value: 'Montreal' });
inputStringTest({ path: 'home.region', value: 'Quebec' });
inputStringTest({ path: 'home.country', value: 'Canada' });
inputStringTest({ path: 'home.postalCode', value: 'H1S1V7' });
//inputMapFindPlaceTest({ path: 'home.geography' });
inputSelectTest({ path: 'home.dwellingType', value: 'tenantSingleDetachedHouse' });
inputNextButtonTest({ text: 'Save and continue', nextPageUrl: '/survey/householdMembers' });

// Test the household page
// Data for the first person
inputStringTest({ path: 'household.persons.${personId[0]}.nickname', value: 'bob' });
inputStringTest({ path: 'household.persons.${personId[0]}.age', value: '30' });
inputRadioTest({ path: 'household.persons.${personId[0]}.gender', value: 'male' });
inputSelectTest({ path: 'household.persons.${personId[0]}.occupation', value: 'fullTimeWorker' });
inputRadioTest({ path: 'household.persons.${personId[0]}.drivingLicenseOwner', value: 'no' });
inputRadioTest({ path: 'household.persons.${personId[0]}.transitPassOwner', value: 'no' });
inputRadioTest({ path: 'household.persons.${personId[0]}.bikesharingMember', value: 'yes' });
inputRadioTest({ path: 'household.persons.${personId[0]}.hasDisability', value: 'no' });
inputRadioTest({ path: 'household.persons.${personId[0]}.cellphoneOwner', value: 'yes' });
inputRadioTest({ path: 'household.persons.${personId[0]}.didTripsOnTripsDate', value: 'no' });

// Data for the second person
inputStringTest({ path: 'household.persons.${personId[1]}.nickname', value: 'alice' });
inputStringTest({ path: 'household.persons.${personId[1]}.age', value: '60' });
inputRadioTest({ path: 'household.persons.${personId[1]}.gender', value: 'female' });
inputSelectTest({ path: 'household.persons.${personId[1]}.occupation', value: 'fullTimeWorker' });
inputRadioTest({ path: 'household.persons.${personId[1]}.drivingLicenseOwner', value: 'yes' });
inputRadioTest({ path: 'household.persons.${personId[1]}.carsharingMember', value: 'yes' });
inputRadioTest({ path: 'household.persons.${personId[1]}.transitPassOwner', value: 'no' });
inputRadioTest({ path: 'household.persons.${personId[1]}.bikesharingMember', value: 'yes' });
inputRadioTest({ path: 'household.persons.${personId[1]}.hasDisability', value: 'no' });
inputRadioTest({ path: 'household.persons.${personId[1]}.cellphoneOwner', value: 'no' });
inputRadioTest({ path: 'household.persons.${personId[1]}.didTripsOnTripsDate', value: 'no' });

// Go to next page
inputNextButtonTest({ text: 'Save and continue', nextPageUrl: '/survey/selectPerson' });

// Select the first person and continue
inputRadioTest({ path: '_activePersonId', value: '${personId[0]}' });
inputNextButtonTest({ text: 'Select this person and continue', nextPageUrl: '/survey/profile' });

// Test the profile page
inputRadioTest({ path: 'household.persons.${personId[0]}.workOnTheRoad', value: false });
inputRadioTest({ path: 'household.persons.${personId[0]}.usualWorkPlaceIsHome', value: true });
inputNextButtonTest({ text: 'Save and continue', nextPageUrl: '/survey/travelBehavior' });

// Test the travel behavior page for first person
inputRadioTest({ path: 'household.persons.${personId[0]}.whoAnsweredForThisPerson', value: '${personId[0]}' });
inputNextButtonTest({ text: 'Continue', nextPageUrl: '/survey/profile' });

// Test the profile for the second
inputPopupButtonTest({ text: 'Continue', popupText: 'If alice is available, she can come and continue the interview, or you can answer for her' });
inputRadioTest({ path: 'household.persons.${personId[1]}.workOnTheRoad', value: false });
inputRadioTest({ path: 'household.persons.${personId[1]}.usualWorkPlaceIsHome', value: true });
inputNextButtonTest({ text: 'Save and continue', nextPageUrl: '/survey/travelBehavior' });

// Second person is retired, straight to travel behavior for her too
inputRadioTest({ path: 'household.persons.${personId[1]}.whoAnsweredForThisPerson', value: '${personId[0]}' });
inputNextButtonTest({ text: 'Continue', nextPageUrl: '/survey/end' });

// Test the end page
inputSelectTest({ path: 'household.residentialPhoneType', value: 'landLine' });
inputRadioTest({ path: 'household.didAlsoRespondByPhone', value: false });
inputRadioTest({ path: 'household.wouldLikeToParticipateInOtherSurveys', value: false });
inputSelectTest({ path: 'household.income', value: '060000_089999' });
inputNextButtonTest({ text: 'Complete interview', nextPageUrl: '/survey/completed' });

surveyTestHelpers.logout();
