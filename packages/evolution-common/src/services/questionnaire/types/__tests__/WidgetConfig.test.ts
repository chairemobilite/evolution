/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { WidgetConfig, isInputTypeWithArrayValue } from '../WidgetConfig';

// Simply make sure various objects are recognize as WidgetConfig object. Any fault should result in compilation error.
test('Test text assignation', () => {
    const widgetConfig: WidgetConfig = {
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
        path: 'test.foo' as any,
        inputType: 'string',
        datatype: 'string',
        maxLength: 20,
        defaultValue: 'test',
        containsHtml: true,
        label: {
            fr: 'Texte en français',
            en: 'English text'
        }
    };

    widgetConfig = {
        type: 'question',
        path: 'test.foo' as any,
        inputType: 'string',
        label: {
            fr: 'Texte en français',
            en: 'English text'
        }
    };

    expect(widgetConfig).toBeDefined();
});

test('Test input text assignation', () => {
    let widgetConfig: WidgetConfig = {
        type: 'question',
        twoColumns: true,
        path: 'comments' as any,
        inputType: 'text',
        datatype: 'text',
        maxLength: 1500,
        shortname: 'test',
        rows: 5,
        defaultValue: 'test',
        containsHtml: true,
        label: {
            fr: 'Texte en français',
            en: 'English text'
        }
    };

    widgetConfig = {
        type: 'question',
        path: 'comments' as any,
        inputType: 'text',
        datatype: 'text',
        label: {
            fr: 'Texte en français',
            en: 'English text'
        }
    };

    expect(widgetConfig).toBeDefined();
});

describe('isQuestionAnswerAnArray', () => {
    test('should return true for array input types', () => {
        expect(isInputTypeWithArrayValue('checkbox')).toBe(true);
        expect(isInputTypeWithArrayValue('multiselect')).toBe(true);
    });

    test('should return false for non-array input types', () => {
        expect(isInputTypeWithArrayValue('string')).toBe(false);
        expect(isInputTypeWithArrayValue('text')).toBe(false);
        expect(isInputTypeWithArrayValue('radio')).toBe(false);
        expect(isInputTypeWithArrayValue('radioNumber')).toBe(false);
        expect(isInputTypeWithArrayValue('select')).toBe(false);
        expect(isInputTypeWithArrayValue('button')).toBe(false);
        expect(isInputTypeWithArrayValue('time')).toBe(false);
        expect(isInputTypeWithArrayValue('slider')).toBe(false);
        expect(isInputTypeWithArrayValue('datePicker')).toBe(false);
        expect(isInputTypeWithArrayValue('mapPoint')).toBe(false);
        expect(isInputTypeWithArrayValue('mapFindPlace')).toBe(false);
    });
});
