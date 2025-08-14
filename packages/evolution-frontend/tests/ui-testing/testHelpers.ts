/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import moment from 'moment';
// eslint-disable-next-line n/no-unpublished-import
import { test, expect, Page, Browser, Locator } from '@playwright/test';
import configureI18n, { registerTranslationDir } from './configurei18n';
import { SurveyObjectDetector } from './SurveyObjectDetectors';

if (process.env.LOCALE_DIR) {
    registerTranslationDir(process.env.LOCALE_DIR);
}

// Configure i18n for english and french language. The playwright test is not
// run in the browser context itself, so translations need to be manually loaded
// if we want to identify widgets by their texts.

// FIXME Let surveys define their own set of languages
const i18n = configureI18n(['en', 'fr']);

// String used to test inputs that only accept numbers
export const nonNumericString: string = 'A z*_/@,.';

// Types for the tests
export type CommonTestParameters = {
    context: {
        // The main test page
        page: Page;
        // The object detector for the current test
        objectDetector: SurveyObjectDetector;
        // Store a counter for test names, to avoid duplicate test names. We have many objects to test and they may result in identical test names.
        widgetTestCounters: { [testKey: string]: number };
    };
};
type Value = string;
type StringOrBoolean = string | boolean;
type Text = string;
type Url = string;
type Title = string;
type Path = string;
type Email = string;
type PathAndValue = { path: Path; value: Value };
type PathAndValueBoolOrStr = { path: Path; value: StringOrBoolean };
type HasTitleTest = (params: { title: Title } & CommonTestParameters) => void;
type HasFrenchTest = (params: CommonTestParameters) => void;
type SwitchToLanguageTest = (params: CommonTestParameters) => void;
type HasConsentTest = (params: CommonTestParameters) => void;
type StartSurveyTest = (params: CommonTestParameters & { nextUrl?: string }) => void;
type RegisterWithoutEmailTest = (params: CommonTestParameters) => void;
type RegisterWithEmailTest = (params: { email: Email; nextPageUrl?: Url } & CommonTestParameters) => void;
type RegisterWithAccessPostalCodeTest = (
    params: {
        accessCode: string;
        postalCode: string;
        expectedToExist?: boolean;
        nextPageUrl?: Url;
    } & CommonTestParameters
) => void;
type HasUserTest = (params: CommonTestParameters) => void;
type SimpleAction = (params: CommonTestParameters) => void;
type ContinueWithInvalidEntriesTest = (
    params: { text: Text; currentPageUrl: Url; nextPageUrl: Url } & CommonTestParameters
) => void;
type FetchGoogleMapsApiResponse = (params: {
    context: CommonTestParameters['context'];
    refreshButton: Locator;
}) => Promise<{ results: any[]; resultsNumber: number }>;
type InputRadioTest = (params: PathAndValueBoolOrStr & CommonTestParameters) => void | Promise<Locator>;
type InputSelectTest = (params: PathAndValue & CommonTestParameters) => void;
type InputStringTest = (params: PathAndValue & CommonTestParameters) => void | Promise<Locator>;
type InputRangeTest = (params: { path: Path; value: number; sliderColor?: string } & CommonTestParameters) => void;
type InputCheckboxTest = (params: { path: Path; values: Value[] } & CommonTestParameters) => void;
type InputMapFindPlaceTest = (params: { path: Path } & CommonTestParameters) => void;
type WaitForMapLoadedTest = (params: CommonTestParameters) => void;
type InputNextButtonTest = (params: { text: Text; nextPageUrl: Url } & CommonTestParameters) => void;
type InputPopupButtonTest = (params: { text: Text; popupText: Text } & CommonTestParameters) => void;
type RedirectionTest = (
    params: { buttonText: Text; expectedRedirectionUrl: Url; nextPageUrl: Url } & CommonTestParameters
) => void;
type NavBarButtonStatusTest = (
    params: {
        buttonText: Text;
        buttonStatus: 'completed' | 'active' | 'activeAndCompleted' | 'inactive';
        isDisabled: boolean;
    } & CommonTestParameters
) => void;
type ChangePageFromNavBarTest = (params: { buttonText: Text; nextPageUrl: Url } & CommonTestParameters) => void;
type SectionProgressBarTest = (
    params: { sectionName: string; completionPercentage: number } & CommonTestParameters
) => void;

/**
 * Open the browser before all the tests and go to the home page
 *
 * @param {Browser} browser - The test browser object
 * @param {SurveyObjectDetector} surveyObjectDetector - The object detector for
 * the test, to keep object data and IDs passed between client and server.
 * @param {Object} options - The options for the test.
 * @param {{ [param: string]: string} } options.urlSearchParams - Additional
 * parameters to add to the URL as query string question.
 * @param {boolean} options.ignoreHTTPSErrors - Whether to ignore HTTPS errors.
 * These can happen if running the tests on a remote server with HTTPs (for
 * example test instances)
 * @param {{[cookieName: string]: string}} options.cookies - The cookies to set
 */
export const initializeTestPage = async (
    browser: Browser,
    surveyObjectDetector: SurveyObjectDetector,
    options: {
        urlSearchParams?: { [param: string]: string };
        ignoreHTTPSErrors?: boolean;
        cookies?: { [cookieName: string]: string };
    } = {}
): Promise<Page> => {
    const context = await browser.newContext({ ignoreHTTPSErrors: options.ignoreHTTPSErrors === true });
    const page = await context.newPage();

    const baseUrlString = test.info().project.use.baseURL;
    const baseURL = typeof baseUrlString === 'string' ? new URL(baseUrlString) : new URL('http://localhost:8080');

    // Add cookies to the context, they have to be set at this point if they need to be present at the beginning of the app
    if (options.cookies) {
        const cookiesToSet = Object.entries(options.cookies).map(([name, value]) => ({
            name,
            value,
            domain: baseURL.hostname,
            path: '/',
            httpOnly: false,
            secure: false,
            sameSite: 'Lax' as const
        }));
        await context.addCookies(cookiesToSet);
    }

    // Add url search params if necessary
    if (options.urlSearchParams) {
        // Add the search params to the base URL
        Object.keys(options.urlSearchParams).forEach((param) => {
            baseURL.searchParams.append(param, options.urlSearchParams![param]);
        });
        await page.goto(baseURL.toString());
    } else {
        // Go to home page
        await page.goto('/');
    }

    page.on('request', (request) => {
        // Listen to requests to survey update to get the objects' uuid
        if (request.url().includes('survey/updateInterview')) {
            const postData = request.postData();
            if (postData === null) {
                return;
            }
            const data = JSON.parse(postData)['valuesByPath'];
            if (data === undefined) {
                return;
            }
            surveyObjectDetector.detectSurveyObjects(data);
        }
    });
    return page;
};

