/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import moment from 'moment';
import { test, expect, Page, BrowserContext } from '@playwright/test';
import configureI18n, { registerTranslationDir } from './configurei18n';
import * as SurveyObjectDetector from './SurveyObjectDetectors';

if (process.env.LOCALE_DIR) {
    registerTranslationDir(process.env.LOCALE_DIR);
}

// Configure i18n for english and french language. The playwright test is not
// run in the browser context itself, so translations need to be manually loaded
// if we want to identify widgets by their texts.

// FIXME Let surveys define their own set of languages
const i18n = configureI18n(['en', 'fr']);

// Types for the tests
type Value = string;
type StringOrBoolean = string | boolean;
type Text = string;
type Url = string;
type Title = string;
type Path = string;
type PathAndValue = { path: Path; value: Value };
type PathAndValueBoolOrStr = { path: Path; value: StringOrBoolean };
type HasTitleTest = ({ title }: { title: Title }) => void;
type HasFrenchTest = () => void;
type SwitchToEnglishTest = () => void;
type HasConsentTest = () => void;
type StartSurveyTest = () => void;
type RegisterWithoutEmailTest = () => void;
type HasUserTest = () => void;
type SimpleAction = () => void;
type InputRadioTest = ({ path, value }: PathAndValueBoolOrStr) => void;
type InputSelectTest = ({ path, value }: PathAndValue) => void;
type InputStringTest = ({ path, value }: PathAndValue) => void;
type InputRangeTest = ({ path, value, sliderColor }: {path: Path, value: number, sliderColor?: string}) => void;
type InputMapFindPlaceTest = ({ path }: { path: Path }) => void;
type InputNextButtonTest = ({ text, nextPageUrl }: { text: Text; nextPageUrl: Url }) => void;
type InputPopupButtonTest = ({ text, popupText }: { text: Text; popupText: Text }) => void;

let page: Page;
let context: BrowserContext;

// Configure the tests to run in serial mode (one after the other)
test.describe.configure({ mode: 'serial' });

// Open the browser before all the tests and go to the home page
test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto('/');

    page.on('request', request => {
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
            SurveyObjectDetector.detectSurveyObjects(data);
        }
    });
});

// Close the browser after all the tests
test.afterAll(async ({ browser }) => {
    browser.close;
});

// Click outside to remove focus, fake a click on the left of the screen, to avoid the page scrolling out of current viewport
const focusOut = async () => {
    const viewportSize = page.viewportSize();
    if (viewportSize === null) {
        return;
    }
    // Click on the left, halfway down the viewport
    await page.mouse.click(0, viewportSize.height / 2);
};

// Test if the page has a title
export const hasTitleTest: HasTitleTest = ({ title }) => {
    test(`Has title ${title}`, async () => {
        await expect(page).toHaveTitle(title);
    });
};

// Test if the page has a french language
export const hasFrenchTest: HasFrenchTest = () => {
    test('Has French language', async () => {
        const englishButton = page.getByRole('button', { name: 'English' });
        await expect(englishButton).toHaveText('English');
    });
};

// Test if the page has a english language after switching
export const switchToEnglishTest: SwitchToEnglishTest = () => {
    test('Switch to English language', async () => {
        const englishButton = page.getByRole('button', { name: 'English' });
        await englishButton.click();
        const frenchButton = page.getByRole('button', { name: 'Français' });
        await expect(frenchButton).toHaveText('Français');
    });
};

// Test if the page has consent
export const hasConsentTest: HasConsentTest = () => {
    test('Has consent', async () => {
        const consentCheckbox = page.locator('id=surveyConsent');
        await consentCheckbox.click();
        await expect(consentCheckbox).toBeChecked();
    });
};

// Test if the page has a start survey button
export const startSurveyTest: StartSurveyTest = () => {
    test('Start survey', async () => {
        const startSurvey = page.getByRole('button', { name: 'Start' });
        await startSurvey.click();
        await expect(page).toHaveURL('/login');
    });
};

