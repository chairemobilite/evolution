/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { type WidgetConditional } from '../../questionnaire/types';

/**
 * Default conditional function for a widget.
 *
 * This function always returns `true`, indicating that the widget should always be displayed.
 *
 * @param _interview - The interview data (not used in this default implementation).
 * @returns `true` to indicate the widget should be displayed.
 */
export const defaultConditional: WidgetConditional = (_interview) => true;
