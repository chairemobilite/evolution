/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import * as testHelpers from 'evolution-frontend/tests/ui-testing/testHelpers';

// Modify the CommonTestParameters type with survey parameters
export type CommonTestParametersModify = testHelpers.CommonTestParameters & {
    householdSize?: number;
    hasTrips?: boolean;
};

// Complete landing page tests
export const completeLandingPageTests = ({ context }: CommonTestParametersModify) => {
    testHelpers.hasTitleTest({ context, title: 'Enquête sur les déplacements des ménages' });

    testHelpers.hasFrenchTest({ context });

    testHelpers.switchToEnglishTest({ context });

    testHelpers.hasConsentTest({ context });

    testHelpers.startSurveyTest({ context });
};

// Complete login page tests
export const completeLoginPageTests = ({ context }: CommonTestParametersModify) => {
    testHelpers.registerWithoutEmailTest({ context });
};

// Complete home section tests
export const completeHomeSectionTests = ({ context, householdSize }: CommonTestParametersModify) => {
    testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'Home', buttonStatus: 'active', isDisabled: false });

    testHelpers.sectionProgressBarTest({ context, sectionName: 'Home', completionPercentage: 0 });

    testHelpers.inputStringTest({ context, path: 'accessCode', value: '0000-0000' });

    testHelpers.inputRadioTest({
        context,
        path: 'acceptToBeContactedForHelp',
        value: 'yes'
    });

    testHelpers.waitTextVisible({
        context,
        text: 'Please enter the email or phone number to get in contact.'
    });

    testHelpers.inputStringTest({
        context,
        path: 'contactEmail',
        value: 'test@test.com'
    });

    testHelpers.inputStringTest({
        context,
        path: 'phoneNumber',
        value: '514-123-4567'
    });

    testHelpers.inputStringTest({
        context,
        path: 'home.address',
        value: '7373 Langelier Bd'
    });

    testHelpers.inputStringTest({
        context,
        path: 'home.city',
        value: 'Montreal'
    });

    testHelpers.inputStringTest({
        context,
        path: 'home.postalCode',
        value: 'H1S1V7'
    });

    testHelpers.inputMapFindPlaceTest({ context, path: 'home.geography' });

    testHelpers.inputRadioTest({
        context,
        path: 'household.size',
        value: String(householdSize)
    });

    testHelpers.inputRadioTest({
        context,
        path: 'household.carNumber',
        value: '1'
    });

    testHelpers.inputRadioTest({
        context,
        path: 'household.bicycleNumber',
        value: '1'
    });

    testHelpers.inputRadioTest({
        context,
        path: 'household.electricBicycleNumber',
        value: '1'
    });

    if (householdSize === 1) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.atLeastOnePersonWithDisability',
            isVisible: false
        });
    } else {
        testHelpers.inputRadioTest({
            context,
            path: 'household.atLeastOnePersonWithDisability',
            value: 'yes'
        });
    }

    testHelpers.inputNextButtonTest({
        context,
        text: 'Save and continue',
        nextPageUrl: '/survey/household'
    });

    testHelpers.verifyNavBarButtonStatus({
        context,
        buttonText: 'Home',
        buttonStatus: 'completed',
        isDisabled: false
    });
};

