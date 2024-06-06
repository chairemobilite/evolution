/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

export const devices = ['tablet', 'mobile', 'desktop', 'other', 'unknown'] as const;
export type Device = (typeof devices)[number];
