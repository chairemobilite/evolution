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
export const startAndLoginAnonymously = ({ context, title, hasUser = true }: { title: string, hasUser: boolean } & testHelpers.CommonTestParameters) => {
    // Test the survey landing page
    testHelpers.hasTitleTest({ title, context });
    testHelpers.hasFrenchTest({ context });
    testHelpers.switchToEnglishTest({ context });
    testHelpers.hasConsentTest({ context });
    testHelpers.startSurveyTest({ context });
    
    // Test the login page
    testHelpers.registerWithoutEmailTest({ context });
    
    // Test the home section page
    if (hasUser) {
        testHelpers.hasUserTest({ context });
    }
}

export const logout = ({ context }: testHelpers.CommonTestParameters) => {
    // Test the survey logout page
    testHelpers.logoutTest({ context });
}
