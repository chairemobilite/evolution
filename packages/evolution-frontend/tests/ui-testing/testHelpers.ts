/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import moment from 'moment';
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
type SwitchToEnglishTest = (params: CommonTestParameters) => void;
type HasConsentTest = (params: CommonTestParameters) => void;
type StartSurveyTest = (params: CommonTestParameters & { nextUrl?: string }) => void;
type RegisterWithoutEmailTest = (params: CommonTestParameters) => void;
type RegisterWithEmailTest = (params: { email: Email; nextPageUrl?: Url } & CommonTestParameters) => void;
type HasUserTest = (params: CommonTestParameters) => void;
type SimpleAction = (params: CommonTestParameters) => void;
type InputRadioTest = (params: PathAndValueBoolOrStr & CommonTestParameters) => void;
type InputSelectTest = (params: PathAndValue & CommonTestParameters) => void;
type InputStringTest = (params: PathAndValue & CommonTestParameters) => void;
type InputRangeTest = (params: { path: Path; value: number; sliderColor?: string } & CommonTestParameters) => void;
type InputCheckboxTest = (params: { path: Path; values: Value[] } & CommonTestParameters) => void;
type InputMapFindPlaceTest = (params: { path: Path, expectMultiple?: boolean } & CommonTestParameters) => void;
type InputNextButtonTest = (params: { text: Text; nextPageUrl: Url } & CommonTestParameters) => void;
type InputPopupButtonTest = (params: { text: Text; popupText: Text } & CommonTestParameters) => void;

/**
 * Open the browser before all the tests and go to the home page
 *
 * @param {Browser} browser - The test browser object
 * @param {SurveyObjectDetector} surveyObjectDetector - The object detector for
 * the test, to keep object data and IDs passed between client and server.
 * @param {Object} options - The options for the test.
 * @param {{ [param: string]: string} } options.urlSearchParams - Additional
 * parameters to add to the URL as query string question.
 */
export const initializeTestPage = async (
    browser: Browser,
    surveyObjectDetector: SurveyObjectDetector,
    options: { urlSearchParams?: { [param: string]: string } } = {}
): Promise<Page> => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const baseUrlString = test.info().project.use.baseURL;
    if (typeof baseUrlString === 'string' && options.urlSearchParams) {
        // Add the search params to the base URL
        const baseURL = new URL(baseUrlString);
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
    browser.close;
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
    test(`Has title ${title}`, async () => {
        await expect(context.page).toHaveTitle(title);
    });
};

// Test if the page has a french language
export const hasFrenchTest: HasFrenchTest = ({ context }) => {
    test('Has French language', async () => {
        const englishButton = context.page.getByRole('button', { name: 'English' });
        await expect(englishButton).toHaveText('English');
    });
};

// Test if the page has a english language after switching
export const switchToEnglishTest: SwitchToEnglishTest = ({ context }) => {
    test('Switch to English language', async () => {
        const englishButton = context.page.getByRole('button', { name: 'English' });
        await englishButton.click();
        const frenchButton = context.page.getByRole('button', { name: 'Français' });
        await expect(frenchButton).toHaveText('Français');
    });
};

// Test if the page has consent
export const hasConsentTest: HasConsentTest = ({ context }) => {
    test('Has consent', async () => {
        const consentCheckbox = context.page.locator('id=surveyConsent');
        await consentCheckbox.click();
        await expect(consentCheckbox).toBeChecked();
    });
};

// Test if the page has a start survey button
export const startSurveyTest: StartSurveyTest = ({ context, nextUrl }) => {
    test('Start survey', async () => {
        const startPage = nextUrl || '/login';
        const startSurvey = context.page.getByRole('button', { name: 'Start' });
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

// Test if the page has a logout button
export const logoutTest: SimpleAction = ({ context }) => {
    test('Logout from survey', async () => {
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

// Test input radio widget
export const inputRadioTest: InputRadioTest = ({ context, path, value }) => {
    test(`Check ${value} for ${path} - ${getTestCounter(context, `${path} - ${value}`)}`, async () => {
        const newPath = context.objectDetector.replaceWithIds(path);
        const newValue = typeof value === 'string' ? context.objectDetector.replaceWithIds(value) : value;
        const radio = context.page.locator(`id=survey-question__${newPath}_${newValue}__input-radio__${newValue}`);
        await radio.scrollIntoViewIfNeeded();
        await radio.click();
        await expect(radio).toBeChecked();
        await focusOut(context.page);
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
        option.selectOption(value);
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

// Test input string widget
export const inputStringTest: InputStringTest = ({ context, path, value }) => {
    test(`Fill ${value} for ${path} - ${getTestCounter(context, `${path} - ${value}`)}`, async () => {
        const newPath = context.objectDetector.replaceWithIds(path);
        const inputText = context.page.locator(`id=survey-question__${newPath}`);
        await inputText.scrollIntoViewIfNeeded();
        await inputText.fill(value);
        await expect(inputText).toHaveValue(value);
        await focusOut(context.page);
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

// Test input mapFindPlace widget
export const inputMapFindPlaceTest: InputMapFindPlaceTest = ({ context, path, expectMultiple = true }) => {
    test(`Find place on map ${path} - ${getTestCounter(context, `${path}`)}`, async () => {
        const newPath = context.objectDetector.replaceWithIds(path);
        // Refresh map result
        const refreshButton = context.page.locator(`id=survey-question__${newPath}_refresh`);
        await refreshButton.scrollIntoViewIfNeeded();
        await refreshButton.click();

        // Get the main map widget, 4 above the button
        const inputMap = refreshButton.locator('..').locator('..').locator('..').locator('..');

        if (expectMultiple) {
            // Multiple places, take the first one
            // Select option from select
            const select = inputMap.locator(`id=survey-question__${newPath}_mapFindPlace`);
            await select.press('ArrowDown');
            await select.press('Enter');

            // Confirm place
            const confimButton = inputMap.locator(`id=survey-question__${newPath}_confirm`);
            await expect(confimButton).toBeVisible();
            await confimButton.click();
        } else {
            // Single place, wait for the input to have the question-valid class and verify the confirmation text
            // FIXME This will work only the first time a single choice question is filled, otherwise this class is already there and we won't know if it has been updated or not
            await expect(inputMap).toHaveClass(/question-valid/)
            const validateText = inputMap.getByText('Please check that the location is identified correctly');
            await expect(validateText).toBeVisible();
        }
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
        const desiredMonthYear = moment(`${desiredMonth} ${desiredYear}`, `MMMM YYYY`);
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
export const waitTextVisible = ({ context, text, isVisible = true }: { text: Path, isVisible?: boolean } & CommonTestParameters) => {
    test(`Check text visibility ${text} - ${getTestCounter(context, `${text} - ${isVisible}`)}`, async () => {
        const input = context.page.getByText(text);
        if (isVisible) {
            await expect(input).toBeVisible();
        } else {
            await expect(input).not.toBeVisible();
        }
    });
};