// Close the browser after all the tests
test.afterAll(async ({ browser }) => {
    await browser.close();
});

const getTestCounter = (context: CommonTestParameters['context'], testKey: string) => {
    const testIdx = context.widgetTestCounters[testKey] || 0;
    context.widgetTestCounters[testKey] = testIdx + 1;
    return context.widgetTestCounters[testKey];
};

// Click outside to remove focus, fake a click on the left of the screen, to avoid the page scrolling out of current viewport
const focusOut = async (page) => {
    const viewportSize = page.viewportSize();
    if (viewportSize === null) {
        return;
    }
    // Click on the left, halfway down the viewport
    await page.mouse.click(0, viewportSize.height / 2);
};

// Test if the page has a title
export const hasTitleTest: HasTitleTest = ({ context, title }) => {
    test(`Has title ${title} - ${getTestCounter(context, 'hasTitle')}`, async () => {
        await expect(context.page).toHaveTitle(title);
    });
};

// Test if the page has a french language
export const hasFrenchTest: HasFrenchTest = ({ context }) => {
    test(`Has French language - ${getTestCounter(context, 'hasFrenchLanguage')}`, async () => {
        const englishButton = context.page.getByRole('button', { name: 'English' });
        await expect(englishButton).toHaveText('English');
    });
};

/**
 * Test if the page can switch to English language.
 *
 * @param {Object} context - The test context.
 * @param {Object} context.page - The page object from the test context.
 */
export const switchToEnglishTest: SwitchToLanguageTest = ({ context }) => {
    test(`Switch to English language - ${getTestCounter(context, 'switchToEnglish')}`, async () => {
        const englishButton = context.page.getByRole('button', { name: 'English' });
        await englishButton.click();
        const frenchButton = context.page.getByRole('button', { name: 'Français' });
        await expect(frenchButton).toHaveText('Français');
    });
};

/**
 * Test if the page can switch to French language.
 *
 * @param {Object} context - The test context.
 * @param {Object} context.page - The page object from the test context.
 */
export const switchToFrenchTest: SwitchToLanguageTest = ({ context }) => {
    test(`Switch to French language - ${getTestCounter(context, 'switchToFrench')}`, async () => {
        const frenchButton = context.page.getByRole('button', { name: 'Français' });
        await frenchButton.click();
        const englishButton = context.page.getByRole('button', { name: 'English' });
        await expect(englishButton).toHaveText('English');
    });
};

// Test if the page has consent
export const hasConsentTest: HasConsentTest = ({ context }) => {
    test(`Has consent - ${getTestCounter(context, 'hasConsent')}`, async () => {
        const consentCheckbox = context.page.locator('id=surveyConsent');
        await consentCheckbox.click();
        await expect(consentCheckbox).toBeChecked();
    });
};

/**
 * Test if the page has a start survey button and navigates to the correct URL after clicking it.
 *
 * @param {Object} context - The test context.
 * @param {Object} context.page - The page object from the test context.
 * @param {string} [nextUrl] - The URL to navigate to after clicking the start survey button. Defaults to '/login'.
 */
export const startSurveyTest: StartSurveyTest = ({ context, nextUrl }) => {
    test(`Start survey - ${getTestCounter(context, 'startSurvey')}`, async () => {
        const startPage = nextUrl || '/login';
        const startSurvey = context.page.getByRole('button', {
            name: i18n.t(['survey:homepage:start', 'homepage:start']) as string
        });
        await startSurvey.click();
        await expect(context.page).toHaveURL(startPage);
    });
};

// Test if the page has a register without email button
export const registerWithoutEmailTest: RegisterWithoutEmailTest = ({ context }) => {
    test('Register without email', async () => {
        const registerWithoutEmail = context.page.getByRole('button', {
            name: i18n.t(['survey:auth:UseAnonymousLogin', 'auth:UseAnonymousLogin']) as string
        });
        await registerWithoutEmail.click();
        await expect(context.page).toHaveURL('/survey/home');
    });
};

/**
 * Executes a test to register a user with an email on a specific page.
 *
 * This function simulates a user entering an email address and clicking the confirm button to register.
 * It then waits for navigation to the specified nextPageUrl, verifying the registration process completes successfully.
 *
 * @param {Object} params - The parameters for the registration test.
 * @param {testHelpers.CommonTestParameters} params.context - The test context including the page object.
 * @param {string} params.email - The email address to use for registration.
 * @param {string} [params.nextPageUrl='/survey/home'] - The URL to navigate to after registration, defaults to '/survey/home'.
 */
export const registerWithEmailTest: RegisterWithEmailTest = ({ context, email, nextPageUrl = '/survey/home' }) => {
    test('Register with email', async () => {
        const emailInput = context.page.locator('id=email');
        const confirmButton = context.page.getByRole('button', {
            name: i18n.t(['survey:auth:Login', 'auth:Login']) as string
        });

        await emailInput.fill(email);
        await confirmButton.click();
        await expect(context.page).toHaveURL(nextPageUrl, { timeout: 30000 }); // Wait for the page to load
    });
};

/**
 * Executes a test to register a user from an access code and postal code. The
 * combination may or may not exist in the database. If it does not, it
 * validates that the checkbox appears to confirm the combination.
 *
 * It then waits for navigation to the specified nextPageUrl, verifying the
 * registration process completes successfully.
 *
 * @param {Object} params - The parameters for the registration test.
 * @param {testHelpers.CommonTestParameters} params.context - The test context
 * including the page object.
 * @param {string} params.accessCode - The access code to use for registration.
 * @param {string} params.postalCode - The postal code to use for registration.
 * @param {boolean} [params.expectedToExist] - Whether the access code and postal
 * code are expected to exist in the database and thus login directly in the
 * interview. Defaults to true.
 * @param {string} [params.nextPageUrl='/survey/home'] - The URL to navigate to
 * after registration, defaults to '/survey/home'.
 */
export const registerWithAccessPostalCodeTest: RegisterWithAccessPostalCodeTest = ({
    context,
    accessCode,
    postalCode,
    expectedToExist = true,
    nextPageUrl = '/survey/home'
}) => {
    test(`Register with access and postal codes - ${getTestCounter(context, 'registerWithAccessPostalCodeTest')}`, async () => {
        const accessCodeInput = context.page.locator('id=accessCode');
        const postalCodeInput = context.page.locator('id=postalCode');
        const confirmButton = context.page.getByRole('button', {
            name: i18n.t(['survey:auth:Login', 'auth:Login']) as string
        });

        await accessCodeInput.fill(accessCode);
        await postalCodeInput.fill(postalCode);
        await confirmButton.click();

        // If the access code and postal code combination does not exist, it should remain on the page, with a warning message and checkbox
        if (!expectedToExist) {
            // Click on the captcha
            await solveCaptcha({ context });

            const warningMessage = context.page.locator('id=confirmCredentials');
            await warningMessage.click();
            await confirmButton.click();
        }

        await expect(context.page).toHaveURL(nextPageUrl, { timeout: 30000 }); // Wait for the page to load
    });
};