// Test if the page has a register without email button
export const registerWithoutEmailTest: RegisterWithoutEmailTest = () => {
    test('Register without email', async () => {
        const registerWithoutEmail = page.getByRole('button', { name: i18n.t([
            'survey:auth:UseAnonymousLogin',
            'auth:UseAnonymousLogin'
        ]) as string });
        await registerWithoutEmail.click();
        await expect(page).toHaveURL('/survey/home');
    });
};

// Test if the page has a register without email button
export const logoutTest: SimpleAction = () => {
    test('Logout from survey', async () => {
        const logoutButton = page.getByRole('button', { name: i18n.t([
            'survey:auth:Logout',
            'auth:Logout'
        ]) as string });
        await logoutButton.click();
        await expect(page).toHaveURL('/');
    });
};

// Test if the page has a user
export const hasUserTest: HasUserTest = () => {
    test('Has anonym user', async () => {
        const userName = page.getByRole('button', { name: /anonym_.*/ });
        await expect(userName).toHaveText(/anonym_.*/);
    });
};

// Test input radio widget
export const inputRadioTest: InputRadioTest = ({ path, value }) => {
    test(`Check ${value} for ${path}`, async () => {
        const newPath = SurveyObjectDetector.replaceWithIds(path);
        const newValue = typeof value === 'string' ? SurveyObjectDetector.replaceWithIds(value) : value;
        const radio = page.locator(`id=survey-question__${newPath}_${newValue}__input-radio__${newValue}`);
        await radio.scrollIntoViewIfNeeded();
        await radio.click();
        await expect(radio).toBeChecked();
        await focusOut();
    });
};


const radioOptionTestCounters: { [testKey: string]: number } = {};
/**
 * Validates the presence of options for a specific radio input question.
 *
 * @param {Object} options - The options for the test.
 * @param {string} options.path - The path of the radio input question.
 * @param {string[]} options.options - The expected options for the radio input
 * question.
 */
