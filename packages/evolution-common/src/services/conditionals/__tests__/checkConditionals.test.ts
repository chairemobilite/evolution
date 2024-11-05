/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import each from 'jest-each';
import { checkConditionals } from '../checkConditionals';

const interview = {
    responses: {
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

each([
    [
        '­wrongPath === \'null\', should return true.',
        [
            {
                path: 'wrongPath',
                comparisonOperator: '===',
                value: 'null'
            }
        ],
        [true, null]
    ],
    [
        '­wrongPath === \'something\', should return false.',
        [
            {
                path: 'wrongPath',
                comparisonOperator: '===',
                value: 'something'
            }
        ],
        [false, null]
    ],
    [
        '_isString === interview.responses._isString, should return true.',
        [
            {
                path: '_isString',
                comparisonOperator: '===',
                value: interview.responses._isString
            }
        ],
        [true, null]
    ],
    [
        '_isString !== interview.responses._isString, should return false.',
        [
            {
                path: '_isString',
                comparisonOperator: '!==',
                value: interview.responses._isString
            }
        ],
        [false, null]
    ],
    [
        '_isNull !== \'null\', should return false.',
        [
            {
                path: '_isNull',
                comparisonOperator: '!==',
                value: 'null'
            }
        ],
        [false, null]
    ],
    [
        '_isNull === \'null\', should return true.',
        [
            {
                path: '_isNull',
                comparisonOperator: '===',
                value: 'null'
            }
        ],
        [true, null]
    ],
    [
        '_isArray !== \'null\', should return true.',
        [
            {
                path: '_isArray',
                comparisonOperator: '!==',
                value: 'null'
            }
        ],
        [true, null]
    ],
    [
        '_isEmptyArray === \'null\', should return true.',
        [
            {
                path: '_isEmptyArray',
                comparisonOperator: '===',
                value: 'null'
            }
        ],
        [true, null]
    ],
    [
        '_isNull >= \'null\', should return false.',
        [
            {
                path: '_isNull',
                comparisonOperator: '>=',
                value: 'null'
            }
        ],
        [false, null]
    ],
    [
        '_isArray === \'a\', should return true, because \'a\' is inside array.',
        [
            {
                path: '_isArray',
                comparisonOperator: '===',
                value: 'a'
            }
        ],
        [true, null]
    ],
    [
        '_isArray !== \'d\', should return true, because \'d\' is not inside array.',
        [
            {
                path: '_isArray',
                comparisonOperator: '!==',
                value: 'd'
            }
        ],
        [true, null]
    ],
    [
        'Wrong comparison operator with array, should return false.',
        [
            {
                path: '_isArray',
                comparisonOperator: 'wrongComparisonOperator',
                value: 'a'
            }
        ],
        [false, null]
    ],
    [
        '_isTrueBoolean === interview.responses._isTrueBoolean, should return true.',
        [
            {
                path: '_isTrueBoolean',
                comparisonOperator: '===',
                value: interview.responses._isTrueBoolean
            }
        ],
        [true, null]
    ],
    [
        'Wrong comparison operator with boolean, should return false.',
        [
            {
                path: '_isTrueBoolean',
                comparisonOperator: 'wrongComparisonOperator',
                value: interview.responses._isTrueBoolean
            }
        ],
        [false, null]
    ],
    [
        '_isNumber1 === 1, should return true.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '===',
                value: 1
            }
        ],
        [true, null]
    ],
    [
        '_isNumber1 === 2, should return false.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '===',
                value: 2
            }
        ],
        [false, null]
    ],
    [
        '_isNumber1 !== 2, should return true.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '!==',
                value: 2
            }
        ],
        [true, null]
    ],
    [
        '_isNumber1 !== 1, should return false.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '!==',
                value: 1
            }
        ],
        [false, null]
    ],
    [
        '_isNumber1 > 0, should return true.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '>',
                value: 0
            }
        ],
        [true, null]
    ],
    [
        '_isNumber1 > 1, should return false.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '>',
                value: 1
            }
        ],
        [false, null]
    ],
    [
        '_isNumber1 < 2, should return true.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '<',
                value: 2
            }
        ],
        [true, null]
    ],
    [
        '_isNumber1 < 1, should return false.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '<',
                value: 1
            }
        ],
        [false, null]
    ],
    [
        '_isNumber1 >= 1, should return true.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '>=',
                value: 1
            }
        ],
        [true, null]
    ],
    [
        '_isNumber1 >= 2, should return false.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '>=',
                value: 2
            }
        ],
        [false, null]
    ],
    [
        '_isNumber1 >= 0, should return true.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '>=',
                value: 0
            }
        ],
        [true, null]
    ],
    [
        '_isNumber1 <= 2, should return true.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '<=',
                value: 2
            }
        ],
        [true, null]
    ],
    [
        '_isNumber1 <= 1, should return true.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '<=',
                value: 1
            }
        ],
        [true, null]
    ],
    [
        'Wrong comparison operator with number, should return false.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: 'wrongComparisonOperator',
                value: 1
            }
        ],
        [false, null]
    ],
    [
        '_isNumber1 === { object: \'invalid\' }, should return false.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '===',
                value: { object: 'invalid' }
            }
        ],
        [false, null]
    ],
    [
        '_isNumber1 === 1 && _isNumber1 === 0, should return false.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '===',
                value: 1
            },
            { path: '_isNumber1', comparisonOperator: '===', value: 0, logicalOperator: '&&' }
        ],
        [false, null]
    ],
    [
        '_isNumber1 === 1 || _isNumber1 === 0, should return true.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '===',
                value: 1
            },
            { path: '_isNumber1', comparisonOperator: '===', value: 0, logicalOperator: '||' }
        ],
        [true, null]
    ],
    [
        '_isNumber1 === 1 && (_isNumber1 === 0 || _isNumber1 === 1), should return true.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '===',
                value: 1
            },
            { path: '_isNumber1', comparisonOperator: '===', value: 0, logicalOperator: '&&', parentheses: '(' },
            { path: '_isNumber1', comparisonOperator: '===', value: 1, logicalOperator: '||', parentheses: ')' }
        ],
        [true, null]
    ],
    [
        '_isNumber1 === 1 || (_isNumber1 === 0 && _isNumber1 === 1), should return true.',
        [
            {
                path: '_isNumber1',
                comparisonOperator: '===',
                value: 1
            },
            { path: '_isNumber1', comparisonOperator: '===', value: 0, logicalOperator: '||', parentheses: '(' },
            { path: '_isNumber1', comparisonOperator: '===', value: 1, logicalOperator: '&&', parentheses: ')' }
        ],
        [true, null]
    ],
    [
        'household.persons.{_activePersonId}.age === 33, should return true.',
        [
            {
                path: 'household.persons.{_activePersonId}.age',
                comparisonOperator: '===',
                value: 33
            }
        ],
        [true, null]
    ],
    [
        'household.persons.{wrongField}.age === 33, should return false.',
        [
            {
                path: 'household.persons.{wrongField}.age',
                comparisonOperator: '===',
                value: 33
            }
        ],
        [false, null]
    ]
    // TODO: Uncomment the following test when the checkConditionals function is fixed for this case
    // [
    //     '_isNumber1 === 1 && (_isNumber1 === 0 || _isNumber1 === 1, should return an error because of missing parentheses.',
    //     [
    //         {
    //             path: '_isNumber1',
    //             comparisonOperator: '===',
    //             value: 1
    //         },
    //         { path: '_isNumber1', comparisonOperator: '===', value: 0, logicalOperator: '&&', parentheses: '(' },
    //         { path: '_isNumber1', comparisonOperator: '===', value: 1, logicalOperator: '||' }
    //     ],
    //     [false, null] // Should return an error
    // ]
]).test('%s', async (_testTitle, conditionals, expected) => {
    const returnValues = checkConditionals({ interview, conditionals });
    console.log(returnValues);
    expect(returnValues).toEqual(expected);
});
