/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { WidgetConfig } from './WidgetConfig';

// Files in this directory should contain only types and type guards-like functions
export * from './Data';
export * from './WidgetConfig';
export * from './SectionConfig';

export const isWidgetModal = (widgetConfig: WidgetConfig): boolean => (widgetConfig as any).isModal === true;
