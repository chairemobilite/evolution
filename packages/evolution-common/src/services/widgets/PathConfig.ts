/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { ValidationFunction } from '../questionnaire/types/WidgetConfig';
import { ParserFunction } from '../parsers/ParserFunction';

/**
 * This type describes the paths in the responses field,
 * with data for validation and export.
 * Path config include custom admin validations,
 * flag to include the path in export files or not,
 * and parsers for custom changes to data before export
 * Keys are paths with uuids replaced by '@' and array indexes
 * replaced by '#'
 */
export type PathConfig = {
    // is the path metadata (included only in export files of type "with metadata")
    isMetadata?: boolean; // default to false except if attribute starts with "_"
    // whether to include the attribute when exporting:
    // (metadata will be excluded even in metadata export files if set to true)
    includeInExport?: boolean; // default to true
    // whether to validate the attribute:
    validate?: boolean; // default to true
    // custom admin validations:
    validations?: ValidationFunction;
    // rename attribute for export, default to undefined, which means no rename:
    rename?: string;
    // whether to auto add validations from the widget:
    includeWidgetValidations?: boolean; // default to true, ignored if validate is false
    // custom parser to change/manipulate/enhance value for export:
    parser?: ParserFunction;
    // export generated values from this value, uses the same function as the parser:
    // example: from _completedAt timestamp, generate completedAtDate and completedAtTime
    generatedValues?: {
        [key: string]: PathConfig;
    };
};
