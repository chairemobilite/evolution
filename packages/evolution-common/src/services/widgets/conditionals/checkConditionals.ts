/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { getResponse, interpolatePath } from '../../../utils/helpers';

// Type definitions for conditionals, logical operators and comparison operators
type PathType = string;
type ComparisonOperatorsType = '===' | '!==' | '>' | '<' | '>=' | '<=';
type ValueType = string | number | boolean;
type logicalOperatorsType = '&&' | '||';
type ParenthesesType = '(' | ')';
type SingleConditionalsType = {
    logicalOperator?: logicalOperatorsType;
    path: PathType;
    comparisonOperator: ComparisonOperatorsType;
    value: ValueType;
    parentheses?: ParenthesesType;
};
type ConditionalsType = SingleConditionalsType[];

/**
 * Evaluates a list of conditionals against an interview response.
 *
 * Each conditional compares the value at `path` (resolved from `interview.response`, with path placeholders like
 * `{someField}` interpolated from the interview response) to the provided `value`, then combines the boolean results
 * using `logicalOperator` and optional `parentheses`.
 *
 * @param params.interview Interview object containing `response`
 * @param params.conditionals List of conditionals to evaluate (combined left-to-right)
 * @param params.defaultValue Optional value returned as the 2nd tuple element; defaults to `null` when omitted
 * @returns A tuple `[result, defaultValueOrNull]`
 */
export const checkConditionals = ({
    interview,
    conditionals,
    defaultValue
}: {
    interview;
    conditionals: ConditionalsType;
    defaultValue?: unknown; // Note: When 'defaultValue' is not provided, it defaults to null.
}): [boolean, unknown | null] => {
    let mathExpression = ''; // Construct the math expression to be evaluated

    // Iterate through the provided conditionals
    conditionals.forEach((conditional, index) => {
        // Extract components of the conditional
        const { logicalOperator, path, comparisonOperator, value, parentheses } = conditional;

        // Replace response placeholders specified between brackets in a path by the corresponding value in the interview response.
        const interpolatedPath = interpolatePath(interview, path);

        // Get the response for the interpolated path
        const response = getResponse(interview, interpolatedPath, null);
        let conditionMet: boolean;

        // Evaluate if the condition is met
        if (value === 'null') {
            // For value 'null', check if the response is null
            switch (comparisonOperator) {
            case '===':
                if (Array.isArray(response)) {
                    // For Array
                    conditionMet = response.length === 0;
                } else {
                    // For String or Boolean
                    conditionMet = response === null;
                }
                break;
            case '!==':
                if (Array.isArray(response)) {
                    // For Array
                    conditionMet = response.length !== 0;
                } else {
                    // For String or Boolean
                    conditionMet = response !== null;
                }
                break;
            default:
                conditionMet = false;
                break;
            }
        } else if (
            (typeof response === 'string' && typeof value === 'string') ||
            (typeof response === 'boolean' && typeof value === 'boolean')
        ) {
            // For String or Boolean
            switch (comparisonOperator) {
            case '===':
                conditionMet = response === value;
                break;
            case '!==':
                conditionMet = response !== value;
                break;
            default:
                conditionMet = false;
                break;
            }
        } else if (typeof value === 'number') {
            // For Number
            switch (comparisonOperator) {
            case '===':
                conditionMet = Number(response) === value;
                break;
            case '!==':
                conditionMet = Number(response) !== value;
                break;
            case '>':
                conditionMet = Number(response) > value;
                break;
            case '<':
                conditionMet = Number(response) < value;
                break;
            case '>=':
                conditionMet = Number(response) >= value;
                break;
            case '<=':
                conditionMet = Number(response) <= value;
                break;
            default:
                conditionMet = false;
                break;
            }
        } else if (Array.isArray(response)) {
            // For Array
            switch (comparisonOperator) {
            case '===':
                conditionMet = response.includes(value);
                break;
            case '!==':
                conditionMet = !response.includes(value);
                break;
            default:
                conditionMet = false;
                break;
            }
        } else {
            // Handle other response types if necessary
            conditionMet = false;
        }

        const parenthesesStart = parentheses === '(' ? '(' : ''; // Add an opening parentheses if necessary
        const parenthesesEnd = parentheses === ')' ? ')' : ''; // Add a closing parentheses if necessary

        if (index === 0) {
            // For the first condition, initialize the result
            mathExpression = parenthesesStart + conditionMet + parenthesesEnd;
        } else if (logicalOperator === '||') {
            mathExpression += ' || ' + parenthesesStart + conditionMet + parenthesesEnd; // Add the result to the final result
        } else if (logicalOperator === '&&') {
            mathExpression += ' && ' + parenthesesStart + conditionMet + parenthesesEnd; // Add the result to the final result
        }
    });

    // FIXME: This eval() is a security risk, and should be replaced with a safer alternative
    // Evaluate the final result using eval() to handle logical operators
    const finalResult: boolean = eval(mathExpression);

    // Return the final result with the defaultValue if provided, otherwise return null
    return [finalResult, defaultValue ?? null];
};