// Test if the page has a logout button
export const logoutTest: SimpleAction = ({ context }) => {
    test(`Logout from survey - ${getTestCounter(context, 'loginSurvey')}`, async () => {
        const logoutButton = context.page.getByRole('button', {
            name: i18n.t(['survey:auth:Logout', 'auth:Logout']) as string
        });
        await logoutButton.click();
        await expect(context.page).toHaveURL('/');
    });
};

// Test if the page has a user
export const hasUserTest: HasUserTest = ({ context }) => {
    test('Has anonym user', async () => {
        const userName = context.page.getByRole('button', { name: /anonym_.*/ });
        await expect(userName).toHaveText(/anonym_.*/);
    });
};

// Click a particular option in a radio widget, and return the locator for that radio input.
const inputRadio: InputRadioTest = async ({ context, path, value }): Promise<Locator> => {
    const newPath = context.objectDetector.replaceWithIds(path);
    const newValue = typeof value === 'string' ? context.objectDetector.replaceWithIds(value) : value;
    const radio = context.page.locator(`id=survey-question__${newPath}_${newValue}__input-radio__${newValue}`);
    await radio.scrollIntoViewIfNeeded();
    await radio.click();
    await expect(radio).toBeChecked();
    await focusOut(context.page);
    return radio;
};

// Test input radio widget
export const inputRadioTest: InputRadioTest = ({ context, path, value }) => {
    test(`Check ${value} for ${path} - ${getTestCounter(context, `${path} - ${value}`)}`, async () => {
        await inputRadio({ context, path, value });
    });
};

// Test input radio widget with invalid answer
export const inputRadioInvalidTest: InputRadioTest = ({ context, path, value }) => {
    test(`Input radion value ${value} for ${path} and check that it is invalid - ${getTestCounter(context, `${path} - ${value}`)}`, async () => {
        const radioLocator = (await inputRadio({ context, path, value })) as Locator;
        // Filter is used to find parent container instead of locator(".."), as not all input fields are located at the same depth inside their question container
        const questionContainer = context.page
            .locator('//div[contains(@class, \'form-container\')]')
            .filter({ has: radioLocator });
        await expect(questionContainer).toHaveClass(/question-filled question-invalid/);
    });
};

/**
 * Validates the presence of options for a specific radio input question.
 *
 * @param {Object} options - The options for the test.
 * @param {string} options.path - The path of the radio input question.
 * @param {string[]} options.options - The expected options for the radio input
 * question.
 */
export const expectInputRadioOptionsTest = ({
    context,
    path,
    options
}: { path: Path; options: string[] } & CommonTestParameters) => {
    test(`Validate presence of radio options for ${path} - ${getTestCounter(
        context,
        `${path} - options`
    )}`, async () => {
        const newPath = context.objectDetector.replaceWithIds(path);

        // Find the first option and make sure it exists
        const resolvedOptions = options.map((option) =>
            typeof option === 'string' ? context.objectDetector.replaceWithIds(option) : option
        );
        const firstRadioOption = context.page.locator(
            `id=survey-question__${newPath}_${resolvedOptions[0]}__input-radio__${resolvedOptions[0]}`
        );
        await expect(firstRadioOption).toBeVisible();

        // Find the radio options container (3 levels higher up)
        const radioOptionsContainer = firstRadioOption.locator('..').locator('..').locator('..');

        // Make sure all the radio options exist
        for (const option of resolvedOptions) {
            const radioOption = radioOptionsContainer.locator(
                `id=survey-question__${newPath}_${option}__input-radio__${option}`
            );
            await expect(radioOption, `Missing radio option: ${option}`).toBeVisible();
        }

        // Make sure the options present are the only ones.
        // Check with their values instead of count, to give a better error message in case of failure
        const radioOptions = await radioOptionsContainer.locator('input[type="radio"]').all();
        for (const radioOption of radioOptions) {
            const radioOptionId = await radioOption.getAttribute('id');
            expect(radioOptionId).not.toBeNull();
            const optionValue = (radioOptionId as string).split('__')[3];
            expect(options.includes(optionValue), `Unexpected option: ${optionValue}`).toBeTruthy();
        }
    });
};

// Test input select widget
export const inputSelectTest: InputSelectTest = ({ context, path, value }) => {
    test(`Select ${value} for ${path} - ${getTestCounter(context, `${path} - ${value}`)}`, async () => {
        const newPath = context.objectDetector.replaceWithIds(path);
        const option = context.page.locator(`id=survey-question__${newPath}`);
        await option.scrollIntoViewIfNeeded();
        await option.selectOption(value);
        await expect(option).toHaveValue(value);
        await focusOut(context.page);
    });
};

/**
 * Validates the presence of options for a specific select input question.
 *
 * @param {Object} options - The options for the test.
 * @param {string} options.path - The path of the select input question.
 * @param {string[]} options.options - The expected options for the select input
 * question.
 */
export const expectInputSelectOptionsTest = ({
    context,
    path,
    options
}: { path: Path; options: string[] } & CommonTestParameters) => {
    test(`Validate presence of select options for ${path} - ${getTestCounter(
        context,
        `${path} - options`
    )}`, async () => {
        const newPath = context.objectDetector.replaceWithIds(path);
        const resolvedOptions = options.map((option) =>
            typeof option === 'string' ? context.objectDetector.replaceWithIds(option) : option
        );

        // Find the select widget
        const selectWidget = context.page.locator(`id=survey-question__${newPath}`);

        // Make sure all the select options exist
        for (const option of resolvedOptions) {
            const selectOption = selectWidget.locator(`option[value="${option}"]`);
            // Use the counts as only the selected option is visible
            await expect(selectOption, `Missing select option: ${option}`).toHaveCount(1);
        }

        // Make sure the options present are the only ones.
        // Check with their values instead of count, to give a better error message in case of failure
        const selectOptions = await selectWidget.locator('option').all();
        for (const selectOption of selectOptions) {
            const selectOptionValue = await selectOption.getAttribute('value');
            expect(selectOptionValue).not.toBeNull();
            if (selectOptionValue === '') {
                // Empty option always there
                continue;
            }
            expect(
                options.includes(selectOptionValue as string),
                `Unexpected option: ${selectOptionValue}`
            ).toBeTruthy();
        }
        expect(selectOptions.length).toEqual(options.length + 1);
    });
};

