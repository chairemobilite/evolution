/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { type WidgetConditional } from 'evolution-common/lib/services/questionnaire/types';

// Accept all the time
export const defaultConditional: WidgetConditional = (_interview) => true;