export const expectInputRadioOptionsTest = ({ path, options }: { path: Path, options: string[] }) => {
    const testIdx = radioOptionTestCounters[path] || 0;
    radioOptionTestCounters[path] = testIdx + 1;
    test(`Validate presence of radio options for ${path} - ${radioOptionTestCounters[path]}`, async () => {
        const newPath = SurveyObjectDetector.replaceWithIds(path);

        // Find the first option and make sure it exists
        const resolvedOptions = options.map(option => typeof option === 'string' ? SurveyObjectDetector.replaceWithIds(option) : option);
        const firstRadioOption = page.locator(`id=survey-question__${newPath}_${resolvedOptions[0]}__input-radio__${resolvedOptions[0]}`);
        await expect(firstRadioOption).toBeVisible();

        // Find the radio options container (3 levels higher up)
        const radioOptionsContainer = firstRadioOption.locator('..').locator('..').locator('..');

        // Make sure all the radio options exist
        for (const option of resolvedOptions) {
            const radioOption = radioOptionsContainer.locator(`id=survey-question__${newPath}_${option}__input-radio__${option}`);
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
export const inputSelectTest: InputSelectTest = ({ path, value }) => {
    test(`Select ${value} for ${path}`, async () => {
        const newPath = SurveyObjectDetector.replaceWithIds(path);
        const option = page.locator(`id=survey-question__${newPath}`);
        await option.scrollIntoViewIfNeeded();
        option.selectOption(value);
        await expect(option).toHaveValue(value);
        await focusOut();
    });
};

const selectOptionTestCounters: { [testKey: string]: number } = {};
/**
 * Validates the presence of options for a specific select input question.
 *
 * @param {Object} options - The options for the test.
 * @param {string} options.path - The path of the select input question.
 * @param {string[]} options.options - The expected options for the select input
 * question.
 */
export const expectInputSelectOptionsTest = ({ path, options }: { path: Path, options: string[] }) => {
    const testIdx = selectOptionTestCounters[path] || 0;
    selectOptionTestCounters[path] = testIdx + 1;
    test(`Validate presence of select options for ${path} - ${selectOptionTestCounters[path]}`, async () => {
        const newPath = SurveyObjectDetector.replaceWithIds(path);
        const resolvedOptions = options.map(option => typeof option === 'string' ? SurveyObjectDetector.replaceWithIds(option) : option);

        // Find the select widget
        const selectWidget = page.locator(`id=survey-question__${newPath}`);

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
            expect(options.includes(selectOptionValue as string), `Unexpected option: ${selectOptionValue}`).toBeTruthy();
        }
        expect(selectOptions.length).toEqual(options.length + 1);
    });
};

// Test input string widget
export const inputStringTest: InputStringTest = ({ path, value }) => {
    test(`Fill ${value} for ${path}`, async () => {
        const newPath = SurveyObjectDetector.replaceWithIds(path);
        const inputText = page.locator(`id=survey-question__${newPath}`);
        await inputText.scrollIntoViewIfNeeded();
        await inputText.fill(value);
        await expect(inputText).toHaveValue(value);
        await focusOut();
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
export const inputRangeTest: InputRangeTest = ({ path, value, sliderColor = 'blue' }) => {
    test(`Drag ${value} for ${path}`, async () => {
        const newPath = SurveyObjectDetector.replaceWithIds(path);

        // `sliderResultDiv` is the div that contains the value of the range, the range itself and is represented by the round thumb
        const sliderResultDiv = page.locator(`div[aria-labelledby='survey-question__${newPath}_label']`);
        await sliderResultDiv.scrollIntoViewIfNeeded();
        const min = Number(await sliderResultDiv.getAttribute('aria-valuemin')); // Get the min value of the range
        const max = Number(await sliderResultDiv.getAttribute('aria-valuemax')); // Get the max value of the range

        // Get the question label div. The second parent is the question container div
        const questionLabelDiv = page.locator(`id=survey-question__${newPath}_label`);
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
        await page.mouse.move(startPoint.x, startPoint.y);
        await page.mouse.down();
        await page.mouse.move(endPoint.x, endPoint.y);
        await page.mouse.up();

        // Get the current value of the range
        const ariaValuenow = await sliderResultDiv.getAttribute('aria-valuenow');
        expect(Number(ariaValuenow)).toBe(value);
        await focusOut();
    });
};

// Test input mapFindPlace widget
let mapFindPlaceCounter = 0;
export const inputMapFindPlaceTest: InputMapFindPlaceTest = ({ path }) => {
    mapFindPlaceCounter++;
    test(`Find place on map ${mapFindPlaceCounter}`, async () => {
        const newPath = SurveyObjectDetector.replaceWithIds(path);
        // Refresh map result
        const refreshButton = page.locator(`id=survey-question__${newPath}_refresh`);
        await refreshButton.scrollIntoViewIfNeeded();
        await refreshButton.click();

        // Select option from select
        const select = page.locator(`id=survey-question__${newPath}_mapFindPlace`);
        await select.press('ArrowDown');
        await select.press('Enter');

        // Confirm place
        const confimButton = page.locator(`id=survey-question__${newPath}_confirm`);
        await expect(confimButton).toBeVisible();
        await confimButton.click();
    });
};

// Test input button widget that go to the next page
const buttonClickTestIndexes: { [testKey: string]: number } = {};
export const inputNextButtonTest: InputNextButtonTest = ({ text, nextPageUrl }) => {
    const testKey = `${text} - ${nextPageUrl}`;
    const testIdx = buttonClickTestIndexes[testKey] || 0;
    buttonClickTestIndexes[testKey] = testIdx + 1;
    test(`Click ${text} and go to ${nextPageUrl} ${buttonClickTestIndexes[testKey]}`, async () => {
        const button = page.getByRole('button', { name: text });
        await button.scrollIntoViewIfNeeded();
        await button.click();
        await expect(page).toHaveURL(nextPageUrl);
    });
};

// Test clicking on the button in a popup dialog
let inputButtonCounter = 0;
export const inputPopupButtonTest: InputPopupButtonTest = ({ text, popupText }) => {
    inputButtonCounter++;
    test(`Click on popup button ${text} ${inputButtonCounter}`, async () => {
        const dialog = page.getByRole('dialog');
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
export const inputDatePickerTest = ({ path, value }: PathAndValue) => {
    test(`Pick date ${value} for ${path}`, async () => {
        const newPath = SurveyObjectDetector.replaceWithIds(path);

        // Find date picker and click in the middle of it to have the calendar show up
        // For this widget, we need to click on the proper day in the calendar so that the callbacks are triggered, otherwise, we may get timezones errors.
        const datePickerInput = page.locator(`id=survey-question__${newPath}`);
        await expect(datePickerInput).toBeVisible();
        await datePickerInput.scrollIntoViewIfNeeded();
        const datePickerBoundingBox = await datePickerInput.boundingBox();
        if (datePickerBoundingBox !== null) {
            // Click in the middle of the bounding box
            page.mouse.click(datePickerBoundingBox.x + datePickerBoundingBox.width / 2, datePickerBoundingBox.y + datePickerBoundingBox.height / 2);
        }

        // Find the date picker container (3 levels higher up)
        const datePickerContainer = datePickerInput.locator('..').locator('..').locator('..');

        // Prepare the values to select
        const desiredDate = moment(value, 'YYYY-MM-DD')
        const desiredMonth = desiredDate.format('MMMM');
        const desiredDay = desiredDate.format('D');
        const desiredYear = desiredDate.format('YYYY');

        // Select the desired month
        const getCurrentlySelectedMonthYear = async() => {
            const monthSelector = datePickerContainer.locator('.react-datepicker__current-month');
            await expect(monthSelector).toBeVisible();
            const currentMonthYearText = await monthSelector.allInnerTexts();
            return moment(currentMonthYearText[0], 'MMMM YYYY');
        }

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

        // Select the desired day, by getting the element with the day as exact text
        const desiredDayOption = datePickerContainer.getByText(desiredDay, { exact: true });
        await desiredDayOption.click();

        // The month selector should be hidden before reading the value
        const monthSelector = datePickerContainer.locator('.react-datepicker__current-month');
        await expect(monthSelector).toBeHidden();

        // Get the selected date value
        const selectedDateValue = await datePickerInput.getAttribute('value');
        expect(selectedDateValue).toBe(desiredDate.format('DD/MM/YYYY'));
    });
}

const inputInvisibleCounters: { [testKey: string]: number } = {};
/**
 * Test whether a widget is visible or not
 *
 * @param { path, isVisible = true } - The path of the widget and whether it should be visible or not
 */
export const inputVisibleTest = ({ path, isVisible = true }: { path: Path, isVisible?: boolean }) => {
    const testKey = `${path} - ${isVisible}`;
    const testIdx = inputInvisibleCounters[testKey] || 0;
    inputInvisibleCounters[testKey] = testIdx + 1;
    test(`Check input visibility ${path} - ${isVisible} - ${inputInvisibleCounters[testKey]}`, async () => {
        const newPath = SurveyObjectDetector.replaceWithIds(path);
        const input = page.locator(`id=survey-question__${newPath}`);
        if (isVisible) {
            await expect(input).toBeVisible();
        } else {
            await expect(input).toBeHidden();
        }
    });
}

const textVisibilityCounters: { [testKey: string]: number } = {};
/**
 * Test that a text is visible on the page
 *
 * @param { text } string The text to display
 */
export const waitTextVisible = ({ text }: { text: Path }) => {
    const testKey = `${text}`;
    const testIdx = textVisibilityCounters[testKey] || 0;
    textVisibilityCounters[testKey] = testIdx + 1;
    test(`Check text visibility ${text} - ${textVisibilityCounters[testKey]}`, async () => {
        const input = page.getByText(text);
        await expect(input).toBeVisible();
    });
}
