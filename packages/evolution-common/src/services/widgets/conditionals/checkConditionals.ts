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
type ValueType = string | number | boolean | null;
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
 * Use `value: null` to test for missing/null responses (and empty arrays for `===` / `!==`). The legacy string
 * sentinel `value: 'null'` is still accepted for older generated code.
 *
 * @param params.interview Interview object containing `response`
 * @param {ConditionalsType} params.conditionals List of conditionals to evaluate (combined left-to-right)
 * @param {ValueType} [params.valueWhenHidden] Optional value returned as the 2nd tuple element; defaults to `null` when omitted
 * @returns A tuple `[result, ValueType]`
 */
export const checkConditionals = ({
    interview,
    conditionals,
    valueWhenHidden
}: {
    interview;
    conditionals: ConditionalsType;
    valueWhenHidden?: ValueType; // Note: When 'valueWhenHidden' is not provided, it defaults to null.
}): [boolean, ValueType] => {
    let mathExpression = ''; // Construct the math expression to be evaluated
    let parenthesesBalance = 0; // Running balance: '(' +1, ')' -1. Must never go negative and must end at 0.
    let parenthesesInvalid = false; // If true, parentheses are unbalanced.

    // Iterate through the provided conditionals
    for (let index = 0; index < conditionals.length; index++) {
        const conditional = conditionals[index];
        // Extract components of the conditional
        const { logicalOperator, path, comparisonOperator, value, parentheses } = conditional;

        // Parentheses must be well-formed: you can't close before opening, and all opened '(' must be closed.
        if (parentheses === '(') {
            parenthesesBalance += 1;
        } else if (parentheses === ')') {
            parenthesesBalance -= 1;
            if (parenthesesBalance < 0) {
                parenthesesInvalid = true;
                throw new Error(
                    `checkConditionals: Unbalanced parentheses (closing without opening) in conditionals (index=${index})`
                );
            }
        }

        // Replace response placeholders specified between brackets in a path by the corresponding value in the interview response.
        const interpolatedPath = interpolatePath(interview, path);

        // Get the response for the interpolated path
        const response = getResponse(interview, interpolatedPath, null);
        let conditionMet: boolean;

        // Evaluate if the condition is met
        if (value === null || value === 'null') {
            // For null value, check if the response is null / empty array
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
        } else if (typeof value === 'number' && (typeof response === 'number' || typeof response === 'string')) {
            const responseAsNumber =
                typeof response === 'number'
                    ? response
                    : response.trim() !== '' && Number.isFinite(Number(response))
                        ? Number(response)
                        : NaN;
            // For Number values, when response is string or number
            switch (comparisonOperator) {
            case '===':
                conditionMet = responseAsNumber === value;
                break;
            case '!==':
                conditionMet = responseAsNumber !== value;
                break;
            case '>':
                conditionMet = responseAsNumber > value;
                break;
            case '<':
                conditionMet = responseAsNumber < value;
                break;
            case '>=':
                conditionMet = responseAsNumber >= value;
                break;
            case '<=':
                conditionMet = responseAsNumber <= value;
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
        } else {
            throw new Error(`checkConditionals: Missing logicalOperator for non-first conditional (index=${index})`);
        }
    }

    // If parentheses are unbalanced, consider the conditionals invalid
    if (parenthesesInvalid) {
        throw new Error('checkConditionals: Unbalanced parentheses in conditionals');
    }
    if (parenthesesBalance !== 0) {
        throw new Error(
            `checkConditionals: Unbalanced parentheses (missing closing parenthesis) in conditionals (balance=${parenthesesBalance})`
        );
    }

    // FIXME: This eval() is a security risk, and should be replaced with a safer alternative
    // Evaluate the final result using eval() to handle logical operators
    const finalResult: boolean = eval(mathExpression);

    // Return the final result with the valueWhenHidden if provided, otherwise return null
    return [finalResult, valueWhenHidden ?? null];
};
