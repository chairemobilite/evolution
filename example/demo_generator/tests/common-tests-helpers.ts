import * as testHelpers from 'evolution-frontend/tests/ui-testing/testHelpers';

// Modify the CommonTestParameters type with survey parameters
export type CommonTestParametersModify = testHelpers.CommonTestParameters & {
    householdSize?: number;
    hasTrips?: boolean;
};

// Complete landing page tests
export const completeLandingPageTests = ({ context }: CommonTestParametersModify) => {
    testHelpers.hasTitleTest({ context, title: 'Household Travel Survey' });
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
    testHelpers.inputRadioTest({
        context,
        path: 'acceptToBeContactedForHelp',
        value: true
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
        path: 'homePhoneNumber',
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
        nextPageUrl: '/survey/householdMembers'
    });
};
