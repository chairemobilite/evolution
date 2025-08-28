/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';

export type FormattedInputProps = {
    id: string;
    name: string;
    value: string | undefined;
    onChange: (value: string) => void;
    formatValue?: (value: string) => string;
    placeholder?: string;
    autoComplete?: string;
    onKeyUp?: (e: React.KeyboardEvent) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    maxLength?: number;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
    className?: string;
    style?: React.CSSProperties;
    inputRef?: React.RefObject<HTMLInputElement>;
    type?: string;
};

/**
 * Wrapper around an input of type text to support formatting while typing. The
 * formatting function should return the formatted value given the input value.
 * The component will handle the cursor position to keep it as close as possible
 * to the original position and avoid jumps to the end of the input if the value
 * is changed by formatting.
 *
 * @param props
 * @returns
 */
const FormattedInput: React.FC<FormattedInputProps> = ({
    id,
    name,
    value,
    onChange,
    formatValue,
    placeholder,
    autoComplete,
    onKeyUp,
    onBlur,
    maxLength,
    inputMode,
    className = 'apptr__form-input apptr__form-input-string apptr__input apptr__input-string',
    style,
    inputRef: externalInputRef,
    type = 'text'
}) => {
    const internalInputRef = React.useRef<HTMLInputElement>(null);
    const inputRef = externalInputRef || internalInputRef;
    const [cursorPosition, setCursorPosition] = React.useState(0);

    // Calculate the adjusted cursor position after formatting
    const calculateAdjustedCursorPosition = (
        inputValue: string,
        formattedValue: string,
        previousPosition: number
    ): number => {
        // If the formatted value is shorter than the cursor position, move cursor to end
        if (formattedValue.length <= previousPosition) {
            return formattedValue.length;
        }

        // If the formatted value is longer than the previous value, we may need to adjust the cursor position
        if (formattedValue.length > inputValue.length) {
            const lengthDifference = formattedValue.length - inputValue.length;
            // FIXME Technically, it depends on where the new formatting occurs, if
            // before cursor position, then we update, otherwise, we should keep the
            // position. But it is hard to know without more complex diffing

            // If the string after the cursor position is the same as the end of
            // the new value, we can safely move the cursor forward as the
            // difference is probably before the cursor
            if (inputValue.slice(previousPosition) === formattedValue.slice(previousPosition + lengthDifference)) {
                return previousPosition + lengthDifference;
            }
        }
        // FIXME This is not perfect, the strings may be the same length but
        // have new spacing, also, the previous `if` works if we add characters,
        // but if we erased one and it comes back, the position should not be
        // incremented but kept as is (for example, removing the space from the
        // postal code with backspace). We should probably also compare with the
        // previous value before the change to get the real deal. There's room
        // for improvement

        // Attempt to maintain the same relative position
        return previousPosition;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const currentPosition = input.selectionStart || 0;
        const inputValue = input.value;

        // Store the cursor position before formatting
        setCursorPosition(currentPosition);

        // Apply formatting if provided
        const formattedValue = formatValue ? formatValue(inputValue) : inputValue;

        // Update parent component with the new value
        onChange(formattedValue);

        // Calculate the new cursor position if the value changed due to formatting
        if (formattedValue !== inputValue) {
            const newPosition = calculateAdjustedCursorPosition(inputValue, formattedValue, currentPosition);
            setCursorPosition(newPosition);
        }
    };

    // Apply the stored cursor position after render
    React.useEffect(() => {
        if (inputRef.current) {
            inputRef.current.selectionStart = cursorPosition;
            inputRef.current.selectionEnd = cursorPosition;
        }
    }, [value, cursorPosition, inputRef]);

    return (
        <input
            name={name}
            id={id}
            type={type}
            placeholder={placeholder}
            className={className}
            value={value}
            onChange={handleInputChange}
            onKeyUp={onKeyUp}
            onBlur={onBlur}
            autoComplete={autoComplete}
            ref={inputRef}
            maxLength={maxLength}
            inputMode={inputMode}
            style={style}
        />
    );
};

export default FormattedInput;
