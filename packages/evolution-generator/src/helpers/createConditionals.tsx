/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { getResponse } from 'evolution-common/lib/utils/helpers';

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

// TODO: Make sure to add tests for this function
// Check interview responses with conditions, returning the result and null.
export const createConditionals = ({ interview, conditionals }: { interview; conditionals: ConditionalsType }) => {
    let mathExpression = ''; // Construct the math expression to be evaluated

    // Iterate through the provided conditionals
    conditionals.forEach((conditional, index) => {
        // Extract components of the conditional
        const { logicalOperator, path, comparisonOperator, value, parentheses } = conditional;
        const response = getResponse(interview, path, null);
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

    // Return the final result along with null (as per the function signature)
    return [finalResult, null];
};
