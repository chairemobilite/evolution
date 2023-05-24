/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import InputRadioNumber from "../InputRadioNumber";

describe('Render InputRadioNumber', () => {
    const widgetConfig = {
        inputType: 'radioNumber' as const,
        valueRange: { min: 1, max: 3 },
        overMaxAllowed: false
    }

    const widgetConfigOverMax = {
        inputType: 'radioNumber' as const,
        valueRange: { min: 1, max: 3 },
        overMaxAllowed: true
    }

    test('InputRadioNumber without "over max" option', () => {
        const wrapper = TestRenderer.create(
            <InputRadioNumber
                id={'test'}
                widgetConfig={widgetConfig}
                onValueChange={(e) => null}
            />
        );
        expect(wrapper).toMatchSnapshot();
    });

    test('InputRadioNumber with "over max" option', () => {
        const wrapper = TestRenderer.create(
            <InputRadioNumber
                id={'test'}
                widgetConfig={widgetConfigOverMax}
                onValueChange={(e) => null}
            />
        );
        expect(wrapper).toMatchSnapshot();
    });

    test('InputRadioNumber with selected value', () => {
        const wrapper = TestRenderer.create(
            <InputRadioNumber
                id={'test'}
                value={4}
                widgetConfig={widgetConfigOverMax}
                onValueChange={(e) => null}
            />
        );
        expect(wrapper).toMatchSnapshot();
    });
});