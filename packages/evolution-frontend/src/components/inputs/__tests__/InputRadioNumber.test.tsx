/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import InputRadioNumber from "../InputRadioNumber";
import {UserPermissions} from "chaire-lib-common/lib/services/user/userType";
import { render, screen, fireEvent } from '@testing-library/react';
// Required for matchers to be available
import '@testing-library/jest-dom';

// Mock frontend helper to avoid undefined config error
jest.mock('../../../services/display/frontendHelper', () => ({
    stripUnsafeHtml: jest.fn().mockImplementation(str => str)
}));

const interview = {
    id: 1,
    uuid: "",
    participant_id: 1,
    is_completed: false,
    response: {},
    validations: {},
    is_valid: true
};

const user = {
    id: 1,
    username: '',
    serializedPermissions: [],
    preferences: {},
    isAuthorized: (permissions: UserPermissions) => false,
    is_admin: false,
    pages: [],
    showUserInfo: false,
};

const baseWidgetConfig = {
    type: 'question' as const,
    label: 'test',
    path: 'test.radioNumber'
};

const additionalChoices = [
    { value: 'custom1', label: 'Custom value 1' },
    { value: 'custom2', label: 'Custom value 2' },
    { value: 'custom with false conditional', label: 'Snapshots should not contain this string', conditional: jest.fn().mockReturnValue(false) },
    { value: 'custom with true conditional', label: 'Should be in snapshots', conditional: jest.fn().mockReturnValue(true) },
    { value: 'hidden choice', label: 'Snapshots should not contain this hidden string', hidden: true }
];

const widgetConfig = {
    ...baseWidgetConfig,
    inputType: 'radioNumber' as const,
    valueRange: { min: 1, max: 3 },
    overMaxAllowed: false
};

const widgetConfigOverMax = {
    ...baseWidgetConfig,
    inputType: 'radioNumber' as const,
    valueRange: { min: 1, max: 3 },
    overMaxAllowed: true
};

const widgetConfigWithAdditionalChoices = {
    ...widgetConfigOverMax,
    additionalChoices
};

describe('Render InputRadioNumber', () => {

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

    test('InputRadioNumber additional choices, with a number selected value', () => {
        const { container } = render(
            <InputRadioNumber
                id={'test'}
                value={4}
                widgetConfig={widgetConfigWithAdditionalChoices}
                onValueChange={(e) => null}
                interview={interview} path={''} user={user}
            />
        );
        expect(container).toMatchSnapshot();
    });

    test('InputRadioNumber additional choices, with string selected value', () => {
        const { container } = render(
            <InputRadioNumber
                id={'test'}
                value={additionalChoices[0].value}
                widgetConfig={widgetConfigWithAdditionalChoices}
                onValueChange={(e) => null}
                interview={interview} path={''} user={user}
            />
        );
        expect(container).toMatchSnapshot();
    });

    test('InputRadioNumber additional choices, with invisible string selected value, should be no selection', () => {
        const { container } = render(
            <InputRadioNumber
                id={'test'}
                value={additionalChoices[2].value}
                widgetConfig={widgetConfigWithAdditionalChoices}
                onValueChange={(e) => null}
                interview={interview} path={''} user={user}
            />
        );
        expect(container).toMatchSnapshot();
    });

    test('InputRadioNumber additional choices, no selected value', () => {
        const { container } = render(
            <InputRadioNumber
                id={'test'}
                widgetConfig={widgetConfigWithAdditionalChoices}
                onValueChange={(e) => null}
                interview={interview} path={''} user={user}
            />
        );
        expect(container).toMatchSnapshot();
    });

    test('InputRadioNumber with additional choices as functions', () => {
        const additionalChoicesParsingFct = jest.fn().mockReturnValue(additionalChoices);
        const widgetConfigWithParsingAdditionalChoices = {
            ...widgetConfigOverMax,
            additionalChoices: additionalChoicesParsingFct
        };
        const path = 'widget.path';
        const { container } = render(
            <InputRadioNumber
                id={'test'}
                widgetConfig={widgetConfigWithParsingAdditionalChoices}
                onValueChange={(e) => null}
                interview={interview} path={path} user={user}
            />
        );
        expect(container).toMatchSnapshot();
        expect(additionalChoicesParsingFct).toHaveBeenCalledWith(interview, path)
    });

});