// Input text in a string input widget, and return the locator of that widget.
const inputString: InputStringTest = async ({ context, path, value }): Promise<Locator> => {
    const newPath = context.objectDetector.replaceWithIds(path);
    const inputText = context.page.locator(`id=survey-question__${newPath}`);
    await inputText.scrollIntoViewIfNeeded();
    await inputText.fill(value);
    await focusOut(context.page);
    return inputText;
};

// Test input string widget
export const inputStringTest: InputStringTest = ({ context, path, value }) => {
    test(`Fill ${value} for ${path} - ${getTestCounter(context, `${path} - ${value}`)}`, async () => {
        const inputLocator = (await inputString({ context, path, value })) as Locator;
        await expect(inputLocator).toHaveValue(value);
    });
};

/**
 * Input characters that should not appear in the widget, and test that the resulting string is empty.
 *
 * @param {Object} options - The options for the test.
 * @param {string} options.path - The path of the string input question.
 * @param {string[]} options.value - The value to try and enter
 * question.
 */
export const inputStringInvalidTypeTest: InputStringTest = ({ context, path, value }) => {
    test(`Try to fill ${value} for ${path} - ${getTestCounter(context, `${path} - ${value}`)}`, async () => {
        const inputLocator = (await inputString({ context, path, value })) as Locator;
        await expect(inputLocator).toHaveValue('');
    });
};

/**
 * Input a string that is not a valid answer for this widget, and check that it gets highlighted in red.
 *
 * @param {Object} options - The options for the test.
 * @param {string} options.path - The path of the string input question.
 * @param {string[]} options.value - The value to enter
 * question.
 */
export const inputStringInvalidValueTest: InputStringTest = ({ context, path, value }) => {
    test(`Fill ${value} for ${path} and check that it is invalid - ${getTestCounter(context, `${path} - ${value}`)}`, async () => {
        const inputLocator = (await inputString({ context, path, value })) as Locator;
        await expect(inputLocator).toHaveValue(value);

        // Filter is used to find parent container instead of locator(".."), as not all input fields are located at the same depth inside their question container
        const questionContainer = context.page
            .locator('//div[contains(@class, \'form-container\')]')
            .filter({ has: inputLocator });
        await expect(questionContainer).toHaveClass(/question-filled question-invalid/);
    });
};

/**
 * Helper function to set a value and test the input range widget.
 *
 * @param {Object} options - The options for the test.
 * @param {string} options.path - The path of the widget.
 * @param {number} options.value - The value to set.
 * @param {string} [options.sliderColor='blue'] - The color of the slider.
 * Default is 'blue'.
 */
export const inputRangeTest: InputRangeTest = ({ context, path, value, sliderColor = 'blue' }) => {
    test(`Drag ${value} for ${path} - ${getTestCounter(context, `${path} - ${value}`)}`, async () => {
        const newPath = context.objectDetector.replaceWithIds(path);

        // `sliderResultDiv` is the div that contains the value of the range, the range itself and is represented by the round thumb
        const sliderResultDiv = context.page.locator(`div[aria-labelledby='survey-question__${newPath}_label']`);
        await sliderResultDiv.scrollIntoViewIfNeeded();
        const min = Number(await sliderResultDiv.getAttribute('aria-valuemin')); // Get the min value of the range
        const max = Number(await sliderResultDiv.getAttribute('aria-valuemax')); // Get the max value of the range

        // Get the question label div. The second parent is the question container div
        const questionLabelDiv = context.page.locator(`id=survey-question__${newPath}_label`);
        const questionDiv = questionLabelDiv.locator('..').locator('..');

        // Get the range div. It is the horizontal line of the widget, identified by its class name, based on the widget color
        const sliderRangeDiv = questionDiv.locator(`css=.input-slider-${sliderColor}`);
        const sliderRangeBoundingBox = await sliderRangeDiv.boundingBox();
        const sliderRangePercentage = (Number(value) + Math.abs(min)) / (Math.abs(max) + Math.abs(min)); // Calculate the percentage of the value in the range

        // Bounding box for the thumb
        const sliderBoundingBox = await sliderResultDiv.boundingBox();
        if (sliderBoundingBox === null || sliderRangeBoundingBox === null) {
            return;
        }

        // Start from the middle of the slider's thumb
        const startPoint = {
            x: sliderBoundingBox.x + sliderBoundingBox.width / 2,
            y: sliderBoundingBox.y + sliderBoundingBox.height / 2
        };

        // Slide it to some endpoint determined by the target percentage
        const endPoint = {
            x: startPoint.x + sliderRangeBoundingBox.width * sliderRangePercentage,
            y: startPoint.y
        };

        // Drag and drop the slider
        await context.page.mouse.move(startPoint.x, startPoint.y);
        await context.page.mouse.down();
        await context.page.mouse.move(endPoint.x, endPoint.y);
        await context.page.mouse.up();

        // Get the current value of the range
        const ariaValuenow = await sliderResultDiv.getAttribute('aria-valuenow');
        expect(Number(ariaValuenow)).toBe(value);
        await focusOut(context.page);
    });
};

/**
 * Test to check if the checkboxes for a given path are working as expected.
 * It iterates over the provided values, checks each checkbox, and verifies that it is checked.
 *
 * @param {object} params - The parameters for the test.
 * @param {string} params.path - The path to the checkboxes to be tested.
 * @param {(string|number)[]} params.values - The values to be checked in the checkboxes.
 */
export const inputCheckboxTest: InputCheckboxTest = ({ context, path, values }) => {
    test(`Check ${values} for ${path} - ${getTestCounter(context, `${path} - ${values}`)}`, async () => {
        const newPath = context.objectDetector.replaceWithIds(path);
        const resolvedValues = values.map((value) =>
            typeof value === 'string' ? context.objectDetector.replaceWithIds(value) : value
        );
        const checkboxes: Locator[] = []; // Store the locators for the checkboxes

        // Click on each checkbox
        for (const value of resolvedValues) {
            const checkbox = context.page.locator(`id=survey-question__${newPath}_${value}__input-checkbox__${value}`);
            checkboxes.push(checkbox); // Store the locator for the checkbox
            await checkbox.scrollIntoViewIfNeeded();
            await checkbox.click();
        }

        // Check that all checkboxes are checked
        for (const checkbox of checkboxes) {
            await checkbox.scrollIntoViewIfNeeded();
            await expect(checkbox).toBeChecked();
        }

        await focusOut(context.page);
    });
};