// Complete household section tests
export const completeHouseholdSectionTests = ({ context, householdSize = 1 }: CommonTestParametersModify) => {
    testHelpers.verifyNavBarButtonStatus({
        context,
        buttonText: 'Household',
        buttonStatus: 'active',
        isDisabled: false
    });

    testHelpers.sectionProgressBarTest({ context, sectionName: 'Household', completionPercentage: 50 });

    if (householdSize === 1) {
        testHelpers.waitTextVisible({ context, text: 'Please enter the following informations:' });
    }

    if (householdSize === 1) {
        testHelpers.inputVisibleTest({ context, path: 'household.persons.${personId[0]}.nickname', isVisible: false });
    } else {
        testHelpers.inputStringTest({ context, path: 'household.persons.${personId[0]}.nickname', value: 'John' });
    }

    testHelpers.inputStringTest({ context, path: 'household.persons.${personId[0]}.age', value: '33' });

    testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.gender', value: 'male' });

    testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.workerType', value: 'yesFullTime' });

    testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.studentType', value: 'yesPartTime' });

    testHelpers.inputVisibleTest({
        context,
        path: 'household.persons.${personId[0]}.occupation',
        isVisible: false
    });

    testHelpers.inputRadioTest({
        context,
        path: 'household.persons.${personId[0]}.drivingLicenseOwner',
        value: 'yes'
    });

    testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.carSharingMember', value: 'yes' });

    testHelpers.inputCheckboxTest({
        context,
        path: 'household.persons.${personId[0]}.transitFares',
        values: ['tickets']
    });

    testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.hasDisability', value: 'no' });

    testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.workLocationType', value: 'hybrid' });

    testHelpers.inputRadioTest({
        context,
        path: 'household.persons.${personId[0]}.schoolLocationType',
        value: 'hybrid'
    });

    testHelpers.inputStringTest({
        context,
        path: 'household.persons.${personId[0]}.usualWorkPlace.name',
        value: 'Polytechnique Montreal'
    });

    testHelpers.inputMapFindPlaceTest({
        context,
        path: 'household.persons.${personId[0]}.usualWorkPlace.geography'
    });

    testHelpers.inputStringTest({
        context,
        path: 'household.persons.${personId[0]}.usualSchoolPlace.name',
        value: 'Polytechnique Montreal'
    });

    testHelpers.inputMapFindPlaceTest({
        context,
        path: 'household.persons.${personId[0]}.usualSchoolPlace.geography'
    });

    testHelpers.inputCheckboxTest({
        context,
        path: 'household.persons.${personId[0]}.remoteWorkDays',
        values: ['monday', 'thursday', 'friday']
    });

    testHelpers.inputCheckboxTest({
        context,
        path: 'household.persons.${personId[0]}.travelToWorkDays',
        values: ['no']
    });

    testHelpers.inputCheckboxTest({
        context,
        path: 'household.persons.${personId[0]}.remoteStudyDays',
        values: ['monday', 'tuesday']
    });

    testHelpers.inputCheckboxTest({
        context,
        path: 'household.persons.${personId[0]}.travelToStudyDays',
        values: ['no']
    });

    if (householdSize >= 2) {
        // Add a second person
        testHelpers.inputStringTest({ context, path: 'household.persons.${personId[1]}.nickname', value: 'Martha' });

        testHelpers.inputStringTest({ context, path: 'household.persons.${personId[1]}.age', value: '29' });

        testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.gender', value: 'female' });

        testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.workerType', value: 'no' });

        testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.studentType', value: 'no' });

        testHelpers.inputRadioTest({
            context,
            path: 'household.persons.${personId[1]}.occupation',
            value: 'other'
        });

        testHelpers.inputRadioTest({
            context,
            path: 'household.persons.${personId[1]}.drivingLicenseOwner',
            value: 'no'
        });

        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${personId[1]}.carSharingMember',
            isVisible: false
        });

        testHelpers.inputCheckboxTest({
            context,
            path: 'household.persons.${personId[1]}.transitFares',
            values: ['no']
        });

        testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[1]}.hasDisability', value: 'no' });
    }

    testHelpers.inputNextButtonTest({
        context,
        text: 'Save and continue',
        nextPageUrl: '/survey/completed'
    });

    testHelpers.verifyNavBarButtonStatus({
        context,
        buttonText: 'Household',
        buttonStatus: 'completed',
        isDisabled: false
    });
};

// Complete completed section tests
export const completeCompletedSectionTests = ({ context  }: CommonTestParametersModify) => {
    testHelpers.sectionProgressBarTest({ context, sectionName: 'Survey completed', completionPercentage: 100 });

    testHelpers.waitTextVisible({
        context,
        text: 'We thank you for taking the time to fill out this survey. Your answers have been recorded. You can edit your answers by clicking on any of the sections in the menu at the top of the page.',
        isVisible: true
    });
};
