/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import configureI18n, { registerTranslationDir } from './configurei18n';

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

const personObjectKeyRegex = /^responses\.household\.persons\.([0-9a-f-]{36})$/

let page: Page;
let context: BrowserContext;
let personIds: string[] = [];

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
            // Get the person objects and store the person ids
            const personObjects = Object.keys(data).filter(key => key.match(personObjectKeyRegex) !== null);
            if (personObjects.length > 0) {
                // FIXME _sequence and _uuid may not be set, or they may come differently, for example when adding a person manually ?
                personIds = Array(personObjects.length);
                personObjects.forEach(key => {
                    const personData = data[key];
                    personIds[personData['_sequence'] - 1] = personData['_uuid'];
                });
            }
        }
    });
});

// Close the browser after all the tests
test.afterAll(async ({ browser }) => {
    browser.close;
});

// Replace ${personId[n]} with the actual personId
const replaceWithPersonId = (str: string): string => {
    let newString = str;
    const personIdRegex = /\$\{personId\[(\d+)\]\}/g;
    const matchGroups = str.match(personIdRegex);
    if (matchGroups !== null) {
        const personIndex = Number((matchGroups[0].match(/\d+/g)as any)[0]);
        newString = str.replace(personIdRegex, personIds[personIndex]);
    }
    return newString;
};

// Click outside to remove focus, just fake a click on the app's outer div
const focusOut = async () => {
    const header = page.locator('id=item-nav-title');
    await header.click();
};

export const getPersonIds = () => personIds;

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
        const newPath = replaceWithPersonId(path);
        const newValue = typeof value === 'string' ? replaceWithPersonId(value) : value;
        const radio = page.locator(`id=survey-question__${newPath}_${newValue}__input-radio__${newValue}`);
        await radio.click();
        await expect(radio).toBeChecked();
        await focusOut();
    });
};

// Test input select widget
export const inputSelectTest: InputSelectTest = ({ path, value }) => {
    test(`Select ${value} for ${path}`, async () => {
        const newPath = replaceWithPersonId(path);
        const option = page.locator(`id=survey-question__${newPath}`);
        option.selectOption(value);
        await expect(option).toHaveValue(value);
        await focusOut();
    });
};

// Test input string widget
export const inputStringTest: InputStringTest = ({ path, value }) => {
    test(`Fill ${value} for ${path}`, async () => {
        const newPath = replaceWithPersonId(path);
        const inputText = page.locator(`id=survey-question__${newPath}`);
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
        const newPath = replaceWithPersonId(path);

        // `sliderResultDiv` is the div that contains the value of the range, the range itself and is represented by the round thumb
        const sliderResultDiv = page.locator(`div[aria-labelledby='survey-question__${newPath}_label']`);
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
        const newPath = replaceWithPersonId(path);
        // Refresh map result
        const refreshButton = page.locator(`id=survey-question__${newPath}_refresh`);
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
        const newPath = replaceWithPersonId(path);
        const input = page.locator(`id=survey-question__${newPath}`);
        if (isVisible) {
            await expect(input).toBeVisible();
        } else {
            await expect(input).toBeHidden();
        }
    });
}