/**
 * Fetch and parse the Google Maps API response.
 *
 * @param {Object} params - The parameters for the function.
 * @param {Object} params.context - The test context.
 * @param {Object} params.refreshButton - The button element to refresh the map.
 * @returns {Promise<{results: Array<Object>, resultsNumber: number}>} - The parsed response body and the number of results.
 */
const fetchGoogleMapsApiResponse: FetchGoogleMapsApiResponse = async ({ context, refreshButton }) => {
    // Wait for a response from the Google Maps API with retry logic.
    const waitForResponse = async () => {
        let attempts = 1; // Number of attempts
        const maxRetries = 3; // Maximum number of retries

        // Attempt to fetch the response from the Google Maps API.
        const attemptFetch = async () => {
            try {
                // Wait for the response from the Google Maps API
                const [response] = await Promise.all([
                    context.page.waitForResponse(
                        (response) =>
                            response.url().includes('maps.googleapis.com/maps/api/place') && response.status() === 200,
                        { timeout: 5000 } // Set a timeout of 5 seconds
                    ),
                    refreshButton.click() // Click the refresh button to trigger the API call
                ]);
                return response; // Return the response if successful
            } catch (error) {
                if (attempts <= maxRetries) {
                    console.log(
                        `No response received from Google Maps, retrying in 5 seconds... (Attempt ${attempts} of ${maxRetries} with error ${error?.message})`
                    );
                    attempts++;
                    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before retrying
                    return attemptFetch(); // Retry the fetch
                } else {
                    throw new Error('Max retries reached. No response received.'); // Throw an error if max retries are reached
                }
            }
        };

        return attemptFetch(); // Start the first attempt
    };

    const response = await waitForResponse(); // Wait for a response from the Google Maps API with retry logic.
    const responseBody = await response.text(); // Get the response body as text
    let responseBodyJson; // Store the response body as JSON
    try {
        // Check if the response body starts with this specific pattern.
        // Google Maps API returns a JSONP response, which needs to be parsed differently
        const jsonpPrefix = '/**/_xdc_'; // JSONP prefix
        if (responseBody.startsWith(jsonpPrefix)) {
            // Strip out the JSONP prefix and the trailing semicolon
            const jsonpStartIndex = responseBody.indexOf('(') + 1; // Start index of the JSONP response
            const jsonpEndIndex = responseBody.lastIndexOf(')'); // End index of the JSONP response
            const jsonString = responseBody.substring(jsonpStartIndex, jsonpEndIndex); // Extract the JSONP response
            responseBodyJson = JSON.parse(jsonString); // Parse the JSONP response as JSON
        } else {
            responseBodyJson = JSON.parse(responseBody); // Parse the response body as JSON
        }
    } catch (error) {
        console.error('Failed to parse response body as JSON:', error);
    }

    const results = responseBodyJson.results || [];
    const resultsNumber = results.length;

    return { results, resultsNumber };
};

/**
 * Test input mapFindPlace widget.
 *
 * @param {Object} params - The parameters for the test.
 * @param {Object} params.context - The test context.
 * @param {string} params.path - The path to the map widget.
 */
export const inputMapFindPlaceTest: InputMapFindPlaceTest = ({ context, path }) => {
    test(`Find place on map ${path} - ${getTestCounter(context, `${path}`)}`, async () => {
        const newPath = context.objectDetector.replaceWithIds(path);

        // Refresh map result
        const refreshButton = context.page.locator(`id=survey-question__${newPath}_refresh`);
        await refreshButton.scrollIntoViewIfNeeded();
        await refreshButton.isVisible();

        // Fetch the Google Maps API response
        const { resultsNumber } = await fetchGoogleMapsApiResponse({ context, refreshButton });

        // Get the main map widget, 4 above the button
        const inputMap = refreshButton.locator('..').locator('..').locator('..').locator('..');
        await inputMap.scrollIntoViewIfNeeded(); // So we can see the map correctly in the screenshot when the test fails

        // Check if the no result alert is visible
        // const noResultAlertElement = inputMap.getByText('The search did not return any result');
        // const checkIfNoResult = await noResultAlertElement.isVisible();

        // If no result, click again
        if (resultsNumber === 0) {
            console.log('Map not ready, clicking again...');
            await refreshButton.click();
        }

        // If there is at least one result and the select input exists, select the first option and confirm.
        // Note: This is necessary because sometimes the select input appears with only one available option.
        const select = inputMap.locator(`id=survey-question__${newPath}_mapFindPlace`);
        if (resultsNumber >= 1 && (await select.count()) > 0) {
            // Select the first option from the dropdown
            await select.focus(); // Focus on the select element
            await select.press('ArrowDown'); // take the first option from select
            await select.press('Enter');

            // Confirm place selection
            const confirmButton = inputMap.locator(`id=survey-question__${newPath}_confirm`);
            await expect(confirmButton).toBeVisible();
            await confirmButton.click();
            await expect(confirmButton).toBeHidden(); // Confirm button should be hidden after clicking
        }

        // Make sure that the the question widget have validations implemented
        // Check if the input has the question-valid class
        await expect(inputMap).toHaveClass(/question-valid/);
    });
};

/**
 * Waits for the google maps widget to be loaded and validated.
 * This is necessary for some tests that will try to go to the next page shortly after filling in the address, as we will stay on the page if the map isn't loaded.
 *
 * @param {Object} options - The options for the test.
 */
export const waitForMapToBeLoaded: WaitForMapLoadedTest = ({ context }) => {
    test('Wait for map to be loaded', async () => {
        const mapContainer = context.page.locator('//div[contains(@class, \'question-type-mapPoint\')]');
        await expect(mapContainer).toBeVisible();
        await mapContainer.scrollIntoViewIfNeeded();
        await expect(mapContainer).toHaveClass(/question-filled question-valid/);
    });
};

// Test input button widget that go to the next page
export const inputNextButtonTest: InputNextButtonTest = ({ context, text, nextPageUrl }) => {
    test(`Click ${text} and go to ${nextPageUrl} ${getTestCounter(context, `${text} - ${nextPageUrl}`)}`, async () => {
        const button = context.page.getByRole('button', { name: text });
        await button.scrollIntoViewIfNeeded();
        await button.click();
        await expect(context.page).toHaveURL(nextPageUrl);
    });
};

// Test clicking on the button in a popup dialog
export const inputPopupButtonTest: InputPopupButtonTest = ({ context, text, popupText }) => {
    test(`Click on popup button ${text} - ${getTestCounter(context, `${text} - popup`)}`, async () => {
        const dialog = context.page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(popupText);
        const popupButton = dialog.getByRole('button', { name: text });
        await popupButton.click();
    });
};

