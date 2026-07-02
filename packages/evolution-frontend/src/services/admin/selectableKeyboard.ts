/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { KeyboardEvent } from 'react';

/**
 * Whether a key should activate a selectable control (Enter or Space).
 * @param key - KeyboardEvent.key value
 * @returns True when the key activates button-like controls
 */
export const isKeyboardActivationKey = (key: string): boolean => key === 'Enter' || key === ' ';

/**
 * Stops bubbling for activation keys only so other keys can reach ancestor handlers.
 * @param event - Keyboard event from a nested interactive control
 */
export const stopActivationKeyPropagation = (event: KeyboardEvent): void => {
    if (isKeyboardActivationKey(event.key)) {
        event.stopPropagation();
    }
};

/**
 * Returns an `onKeyDown` handler that activates the action on Enter or Space.
 * @param activate - Callback to run when the key press should activate the control
 * @param options - Optional keyboard handler behaviour
 * @returns Keyboard event handler for selectable widgets
 */
export const createKeyboardActivateHandler =
    (activate: () => void, options?: { stopPropagation?: boolean }) => (event: KeyboardEvent) => {
        if (isKeyboardActivationKey(event.key)) {
            event.preventDefault();
            activate();
            if (options?.stopPropagation) {
                event.stopPropagation();
            }
        }
    };