describe('InputRadioNumber onChange', () => {

    test('Test with a radio option', () => {
        const mockOnValueChange = jest.fn();
        const { queryByText } = render(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfigOverMax}
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
                widgetConfig={widgetConfigOverMax}
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
        // Make sure the 0 option is available
        const widgetConfigWithZero = {
            ...widgetConfigOverMax,
            valueRange: { min: 0, max: 3 }
        }
        const mockOnValueChange = jest.fn();
        const { queryByText, queryByLabelText } = render(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfigWithZero}
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

    test('Test an additional choice value', () => {
        const mockOnValueChange = jest.fn();
        const { queryByText, queryByLabelText } = render(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfigWithAdditionalChoices}
                value={3}
                interview={interview} path={''} user={user}
            />
        );

        // Find the input option with additional choice 1 label
        const stringOption1 = queryByText(additionalChoices[1].label);
        expect(stringOption1).toBeTruthy();

        // Click on the option
        fireEvent.click(stringOption1 as any);
        expect(mockOnValueChange).toHaveBeenCalledTimes(1);
        expect(mockOnValueChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: additionalChoices[1].value }}));

        // Find the text input
        const input = queryByLabelText("SpecifyAboveLimit:");
        expect(input).toBeFalsy();

    });

    test('Test a boolean additional choice value', () => {
        const widgetConfigWithBooleanChoices = {
            ...widgetConfigOverMax,
            additionalChoices: [
                { value: false, label: 'No' },
                { value: true, label: 'Yes' }
            ]
        }
        const mockOnValueChange = jest.fn();
        const { queryByText, queryByLabelText } = render(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfigWithBooleanChoices}
                value={3}
                interview={interview} path={''} user={user}
            />
        );

        // Find the 'No' option
        const booleanOption1 = queryByText('No');
        expect(booleanOption1).toBeTruthy();

        // Click on the option
        fireEvent.click(booleanOption1 as any);
        expect(mockOnValueChange).toHaveBeenCalledTimes(1);
        expect(mockOnValueChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: false }}));

        // Find the 'Yes' option
        const booleanOption2 = queryByText('Yes');
        expect(booleanOption2).toBeTruthy();

        // Click on the option
        fireEvent.click(booleanOption2 as any);
        expect(mockOnValueChange).toHaveBeenCalledTimes(2);
        expect(mockOnValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ target: { value: true }}));

    });

    test('Test a numeric value with additional choices present', () => {
        const mockOnValueChange = jest.fn();
        const { queryByText, queryByLabelText } = render(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfigWithAdditionalChoices}
                value={3}
                interview={interview} path={''} user={user}
            />
        );

        // Find the text input
        const inputTextBefore = queryByLabelText("SpecifyAboveLimit:");
        expect(inputTextBefore).toBeFalsy();

        // Find the "4+" option
        const optionMax = queryByText("4+");
        expect(optionMax).toBeTruthy();

        // Click on the option button
        fireEvent.click(optionMax as any);
        expect(mockOnValueChange).toHaveBeenCalledTimes(1);
        expect(mockOnValueChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 4 }}));

        // Find the text input
        const inputTextAfter = queryByLabelText("SpecifyAboveLimit:");
        expect(inputTextAfter).toBeTruthy();

    });

    test('Test a numeric over max value with additional choices present and switch to string value', () => {
        const mockOnValueChange = jest.fn();
        const { queryByText, queryByLabelText } = render(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfigWithAdditionalChoices}
                value={5}
                interview={interview} path={''} user={user}
            />
        );

        // Find the text input
        const inputTextBefore = queryByLabelText("SpecifyAboveLimit:");
        expect(inputTextBefore).toBeTruthy();

        // Find the input option with additional choice 1 label
        const stringOption1 = queryByText(additionalChoices[1].label);
        expect(stringOption1).toBeTruthy();

        // Click on the option
        fireEvent.click(stringOption1 as any);
        expect(mockOnValueChange).toHaveBeenCalledTimes(1);
        expect(mockOnValueChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: additionalChoices[1].value }}));

        // Find the text input
        const input = queryByLabelText("SpecifyAboveLimit:");
        expect(input).toBeFalsy();

    });

    test('Test props update: in range => over max', () => {
        const mockOnValueChange = jest.fn();
        // Render with a numeric value in range
        const { queryByLabelText, rerender } = render(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfigOverMax}
                value={3}
                interview={interview} path={''} user={user}
            />
        );

        // Find the text input
        const inputBefore = queryByLabelText("SpecifyAboveLimit:");
        expect(inputBefore).toBeFalsy();

        // Rerender with a value above max, the above limit text box should be there
        rerender(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfigOverMax}
                value={6}
                interview={interview} path={''} user={user}
            />
        );

        const option3 = screen.getByRole('radio', { name: '3' });
        const optionOverMax = screen.getByRole('radio', { name: '4+' });
        expect(option3).not.toBeChecked();
        expect(optionOverMax).toBeChecked();

        // Find and validate the text input
        const inputAfter = queryByLabelText("SpecifyAboveLimit:");
        expect(inputAfter).toBeInTheDocument();
        expect(inputAfter).toHaveValue(6);

    });

    test('Test props update: over max => additional choice', () => {
        const selectedAddtionalOption = additionalChoices[1];
        const mockOnValueChange = jest.fn();
        // Render with a value above max
        const { queryByLabelText, rerender } = render(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfigWithAdditionalChoices}
                value={7}
                interview={interview} path={''} user={user}
            />
        );

        const optionOverMax = screen.getByRole('radio', { name: '4+' });
        const optionAdditional = screen.getByRole('radio', { name: selectedAddtionalOption.label });
        expect(optionOverMax).toBeChecked();
        expect(optionAdditional).not.toBeChecked();

        // Find and validate the current
        const inputBefore = queryByLabelText("SpecifyAboveLimit:");
        expect(inputBefore).toBeInTheDocument();
        expect(inputBefore).toHaveValue(7);

        // Rerender with a selected option
        rerender(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfigWithAdditionalChoices}
                value={selectedAddtionalOption.value}
                interview={interview} path={''} user={user}
            />
        );

        // Validate current options
        const optionOverMaxAfter = screen.getByRole('radio', { name: '4+' });
        const optionAdditionalAfter = screen.getByRole('radio', { name: selectedAddtionalOption.label });
        const inputAfter = queryByLabelText("SpecifyAboveLimit:");

        expect(optionOverMaxAfter).not.toBeChecked();
        expect(optionAdditionalAfter).toBeChecked();
        expect(inputAfter).not.toBeInTheDocument();
    });

    test('Test props update: additional choice => numeric', () => {
        const selectedAddtionalOption = additionalChoices[1];
        const mockOnValueChange = jest.fn();
        // Render with an additional option
        const { queryByLabelText, rerender } = render(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfigWithAdditionalChoices}
                value={selectedAddtionalOption.value}
                interview={interview} path={''} user={user}
            />
        );

        const option2 = screen.getByRole('radio', { name: '2' });
        const optionAdditional = screen.getByRole('radio', { name: selectedAddtionalOption.label });
        expect(option2).not.toBeChecked();
        expect(optionAdditional).toBeChecked();

        // Find and validate the current
        const inputBefore = queryByLabelText("SpecifyAboveLimit:");
        expect(inputBefore).not.toBeInTheDocument();

        // Rerender with a numeric value
        rerender(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfigWithAdditionalChoices}
                value={2}
                interview={interview} path={''} user={user}
            />
        );

        // Validate current options
        const option2After = screen.getByRole('radio', { name: '2' });
        const optionAdditionalAfter = screen.getByRole('radio', { name: selectedAddtionalOption.label });
        const inputAfter = queryByLabelText("SpecifyAboveLimit:");

        expect(option2After).toBeChecked();
        expect(optionAdditionalAfter).not.toBeChecked();
        expect(inputAfter).not.toBeInTheDocument();
    });

    test('Test props update: over max => another over max value', () => {
        const mockOnValueChange = jest.fn();
        // Render with a value above max
        const { queryByLabelText, rerender } = render(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfigOverMax}
                value={7}
                interview={interview} path={''} user={user}
            />
        );

        const optionOverMax = screen.getByRole('radio', { name: '4+' });
        expect(optionOverMax).toBeChecked();

        // Find and validate the current
        const inputBefore = queryByLabelText("SpecifyAboveLimit:");
        expect(inputBefore).toBeInTheDocument();
        expect(inputBefore).toHaveValue(7);

        // Rerender with a value above max, the value should be properly updated.
        rerender(
            <InputRadioNumber
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfigWithAdditionalChoices}
                value={6}
                interview={interview} path={''} user={user}
            />
        );

        // Validate current options
        const optionOverMaxAfter = screen.getByRole('radio', { name: '4+' });
        const inputAfter = queryByLabelText("SpecifyAboveLimit:");

        expect(optionOverMaxAfter).toBeChecked();
        expect(inputBefore).toBeInTheDocument();
        expect(inputBefore).toHaveValue(6);
    });

});