/**
 * Test input date picker widget.
 *
 * @param {Object} options - The options for the test.
 * @param {string} options.path - The path of the date picker question.
 * @param {string} options.value - The date value to select in the datepicker, in the format 'YYYY-MM-DD'.
 */
export const inputDatePickerTest = ({ context, path, value }: PathAndValue & CommonTestParameters) => {
    test(`Pick date ${value} for ${path} - ${getTestCounter(context, `${path} - ${value}`)}`, async () => {
        const newPath = context.objectDetector.replaceWithIds(path);

        // Find date picker and click in the middle of it to have the calendar show up
        // For this widget, we need to click on the proper day in the calendar so that the callbacks are triggered, otherwise, we may get timezones errors.
        const datePickerInput = context.page.locator(`id=survey-question__${newPath}`);
        await expect(datePickerInput).toBeVisible();
        await datePickerInput.scrollIntoViewIfNeeded();
        const datePickerBoundingBox = await datePickerInput.boundingBox();
        if (datePickerBoundingBox !== null) {
            // Click in the middle of the bounding box
            context.page.mouse.click(
                datePickerBoundingBox.x + datePickerBoundingBox.width / 2,
                datePickerBoundingBox.y + datePickerBoundingBox.height / 2
            );
        }

        // Find the date picker container (3 levels higher up)
        const datePickerContainer = datePickerInput.locator('..').locator('..').locator('..');

        // Prepare the values to select
        const desiredDate = moment(value, 'YYYY-MM-DD');
        const desiredMonth = desiredDate.format('MMMM');
        const desiredDay = desiredDate.format('D');
        const desiredYear = desiredDate.format('YYYY');

        // Select the desired month
        const getCurrentlySelectedMonthYear = async () => {
            const monthSelector = datePickerContainer.locator('.react-datepicker__current-month');
            await expect(monthSelector).toBeVisible();
            const currentMonthYearText = await monthSelector.allInnerTexts();
            return moment(currentMonthYearText[0], 'MMMM YYYY');
        };

        // Select the desired month, either by clicking previous or next month buttons
        // FIXME This approach to selecting month was tested with the od_longue_distance survey, but it may not work for all surveys
        const desiredMonthYear = moment(`${desiredMonth} ${desiredYear}`, 'MMMM YYYY');
        let currentMonthYear = await getCurrentlySelectedMonthYear();
        if (desiredMonthYear.isBefore(currentMonthYear)) {
            const previousMonthButton = datePickerContainer.locator('.react-datepicker__navigation--previous');
            while (desiredMonthYear.isBefore(currentMonthYear)) {
                await previousMonthButton.click();
                currentMonthYear = await getCurrentlySelectedMonthYear();
            }
        } else if (desiredMonthYear.isAfter(currentMonthYear)) {
            const nextMonthButton = datePickerContainer.locator('.react-datepicker__navigation--next');
            while (desiredMonthYear.isAfter(currentMonthYear)) {
                await nextMonthButton.click();
                currentMonthYear = await getCurrentlySelectedMonthYear();
            }
        }

        // Select the desired day, by getting the element with the day as exact text and labelled with the month (the label locator needs to precede the text locator)
        const desiredDayOption = datePickerContainer.getByLabel(desiredMonth).getByText(desiredDay, { exact: true });
        await desiredDayOption.click();

        // The month selector should be hidden before reading the value
        const monthSelector = datePickerContainer.locator('.react-datepicker__current-month');
        await expect(monthSelector).toBeHidden();

        // Get the selected date value
        const selectedDateValue = await datePickerInput.getAttribute('value');
        expect(selectedDateValue).toBe(desiredDate.format('DD/MM/YYYY'));
    });
};

/**
 * Input a date that is invalid (such as being in the future) and check that it gets modified to a different value.
 * The new value seems to depend on the context and value entered, giving different values if it is entered from an empty widget or modified, and sometimes being empty.
 * TODO: Investigate the exact correcting mechanism, so we can test for an expected value
 *
 * @param {Object} options - The options for the test.
 * @param {string} options.path - The path of the date picker question.
 * @param {string} options.value - The date value to write in the datepicker, in the format 'DD/MM/YYYY'.
 */
export const writeInvalidDateTest = ({ context, path, value }: PathAndValue & CommonTestParameters) => {
    test(`Write invalid date ${value} for ${path} - ${getTestCounter(context, `${path} - ${value}`)}`, async () => {
        const newPath = context.objectDetector.replaceWithIds(path);

        const datePickerInput = context.page.locator(`id=survey-question__${newPath}`);
        await expect(datePickerInput).toBeVisible();
        await datePickerInput.scrollIntoViewIfNeeded();
        await datePickerInput.fill(value);
        await focusOut(context.page);
        await expect(datePickerInput).not.toHaveValue(value);
    });
};

/**
 * Test whether a widget is visible or not
 *
 * @param { path, isVisible = true } - The path of the widget and whether it should be visible or not
 */
export const inputVisibleTest = ({
    context,
    path,
    isVisible = true
}: { path: Path; isVisible?: boolean } & CommonTestParameters) => {
    test(`Check input visibility ${path} - ${isVisible} - ${getTestCounter(
        context,
        `${path} - ${isVisible}`
    )}`, async () => {
        const newPath = context.objectDetector.replaceWithIds(path);
        const input = context.page.locator(`id=survey-question__${newPath}`);
        if (isVisible) {
            await expect(input).toBeVisible();
        } else {
            await expect(input).toBeHidden();
        }
    });
};

/**
 * Test that a text is visible on the page
 *
 * @param { path, isVisible = true } - The text to display and whether it should
 * be visible or not. Note that to check if a text is not visible, previous
 * tests should make sure the right page is displayed, otherwise the text may
 * simply not be visible yet but may appear later once the page has finished
 * refreshing.
 */
export const waitTextVisible = ({
    context,
    text,
    isVisible = true
}: { text: Path; isVisible?: boolean } & CommonTestParameters) => {
    test(`Check text visibility ${text} - ${getTestCounter(context, `${text} - ${isVisible}`)}`, async () => {
        const input = context.page.getByText(text);
        if (isVisible) {
            await expect(input).toBeVisible();
        } else {
            await expect(input).not.toBeVisible();
        }
    });
};

const tryToContinueOnInvalidPage: ContinueWithInvalidEntriesTest = async ({
    context,
    text,
    currentPageUrl,
    nextPageUrl
}) => {
    const button = context.page.getByRole('button', { name: text });
    await button.scrollIntoViewIfNeeded();
    await button.click();
    // FIXME: 1000 timeout might not be enough on slower machine. Might require a new way to check if test fails.
    await expect(context.page.waitForURL(nextPageUrl, { timeout: 1000 })).rejects.toThrow('Timeout');
    await expect(context.page).toHaveURL(currentPageUrl);
};

