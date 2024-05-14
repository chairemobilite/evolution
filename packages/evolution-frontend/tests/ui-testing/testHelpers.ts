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
type Text = string;
type Url = string;
type Title = string;
type Path = string;
type PathAndValue = { path: Path; value: Value };
type HasTitleTest = ({ title }: { title: Title }) => void;
type HasFrenchTest = () => void;
type SwitchToEnglishTest = () => void;
type HasConsentTest = () => void;
type StartSurveyTest = () => void;
type RegisterWithoutEmailTest = () => void;
type HasUserTest = () => void;
type InputRadioTest = ({ path, value }: PathAndValue) => void;
type InputSelectTest = ({ path, value }: PathAndValue) => void;
type InputStringTest = ({ path, value }: PathAndValue) => void;
type InputRangeTest = ({ path, value }: {path: Path, value: number}) => void;
type InputMapFindPlaceTest = ({ path }: { path: Path }) => void;
type InputNextButtonTest = ({ text, nextPageUrl }: { text: Text; nextPageUrl: Url }) => void;

let page: Page;
let context: BrowserContext;
let personId: string;
const savedLabels: { [key: string]: number } = {}; // Get all the saved labels

// Configure the tests to run in serial mode (one after the other)
test.describe.configure({ mode: 'serial' });

// Open the browser before all the tests and go to the home page
test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto('/');

    // Listen to console logs to get the personId
    // FIXME Find a better way to get the personId, like listen to the network requests
    page.on('console', (msg) => {
        if (msg.text().includes('rendering person')) {
            const parts = msg.text().split(' ');
            personId = parts[3]; // The personId is the fourth part of the split string
        }
    });
});

// Close the browser after all the tests
test.afterAll(async ({ browser }) => {
    browser.close;
});

// Replace ${personId} with the actual personId
const replacePathWithPersonId = ({ path }): Path => {
    let newPath: Path = path;
    if (path.includes('${personId}')) {
        newPath = path.replace('${personId}', personId);
    }
    return newPath;
};

// Click outside to remove focus, just fake a click on the app's outer div
const focusOut = async () => {
    const header = page.locator('id=item-nav-title');
    await header.click();
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
        const newPath = replacePathWithPersonId({ path });
        const radio = page.locator(`id=survey-question__${newPath}_${value}__input-radio__${value}`);
        await radio.click();
        await expect(radio).toBeChecked();
        await focusOut();
    });
};

// Test input select widget
export const inputSelectTest: InputSelectTest = ({ path, value }) => {
    test(`Select ${value} for ${path}`, async () => {
        const newPath = replacePathWithPersonId({ path });
        const option = page.locator(`id=survey-question__${newPath}`);
        option.selectOption(value);
        await expect(option).toHaveValue(value);
        await focusOut();
    });
};

// Test input string widget
export const inputStringTest: InputStringTest = ({ path, value }) => {
    test(`Fill ${value} for ${path}`, async () => {
        const newPath = replacePathWithPersonId({ path });
        const inputText = page.locator(`id=survey-question__${newPath}`);
        await inputText.fill(value);
        await expect(inputText).toHaveValue(value);
        await focusOut();
    });
};

// TODO: Change the id to get all the locator correctly.
// Test input range widget
export const inputRangeTest: InputRangeTest = ({ path, value }) => {
    test(`Drag ${value} for ${path}`, async () => {
        const newPath = replacePathWithPersonId({ path });
        const resultDiv = page.locator(`div[aria-labelledby='survey-question__${newPath}_label']`);
        const questionLabelDiv = page.locator(`id=survey-question__${newPath}_label`);
        const min = Number(await resultDiv.getAttribute('aria-valuemin')); // Get the min value of the range
        const max = Number(await resultDiv.getAttribute('aria-valuemax')); // Get the max value of the range
        const rangeLabel = String(await questionLabelDiv.textContent()); // Get the label of the range widget

        // Get the label of the range widget only if it hasn't been retrieved before
        if (!savedLabels[rangeLabel]) {
            savedLabels[rangeLabel] = 0;
        }
        const slider = page.getByLabel(rangeLabel).nth(savedLabels[rangeLabel]);
        savedLabels[rangeLabel]++;

        const sliderBoundingBox = await slider.boundingBox();
        const container = page.locator('css=.input-slider-blue').first();
        const containerBoudingBox = await container.boundingBox();
        const containerPercentage = (Number(value) + Math.abs(min)) / (Math.abs(max) + Math.abs(min)); // Calculate the percentage of the value in the range

        // If the slider or the container are not visible, we can't test the slider
        if (sliderBoundingBox === null || containerBoudingBox === null) {
            return;
        }

        // Start from the middle of the slider's thumb
        const startPoint = {
            x: sliderBoundingBox.x + sliderBoundingBox.width / 2,
            y: sliderBoundingBox.y + sliderBoundingBox.height / 2
        };

        // Slide it to some endpoint determined by the target percentage
        const endPoint = {
            x: sliderBoundingBox.x + sliderBoundingBox.width / 2 + containerBoudingBox.width * containerPercentage,
            y: sliderBoundingBox.y + sliderBoundingBox.height / 2
        };

        // Drag and drop the slider
        await page.mouse.move(startPoint.x, startPoint.y);
        await page.mouse.down();
        await page.mouse.move(endPoint.x, endPoint.y);
        await page.mouse.up();

        // Get the current value of the range
        const ariaValuenow = await resultDiv.getAttribute('aria-valuenow');
        expect(Number(ariaValuenow)).toBe(value);
        await focusOut();
    });
};

// Test input mapFindPlace widget
export const inputMapFindPlaceTest: InputMapFindPlaceTest = ({ path }) => {
    test('Find place on map', async () => {
        const newPath = replacePathWithPersonId({ path });
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
export const inputNextButtonTest: InputNextButtonTest = ({ text, nextPageUrl }) => {
    test(`Click ${text} and go to ${nextPageUrl}`, async () => {
        const button = page.getByRole('button', { name: text });
        await button.click();
        await expect(page).toHaveURL(nextPageUrl);
    });
};
