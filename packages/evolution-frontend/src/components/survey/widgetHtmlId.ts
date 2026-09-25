/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Value of the `data-widget-id` attribute: `section-shortname`.
 * The same widget in two grouped objects shares this value.
 *
 * @param section Section shortname
 * @param shortname Widget shortname
 * @returns The attribute value
 */
export const widgetHtmlId = (section: string, shortname: string): string => `${section}-${shortname}`;