/**
 * Click the next page button when not all options are filled, check that we remain on the same page, and check that at least one input widget has the invalid class.
 *
 * @param {Object} options - The options for the test.
 * @param {string} options.text - The text of the button to click.
 * @param {string} options.currentPageUrl - The URL of the current page.
 * @param {string} options.nextPageUrl - The URL of the page that the button would normally take us too.
 */
export const tryToContinueWithInvalidInputs: ContinueWithInvalidEntriesTest = ({
    context,
    text,
    currentPageUrl,
    nextPageUrl
}) => {
    test(`Clicking ${text} when options are invalid should keep you on ${currentPageUrl} - ${getTestCounter(context, `${text} - ${currentPageUrl} - ${nextPageUrl}`)}`, async () => {
        await tryToContinueOnInvalidPage({ context, text, currentPageUrl, nextPageUrl });
        const inputBoxes = context.page.locator('//div[contains(@class, \'form-container\')]');
        const inputNumber = await inputBoxes.count();
        let hasInvalidClass = false;
        for (let i = 0; i < inputNumber; i++) {
            const inputClass = await inputBoxes.nth(i).getAttribute('class');
            if (inputClass?.includes('question-invalid')) {
                hasInvalidClass = true;
                break;
            }
        }
        expect(hasInvalidClass, 'No widgets on this page have invalid inputs.').toBeTruthy();
    });
};

/**
 * Click the next page button with invalid data that will create a popup, verifies that the appropriate popup appears, and close it.
 *
 * @param {Object} options - The options for the test.
 * @param {string} options.text - The text of the button to click.
 * @param {string} options.currentPageUrl - The URL of the current page.
 * @param {string} options.nextPageUrl - The URL of the page that the button would normally take us too.
 */
export const tryToContinueWithPopup: ContinueWithInvalidEntriesTest = ({
    context,
    text,
    currentPageUrl,
    nextPageUrl
}) => {
    test(`Clicking ${text} should open a popup and keep you on ${currentPageUrl} - ${getTestCounter(context, `${text} - ${currentPageUrl} - ${nextPageUrl}`)}`, async () => {
        await tryToContinueOnInvalidPage({ context, text, currentPageUrl, nextPageUrl });
        const popup = context.page.getByRole('dialog');
        await expect(popup).toBeVisible();
        await popup.locator('//button').click();
        await expect(popup).not.toBeVisible();
    });
};

/**
 * Check that we are redirected to the right url, and interrupt it.
 *
 * @param {string} buttonText - The text of the button that triggers the redirection.
 * @param {string} expectedRedirectionUrl - The URL we expect to be redirected to.
 * @param {string} nextPageUrl - The URL of the page that the button takes us to before the redirect.
 */
export const pageRedirectionTest: RedirectionTest = ({ context, buttonText, expectedRedirectionUrl, nextPageUrl }) => {
    // Get the domain of the expected url by splitting it and taking the section after the 'https://'
    // Putting the whole url in the test title also causes issue, so we just put the domain
    const urlDomain = expectedRedirectionUrl.split('/')[2];
    test(`Clicking ${buttonText} should normally take user to ${nextPageUrl} but redirects to ${urlDomain} - ${getTestCounter(context, `${buttonText} - ${urlDomain} - ${nextPageUrl}`)}`, async () => {
        let redirectionCalled = false;
        let logoutCalled = false;

        // Create a promise that will be resolved when redirectionCalled is true
        let resolveRedirectPromise;
        const redirectPromise = new Promise((resolve) => {
            resolveRedirectPromise = resolve;
        });
        let resolveLogoutPromise;
        const logoutPromise = new Promise((resolve) => {
            resolveLogoutPromise = resolve;
        });

        // Activate request interception to prevent redirection
        await context.page.route('**/*', (route, request) => {
            // Get the domain of the expected url by splitting it and taking the section after the 'https://'
            const urlDomain = expectedRedirectionUrl.split('/')[2];
            if (request.url().includes(urlDomain)) {
                expect(request.url()).toBe(expectedRedirectionUrl);
                redirectionCalled = true;
                // Block the redirection
                route.abort();
                resolveRedirectPromise();
            } else if (request.url().includes('logout')) {
                logoutCalled = true;
                route.continue();
                resolveLogoutPromise();
            } else {
                // Authorise all other requests to continue
                route.continue();
            }
        });

        const button = context.page.getByRole('button', { name: buttonText });
        await button.scrollIntoViewIfNeeded();
        await button.click();

        await expect(context.page).toHaveURL(nextPageUrl);

        // Await the promise outside the await on the context.page.route
        await redirectPromise;
        await logoutPromise;

        expect(redirectionCalled).toBe(true);
        expect(logoutCalled).toBe(true);
    });
};

/**
 * Verify that a button in the navigation bar has the expected status by checking its class.
 * Also checks if the button is disabled, and thus unclickable.
 *
 * @param {Object} options - The options for the test.
 * @param {string} options.buttonText - The text of the nav bar button we are checking.
 * @param {string} options.buttonStatus - The status we expect for the button. Can be one of four values: "completed", "active", "active and completed", and "inactive".
 * @param {boolean} options.isDisabled - true if we expect the button to be disabled, false is not.
 */
export const verifyNavBarButtonStatus: NavBarButtonStatusTest = ({ context, buttonText, buttonStatus, isDisabled }) => {
    test(`The ${buttonText} navigation button should have the '${buttonStatus}' status - ${getTestCounter(context, `${buttonText} - ${buttonStatus}`)}`, async () => {
        const navBar = context.page.locator('div[class=\'survey-section-nav\']');
        const button = navBar.getByText(buttonText);
        let expectedStatusClass;
        switch (buttonStatus) {
        case 'completed':
            expectedStatusClass = 'nav-button completed-section';
            break;
        case 'active':
            expectedStatusClass = 'nav-button active-section';
            break;
        case 'activeAndCompleted':
            expectedStatusClass = 'nav-button active-section completed-section';
            break;
        case 'inactive':
            expectedStatusClass = 'nav-button';
            break;
        }

        await expect(button).toHaveClass(expectedStatusClass);

        if (isDisabled) {
            await expect(button).toBeDisabled();
        } else {
            await expect(button).toBeEnabled();
        }
    });
};

/**
 * Verify that clicking a button in the navigation bar takes you to the expected page.
 *
 * @param {Object} options - The options for the test.
 * @param {string} options.buttonText - The text of the nav bar button we are clicking.
 * @param {string} options.nextPageUrl - The page we expect to be taken to after clicking.
 */
