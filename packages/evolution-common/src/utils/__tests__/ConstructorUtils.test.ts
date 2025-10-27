/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { ConstructorUtils } from '../ConstructorUtils';
import { SurveyObjectsRegistry } from '../../services/baseObjects/SurveyObjectsRegistry';

let surveyObjectsRegistry: SurveyObjectsRegistry;

beforeEach(() => {
    surveyObjectsRegistry = new SurveyObjectsRegistry();
});

describe('ConstructorUtils', () => {
    describe('initializeAttributes', () => {
        test('should initialize attributes and custom attributes correctly', () => {
            const params = {
                attr1: 'value1',
                attr2: 'value2',
                customAttr1: 'customValue1',
                customAttr2: 'customValue2',
            };
            const attributeNames = ['attr1', 'attr2'];
            const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(params, attributeNames);
            expect(attributes).toEqual({ attr1: 'value1', attr2: 'value2' });
            expect(customAttributes).toEqual({ customAttr1: 'customValue1', customAttr2: 'customValue2' });
        });

        test('should not include _surveyObjectsRegistry in customAttributes', () => {
            const params = {
                attr1: 'value1',
                attr2: 'value2',
                customAttr1: 'customValue1',
                _surveyObjectsRegistry: surveyObjectsRegistry,
            };
            const attributeNames = ['attr1', 'attr2'];
            const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(params, attributeNames);
            expect(attributes).toEqual({ attr1: 'value1', attr2: 'value2' });
            expect(customAttributes).toEqual({ customAttr1: 'customValue1' });
            expect(customAttributes).not.toHaveProperty('_surveyObjectsRegistry');
        });

        test('should not include _surveyObjectsRegistry in customAttributes when multiple custom attributes present', () => {
            const params = {
                attr1: 'value1',
                customAttr1: 'customValue1',
                customAttr2: 'customValue2',
                _surveyObjectsRegistry: surveyObjectsRegistry,
                customAttr3: 'customValue3',
            };
            const attributeNames = ['attr1'];
            const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(params, attributeNames);
            expect(attributes).toEqual({ attr1: 'value1' });
            expect(customAttributes).toEqual({
                customAttr1: 'customValue1',
                customAttr2: 'customValue2',
                customAttr3: 'customValue3'
            });
            expect(customAttributes).not.toHaveProperty('_surveyObjectsRegistry');
        });
    });

    describe('initializeAttributes with composed attributes', () => {
        test('should initialize attributes and custom composed attributes correctly', () => {
            const params = {
                attr1: 'value1',
                attr2: 'value2',
                customAttr1: 'customValue1',
                customAttr2: 'customValue2',
                composed1: 'foo',
                composed2: 'bar'
            };
            const attributeNames = ['attr1', 'attr2'];
            const attributeWithComposedAttributes = [...attributeNames, 'composed1', 'composed2'];
            const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(params, attributeNames, attributeWithComposedAttributes);
            expect(attributes).toEqual({ attr1: 'value1', attr2: 'value2' });
            expect(customAttributes).toEqual({ customAttr1: 'customValue1', customAttr2: 'customValue2' });
        });

        test('should not include _surveyObjectsRegistry or composed attributes in customAttributes', () => {
            const params = {
                attr1: 'value1',
                attr2: 'value2',
                customAttr1: 'customValue1',
                _surveyObjectsRegistry: surveyObjectsRegistry,
                composed1: 'foo',
                composed2: 'bar'
            };
            const attributeNames = ['attr1', 'attr2'];
            const attributeWithComposedAttributes = [...attributeNames, 'composed1', 'composed2'];
            const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(params, attributeNames, attributeWithComposedAttributes);
            expect(attributes).toEqual({ attr1: 'value1', attr2: 'value2' });
            expect(customAttributes).toEqual({ customAttr1: 'customValue1' });
            expect(customAttributes).not.toHaveProperty('_surveyObjectsRegistry');
            expect(customAttributes).not.toHaveProperty('composed1');
            expect(customAttributes).not.toHaveProperty('composed2');
        });
    });

    describe('initializeComposedArrayAttributes', () => {
        test('should initialize composed array attributes correctly', () => {
            const params = {
                composedAttr: [{ id: 1 }, { id: 2 }],
            };
            const unserializeFunc = (item) => ({ id: item.id, name: `Item ${item.id}` });
            const composedAttributes = ConstructorUtils.initializeComposedArrayAttributes(
                params.composedAttr,
                unserializeFunc,
                surveyObjectsRegistry
            );
            expect(composedAttributes).toEqual([
                { id: 1, name: 'Item 1' },
                { id: 2, name: 'Item 2' },
            ]);
        });

        test('should return an empty array if composed array attribute is undefined', () => {
            const params = undefined;
            const unserializeFunc = (item) => item;
            const composedAttributes = ConstructorUtils.initializeComposedArrayAttributes(
                params,
                unserializeFunc,
                surveyObjectsRegistry
            );
            expect(composedAttributes).toEqual([]);
        });

        test('should return an empty array if at least on element of array attribute is undefined', () => {
            const params = [undefined];
            const unserializeFunc = (item) => item;
            const composedAttributes = ConstructorUtils.initializeComposedArrayAttributes(
                params,
                unserializeFunc,
                surveyObjectsRegistry
            );
            expect(composedAttributes).toEqual([]);
        });
    });

    describe('initializeComposedAttribute', () => {
        test('should initialize composed attributes correctly', () => {
            const params = {
                composedAttr: { id: 1 },
            };
            const unserializeFunc = (item) => ({ id: item.id, name: `Item ${item.id}` });
            const composedAttributes = ConstructorUtils.initializeComposedAttribute(
                params.composedAttr,
                unserializeFunc,
                surveyObjectsRegistry
            );
            expect(composedAttributes).toEqual({ id: 1, name: 'Item 1' });
        });

        test('should return an empty array if composed attribute is undefined', () => {
            const params = undefined;
            const unserializeFunc = (item) => item;
            const composedAttributes = ConstructorUtils.initializeComposedAttribute(
                params,
                unserializeFunc,
                surveyObjectsRegistry
            );
            expect(composedAttributes).toEqual(undefined);
        });
    });
});
