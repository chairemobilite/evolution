/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import InputRadioNumber from "../InputRadioNumber";
import {UserPermissions} from "chaire-lib-common/lib/services/user/userType";
import { render, fireEvent } from '@testing-library/react';

const interview = {
    id: 1,
    uuid: "",
    participant_id: 1,
    is_completed: false,
    response: {},
    validations: {},
    is_valid: true
}

const user = {
    id: 1,
    username: '',
    serializedPermissions: [],
    preferences: {},
    isAuthorized: (permissions: UserPermissions) => false,
    is_admin: false,
    pages: [],
    showUserInfo: false,
}

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
        const { container } = render(
            <InputRadioNumber
                id={'test'}
                widgetConfig={widgetConfig}
                onValueChange={(e) => null}
                interview={interview} path={''} user={user}
            />
        );
        expect(container).toMatchSnapshot();
    });

    test('InputRadioNumber with "over max" option', () => {
        const { container } = render(
            <InputRadioNumber
                id={'test'}
                widgetConfig={widgetConfigOverMax}
                onValueChange={(e) => null}
             interview={interview} path={''} user={user}/>
        );
        expect(container).toMatchSnapshot();
    });

    test('InputRadioNumber with selected value', () => {
        const { container } = render(
            <InputRadioNumber
                id={'test'}
                value={4}
                widgetConfig={widgetConfigOverMax}
                onValueChange={(e) => null}
                interview={interview} path={''} user={user}
            />
        );
        expect(container).toMatchSnapshot();
    });
});

describe('InputRadioNumber onChange', () => {
    const widgetConfig = {
        inputType: 'radioNumber' as const,
        valueRange: { min: 0, max: 3 },
        overMaxAllowed: true
    };

    test('Test with a radio option', () => {
        const mockOnValueChange = jest.fn();
        const { queryByText } = render(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfig}
                value={3}
                interview={interview} path={''} user={user}
            />
        );

        // Find the "1" option
        const option1 = queryByText("1");
        expect(option1).toBeTruthy();
    
        // Click on the option 1
        fireEvent.click(option1 as any);
        expect(mockOnValueChange).toHaveBeenCalledTimes(1);
        expect(mockOnValueChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 1 }}));
    });

    test('Test entering the max option', () => {
        const mockOnValueChange = jest.fn();
        const { queryByText, queryByLabelText } = render(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfig}
                value={3}
                interview={interview} path={''} user={user}
            />
        );

        // Find the "4+" option
        const optionMax = queryByText("4+");
        expect(optionMax).toBeTruthy();
    
        // Click on the option button
        fireEvent.click(optionMax as any);
        expect(mockOnValueChange).toHaveBeenCalledTimes(1);
        expect(mockOnValueChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 4 }}));

        // Find the text input
        const input = queryByLabelText("SpecifyAboveLimit:");
        expect(input).toBeTruthy();

        // Enter a value in the input
        fireEvent.change(input as any, { target: { value: '5' } });
        fireEvent.blur(input as any);
        expect(mockOnValueChange).toHaveBeenCalledTimes(2);
        expect(mockOnValueChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 5 }}));

        // Reset to empty string so it appears unanswered
        fireEvent.change(input as any, { target: { value: '' } });
        fireEvent.blur(input as any);
        expect(mockOnValueChange).toHaveBeenCalledTimes(3);
        expect(mockOnValueChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: undefined }}));

        // Find the text input
        const inputAfterReset = queryByLabelText("SpecifyAboveLimit:");
        expect(inputAfterReset).toBeFalsy();

    });

    test('Test entering the 0 option', () => {
        const mockOnValueChange = jest.fn();
        const { queryByText, queryByLabelText } = render(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfig}
                value={3}
                interview={interview} path={''} user={user}
            />
        );

        // Find the "0" option
        const option0 = queryByText("0");
        expect(option0).toBeTruthy();
    
        // Click on the option 0
        fireEvent.click(option0 as any);
        expect(mockOnValueChange).toHaveBeenCalledTimes(1);
        expect(mockOnValueChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 0 }}));

        // Find the text input
        const input = queryByLabelText("SpecifyAboveLimit:");
        expect(input).toBeFalsy();

    });

});