export const changePageFromNavBar: ChangePageFromNavBarTest = ({ context, buttonText, nextPageUrl }) => {
    test(`Click ${buttonText} in the nav bar and check that it goes to ${nextPageUrl} ${getTestCounter(context, `${buttonText} - ${nextPageUrl}`)}`, async () => {
        const navBar = context.page.locator('div[class=\'survey-section-nav\']');
        const button = navBar.getByText(buttonText);
        await button.scrollIntoViewIfNeeded();
        await button.click();
        await expect(context.page).toHaveURL(nextPageUrl);
    });
};

/**
 * Validates the progress bar for a specific section in the survey.
 * Ensures that the section name and the completion percentage are displayed correctly.
 *
 * @param {Object} options - The parameters for the test.
 * @param {string} options.sectionName - The name of the section to validate in the progress bar.
 * @param {number} options.completionPercentage - The expected completion percentage for the section.
 */
export const sectionProgressBarTest: SectionProgressBarTest = ({ context, sectionName, completionPercentage }) => {
    test(`Validate progress bar for section "${sectionName}" with ${completionPercentage}% completion ${getTestCounter(context, `${sectionName} - ${completionPercentage}`)}`, async () => {
        // Locate the progress bar section
        const progressBarSection = context.page.locator('//div[contains(@class, \'survey-section__progress-bar\')]');
        await progressBarSection.scrollIntoViewIfNeeded();

        // Verify the section name is displayed in the progress bar
        const sectionNameHeader = progressBarSection.getByText(`${sectionName} - Section`);
        await expect(sectionNameHeader).toBeVisible();

        // Verify the completion percentage is displayed correctly
        const completionPercentageText = progressBarSection.getByText(`${completionPercentage}%`);
        await expect(completionPercentageText).toBeVisible();
    });
};

/**
 * Solves a @cap.js captcha by clicking on it and waiting for verification to complete.
 * This function handles captchas that may be inside Shadow DOM.
 *
 * @param {CommonTestParameters} params - The test context parameters.
 * @returns {Promise<void>}
 */
export const solveCaptcha = async ({ context }: CommonTestParameters): Promise<void> => {
    try {
        // Use JavaScript evaluation to directly interact with the captcha in Shadow DOM
        const clicked = await context.page.evaluate(() => {
            // Try to find the captcha element anywhere in the DOM, including shadow DOM
            const findInShadowDOM = (element, selector) => {
                // If the element has shadow root, search inside it
                if (element.shadowRoot) {
                    const found = element.shadowRoot.querySelector(selector);
                    if (found) return found;

                    // Search through shadow root's children
                    for (const child of element.shadowRoot.children) {
                        const foundInChild = findInShadowDOM(child, selector);
                        if (foundInChild) return foundInChild;
                    }
                }

                // Search through element's children
                for (const child of element.children) {
                    const foundInChild = findInShadowDOM(child, selector);
                    if (foundInChild) return foundInChild;
                }

                return null;
            };

            // Find all potential captcha elements in the main document
            const captchaElement =
                document.querySelector('div.captcha[role="button"]') ||
                findInShadowDOM(document.documentElement, 'div.captcha[role="button"]');

            if (captchaElement) {
                captchaElement.click();
                return true;
            }

            // Alternative approach: try to find by role and aria-label
            const captchaByLabel =
                document.querySelector('[aria-label="Click to verify you\'re a human"]') ||
                findInShadowDOM(document.documentElement, '[aria-label="Click to verify you\'re a human"]');

            if (captchaByLabel) {
                captchaByLabel.click();
                return true;
            }

            return false;
        });

        if (!clicked) {
            throw new Error('Couldn\'t find captcha element to click');
        }

        // Wait for the captcha to be verified using JavaScript evaluation
        await context.page.waitForFunction(
            () => {
                // Similar function to find in shadow DOM
                const findInShadowDOM = (element, predicate) => {
                    // If element matches predicate, return it
                    if (predicate(element)) return element;

                    // If the element has shadow root, search inside it
                    if (element.shadowRoot) {
                        for (const child of element.shadowRoot.children) {
                            const foundInChild = findInShadowDOM(child, predicate);
                            if (foundInChild) return foundInChild;
                        }
                    }

                    // Search through element's children
                    for (const child of element.children) {
                        const foundInChild = findInShadowDOM(child, predicate);
                        if (foundInChild) return foundInChild;
                    }

                    return null;
                };

                // Check for solved captcha in the main document or shadow DOM
                const solvedCaptcha =
                    document.querySelector('div.captcha[data-state="solved"]') ||
                    document.querySelector('div.captcha[aria-label*="verified"]') ||
                    findInShadowDOM(
                        document.documentElement,
                        (el) =>
                            el.tagName === 'DIV' &&
                            el.classList.contains('captcha') &&
                            (el.getAttribute('data-state') === 'solved' ||
                                (el.getAttribute('aria-label') && el.getAttribute('aria-label').includes('verified')))
                    );

                return !!solvedCaptcha;
            },
            { timeout: 10000 }
        );
    } catch (error) {
        console.log('Error solving captcha using JavaScript method, trying click approach');

        try {
            // Try a more direct approach - search for the parent container that might contain the captcha
            const captchaContainer = await context.page
                .locator('form div')
                .filter({
                    has: context.page.locator('div').filter({
                        hasText: /Je suis humain|I am human/
                    })
                })
                .first();

            // Get its bounding box
            const boundingBox = await captchaContainer.boundingBox();

            if (boundingBox) {
                // Click in the middle of the container
                await context.page.mouse.click(
                    boundingBox.x + boundingBox.width / 3, // Try to click where the checkbox would be (left third)
                    boundingBox.y + boundingBox.height / 2
                );

                // Wait a moment to see if the captcha registers
                await context.page.waitForTimeout(3000);

                console.log('Tried alternative clicking approach');

                // Check if we need to click again
                const isVerified = await context.page.evaluate(() => {
                    // Look for confirmation elements or state changes that indicate verification
                    return (
                        document.querySelector('[aria-label*="verified"]') !== null ||
                        document.querySelector('[data-state="solved"]') !== null
                    );
                });

                if (!isVerified) {
                    console.log('First click didn\'t work, trying different position');
                    await context.page.mouse.click(
                        boundingBox.x + boundingBox.width / 2,
                        boundingBox.y + boundingBox.height / 2
                    );
                    await context.page.waitForTimeout(2000);
                }
            }
        } catch (fallbackError) {
            console.error('Failed all captcha solving methods:', fallbackError);
            throw new Error(`Failed to solve captcha: ${error}`);
        }
    }
};
