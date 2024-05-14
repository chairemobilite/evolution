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
export const startAndLoginAnonymously = ({ title, hasUser = true }) => {
    // Test the survey landing page
    testHelpers.hasTitleTest({ title });
    testHelpers.hasFrenchTest();
    testHelpers.switchToEnglishTest();
    testHelpers.hasConsentTest();
    testHelpers.startSurveyTest();
    
    // Test the login page
    testHelpers.registerWithoutEmailTest();
    
    // Test the home section page
    if (hasUser) {
        testHelpers.hasUserTest();
    }
}

export const logout = () => {
    // Test the survey logout page
    testHelpers.logoutTest();
}
