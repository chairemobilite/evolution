/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { checkConditionals } from '../checkConditionals';

const interview = {
    response: {
        _activePersonId: 'bb6c33d8-5b68-4eb4-a031-2ffad0fd2ba5',
        _isNull: null,
        _isArray: ['a', 'b', 'c'],
        _isEmptyArray: [],
        _isString: 'a',
        _isTrueBoolean: true,
        _isNumber1: 1,
        household: {
            size: 1,
            persons: {
                'bb6c33d8-5b68-4eb4-a031-2ffad0fd2ba5': {
                    age: 33
                }
            }
        }
    }
};

const testCases: Array<{
    testTitle: string;
    conditionals: unknown;
    expected: unknown;
    defaultValue?: unknown;
    expectedConsoleError?: {
        message: string;
        data: Record<string, unknown>;
    };
}> = [
    {
        testTitle: '­wrongPath === \'null\', should return true.',
        conditionals: [
            {
                path: 'wrongPath',
                comparisonOperator: '===',
                value: 'null'
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: '­wrongPath === \'something\', should return false.',
        conditionals: [
            {
                path: 'wrongPath',
                comparisonOperator: '===',
                value: 'something'
            }
        ],
        expected: [false, null]
    },
    {
        testTitle: '_isString === interview.response._isString, should return true.',
        conditionals: [
            {
                path: '_isString',
                comparisonOperator: '===',
                value: interview.response._isString
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: '_isString !== interview.response._isString, should return false.',
        conditionals: [
            {
                path: '_isString',
                comparisonOperator: '!==',
                value: interview.response._isString
            }
        ],
        expected: [false, null]
    },
    {
        testTitle: '_isNull !== \'null\', should return false.',
        conditionals: [
            {
                path: '_isNull',
                comparisonOperator: '!==',
                value: 'null'
            }
        ],
        expected: [false, null]
    },
    {
        testTitle: '_isNull === \'null\', should return true.',
        conditionals: [
            {
                path: '_isNull',
                comparisonOperator: '===',
                value: 'null'
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: '_isArray !== \'null\', should return true.',
        conditionals: [
            {
                path: '_isArray',
                comparisonOperator: '!==',
                value: 'null'
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: '_isEmptyArray === \'null\', should return true.',
        conditionals: [
            {
                path: '_isEmptyArray',
                comparisonOperator: '===',
                value: 'null'
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: '_isNull >= \'null\', should return false.',
        conditionals: [
            {
                path: '_isNull',
                comparisonOperator: '>=',
                value: 'null'
            }
        ],
        expected: [false, null]
    },
    {
        testTitle: '_isArray === \'a\', should return true, because \'a\' is inside array.',
        conditionals: [
            {
                path: '_isArray',
                comparisonOperator: '===',
                value: 'a'
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: '_isArray !== \'d\', should return true, because \'d\' is not inside array.',
        conditionals: [
            {
                path: '_isArray',
                comparisonOperator: '!==',
                value: 'd'
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: 'Wrong comparison operator with array, should return false.',
        conditionals: [
            {
                path: '_isArray',
                comparisonOperator: 'wrongComparisonOperator',
                value: 'a'
            }
        ],
        expected: [false, null]
    },
    {
        testTitle: '_isTrueBoolean === interview.response._isTrueBoolean, should return true.',
        conditionals: [
            {
                path: '_isTrueBoolean',
                comparisonOperator: '===',
                value: interview.response._isTrueBoolean
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: 'Wrong comparison operator with boolean, should return false.',
        conditionals: [
            {
                path: '_isTrueBoolean',
                comparisonOperator: 'wrongComparisonOperator',
                value: interview.response._isTrueBoolean
            }
        ],
        expected: [false, null]
    },
    {
        testTitle: '_isNumber1 === 1, should return true.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '===',
                value: 1
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: '_isNumber1 === 2, should return false.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '===',
                value: 2
            }
        ],
        expected: [false, null]
    },
    {
        testTitle: '_isNumber1 !== 2, should return true.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '!==',
                value: 2
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: '_isNumber1 !== 1, should return false.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '!==',
                value: 1
            }
        ],
        expected: [false, null]
    },
    {
        testTitle: '_isNumber1 > 0, should return true.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '>',
                value: 0
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: '_isNumber1 > 1, should return false.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '>',
                value: 1
            }
        ],
        expected: [false, null]
    },
    {
        testTitle: '_isNumber1 < 2, should return true.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '<',
                value: 2
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: '_isNumber1 < 1, should return false.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '<',
                value: 1
            }
        ],
        expected: [false, null]
    },
    {
        testTitle: '_isNumber1 >= 1, should return true.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '>=',
                value: 1
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: '_isNumber1 >= 2, should return false.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '>=',
                value: 2
            }
        ],
        expected: [false, null]
    },
    {
        testTitle: '_isNumber1 >= 0, should return true.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '>=',
                value: 0
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: '_isNumber1 <= 2, should return true.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '<=',
                value: 2
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: '_isNumber1 <= 1, should return true.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '<=',
                value: 1
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: 'Wrong comparison operator with number, should return false.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: 'wrongComparisonOperator',
                value: 1
            }
        ],
        expected: [false, null]
    },
    {
        testTitle: '_isNumber1 === { object: \'invalid\' }, should return false.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '===',
                value: { object: 'invalid' }
            }
        ],
        expected: [false, null]
    },
    {
        testTitle: '_isNumber1 === 1 && _isNumber1 === 0, should return false.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '===',
                value: 1
            },
            { path: '_isNumber1', comparisonOperator: '===', value: 0, logicalOperator: '&&' }
        ],
        expected: [false, null]
    },
    {
        testTitle: '_isNumber1 === 1 || _isNumber1 === 0, should return true.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '===',
                value: 1
            },
            { path: '_isNumber1', comparisonOperator: '===', value: 0, logicalOperator: '||' }
        ],
        expected: [true, null]
    },
    {
        testTitle: '_isNumber1 === 1 && (_isNumber1 === 0 || _isNumber1 === 1), should return true.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '===',
                value: 1
            },
            { path: '_isNumber1', comparisonOperator: '===', value: 0, logicalOperator: '&&', parentheses: '(' },
            { path: '_isNumber1', comparisonOperator: '===', value: 1, logicalOperator: '||', parentheses: ')' }
        ],
        expected: [true, null]
    },
    {
        testTitle: '_isNumber1 === 1 || (_isNumber1 === 0 && _isNumber1 === 1), should return true.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '===',
                value: 1
            },
            { path: '_isNumber1', comparisonOperator: '===', value: 0, logicalOperator: '||', parentheses: '(' },
            { path: '_isNumber1', comparisonOperator: '===', value: 1, logicalOperator: '&&', parentheses: ')' }
        ],
        expected: [true, null]
    },
    {
        testTitle: 'household.persons.{_activePersonId}.age === 33, should return true.',
        conditionals: [
            {
                path: 'household.persons.{_activePersonId}.age',
                comparisonOperator: '===',
                value: 33
            }
        ],
        expected: [true, null]
    },
    {
        testTitle: 'household.persons.{wrongField}.age === 33, should return false.',
        conditionals: [
            {
                path: 'household.persons.{wrongField}.age',
                comparisonOperator: '===',
                value: 33
            }
        ],
        expected: [false, null]
    },
    {
        testTitle: '_isString === interview.response._isString with defaultValue, should return [true, defaultValue].',
        conditionals: [
            {
                path: '_isString',
                comparisonOperator: '===',
                value: interview.response._isString
            }
        ],
        defaultValue: 'defaultValue',
        expected: [true, 'defaultValue']
    },
    {
        testTitle:
            '_isTrueBoolean === interview.response._isTrueBoolean with false for defaultValue, should return [true, defaultValue].',
        conditionals: [
            {
                path: '_isTrueBoolean',
                comparisonOperator: '===',
                value: interview.response._isTrueBoolean
            }
        ],
        defaultValue: false,
        expected: [true, false]
    },
    {
        testTitle:
            '_isNumber1 === 1 && (_isNumber1 === 0 || _isNumber1 === 1, should return false because of missing closing parenthesis.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '===',
                value: 1
            },
            { path: '_isNumber1', comparisonOperator: '===', value: 0, logicalOperator: '&&', parentheses: '(' },
            { path: '_isNumber1', comparisonOperator: '===', value: 1, logicalOperator: '||' }
        ],
        expectedConsoleError: {
            message: 'checkConditionals: Unbalanced parentheses (missing closing parenthesis) in conditionals',
            data: { parenthesesBalance: 1 }
        },
        expected: [false, null]
    },
    {
        testTitle:
            '_isNumber1 === 1) with a closing parenthesis first, should return false because of closing parenthesis without opening.',
        conditionals: [
            {
                path: '_isNumber1',
                comparisonOperator: '===',
                value: 1,
                parentheses: ')'
            }
        ],
        expectedConsoleError: {
            message: 'checkConditionals: Unbalanced parentheses (closing without opening) in conditionals',
            data: { index: 0, parenthesesBalance: -1 }
        },
        expected: [false, null]
    }
];

test.each(testCases)('$testTitle', ({ conditionals, expected, defaultValue, expectedConsoleError }) => {
    const consoleErrorSpy = expectedConsoleError
        ? jest.spyOn(console, 'error').mockImplementation(() => undefined)
        : null;
    const returnValues = checkConditionals({
        interview,
        conditionals: conditionals as Parameters<typeof checkConditionals>[0]['conditionals'],
        defaultValue
    });
    expect(returnValues).toEqual(expected);
    if (expectedConsoleError) {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expectedConsoleError.message,
            expect.objectContaining(expectedConsoleError.data)
        );
        consoleErrorSpy?.mockRestore();
    }
});
