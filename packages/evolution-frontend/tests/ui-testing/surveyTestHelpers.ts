/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import * as testHelpers from './testHelpers';

/**
 * Test the survey's home page, login page, until the first section's page is
 * opened
 * @param {string} title - The title of the survey
 */
export const startAndLoginAnonymously = ({
    context,
    title,
    hasUser = true
}: { title: string; hasUser: boolean } & testHelpers.CommonTestParameters) => {
    startSurvey({ context, title });

    // Test the login page
    testHelpers.registerWithoutEmailTest({ context });

    // Test the home section page
    if (hasUser) {
        testHelpers.hasUserTest({ context });
    }
};

/**
 * Test the survey's landing page and start the survey.
 *
 * @param {Object} params - The parameters for starting and logging in.
 * @param {testHelpers.CommonTestParameters} params.context - The test context.
 * @param {string} params.title - The expected title of the survey landing page.
 */
export const startSurvey = ({
    context,
    title,
}: { title: string; } & testHelpers.CommonTestParameters) => {
    // Test the survey landing page
    testHelpers.hasTitleTest({ title, context });
    testHelpers.hasFrenchTest({ context });
    testHelpers.switchToEnglishTest({ context });
    testHelpers.hasConsentTest({ context });
    testHelpers.startSurveyTest({ context });
};

/**
 * Test the survey's home page, login page with access and postal codes, until
 * the first section's page is opened
 *
 * @param {Object} params - The parameters for starting and logging in.
 * @param {testHelpers.CommonTestParameters} params.context - The test context.
 * @param {string} params.title - The expected title of the survey landing page.
 * @param {string} params.accessCode - The access code to use for registration.
 * @param {string} params.accessCode - The access code to use for registration.
 * @param {boolean} [params.expectedToExist] - Whether the access code and postal
 * code are expected to exist in the database and thus login directly in the
 * interview. Defaults to true.
 * @param {string} params.nextPageUrl - The URL of the page to navigate to after
 * login.
 */
export const startAndLoginWithAccessAndPostalCodes = ({
    context,
    title,
    accessCode,
    postalCode,
    expectedToExist,
    nextPageUrl
}: { title: string; accessCode: string; postalCode: string; expectedToExist?: boolean; nextPageUrl?: string } & testHelpers.CommonTestParameters) => {
    startSurvey({ context, title });

    // Test the login page
    testHelpers.registerWithAccessPostalCodeTest({ context, postalCode, accessCode, expectedToExist, nextPageUrl });

};

/**
 * Starts a survey and logs in with an email.
 *
 * This function performs a series of tests on the survey landing page, including checking the title,
 * switching languages, and consenting to the survey. After navigating through the landing page,
 * it tests the login functionality by registering with an email.
 *
 * @param {Object} params - The parameters for starting and logging in.
 * @param {testHelpers.CommonTestParameters} params.context - The test context.
 * @param {string} params.title - The expected title of the survey landing page.
 * @param {string} params.email - The email address to use for registration.
 * @param {string} params.nextPageUrl - The URL of the page to navigate to after login.
 */
export const startAndLoginWithEmail = ({
    context,
    title,
    email,
    nextPageUrl
}: { title: string; email: string; nextPageUrl: string } & testHelpers.CommonTestParameters) => {
    startSurvey({ context, title });

    // Test the login page
    testHelpers.registerWithEmailTest({ context, email, nextPageUrl });
};

export const logout = ({ context }: testHelpers.CommonTestParameters) => {
    // Test the survey logout page
    testHelpers.logoutTest({ context });
};
