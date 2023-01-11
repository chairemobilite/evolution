/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { WidgetConfig } from '../WidgetConfig';

// Simply make sure various objects are recognize as WidgetConfig object. Any fault should result in compilation error.
test('Test text assignation', () => {
    let widgetConfig: WidgetConfig = {
        type: 'text',
        align: 'center',
        text: {
            fr: 'Texte en français',
            en: 'English text'
        }
    };

    expect(widgetConfig).toBeDefined();
});

test('Test input string assignation', () => {
    let widgetConfig: WidgetConfig = {
        type: 'question',
        twoColumns: true,
        path: 'test.foo',
        inputType: 'string',
        datatype: 'string',
        maxLength: 20,
        defaultValue: 'test',
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    }

    widgetConfig = {
        type: 'question',
        path: 'test.foo',
        inputType: 'string',
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    }

    expect(widgetConfig).toBeDefined();
});

test('Test input text assignation', () => {
    let widgetConfig: WidgetConfig = {
        type: 'question',
        twoColumns: true,
        path: 'comments',
        inputType: 'text',
        datatype: 'text',
        maxLength: 1500,
        shortname: 'test',
        rows: 5,
        defaultValue: 'test',
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    }

    widgetConfig = {
        type: 'question',
        path: 'comments',
        inputType: 'text',
        datatype: 'text',
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    }

    expect(widgetConfig).toBeDefined();
});