/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import each from 'jest-each';
import _cloneDeep from 'lodash/cloneDeep';
import { TFunction } from 'i18next';
import { interviewAttributesForTestCases } from '../../../tests/surveys';
import * as Helpers from '../helpers';
import projectConfig from '../../../config/project.config';
import { Journey, Person, Trip, UserInterviewAttributes } from '../../questionnaire/types';

const baseInterviewAttributes: Pick<
    UserInterviewAttributes,
    'id' | 'uuid' | 'participant_id' | 'is_completed' | 'is_questionable' | 'is_valid'
> = {
    id: 1,
    uuid: 'arbitrary uuid',
    participant_id: 1,
    is_completed: false,
    is_questionable: false,
    is_valid: true
};

const interviewAttributes: UserInterviewAttributes = {
    ...baseInterviewAttributes,
    response: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        }
    },
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    } as any,
    is_valid: true
};

const interviewAttributesWithHh: UserInterviewAttributes = {
    ...baseInterviewAttributes,
    response: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        },
        household: {
            size: 2,
            persons: {
                personId1: {
                    _uuid: 'personId1',
                    _sequence: 1
                },
                personId2: {
                    _uuid: 'personId2',
                    _sequence: 2
                }
            }
        }
    } as any,
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    } as any
};

beforeEach(() => {
    jest.clearAllMocks();
});

each([
    ['Has Household', interviewAttributesWithHh.response, interviewAttributesWithHh.response.household],
    ['Empty response', {}, {}]
]).test('getHousehold: %s', (_title, response, expected) => {
    const interview = _cloneDeep(interviewAttributes);
    interview.response = response;
    expect(Helpers.getHousehold({ interview })).toEqual(expected);
});

each([
    [
        'Person 1',
        interviewAttributesWithHh.response,
        'personId1',
        (interviewAttributesWithHh.response as any).household.persons.personId1
    ],
    [
        'Person 2',
        interviewAttributesWithHh.response,
        'personId2',
        (interviewAttributesWithHh.response as any).household.persons.personId2
    ],
    [
        'Undefined active person',
        interviewAttributesWithHh.response,
        undefined,
        (interviewAttributesWithHh.response as any).household.persons.personId1
    ],
    [
        'Empty persons',
        { household: { ...interviewAttributesWithHh.response.household, persons: {} } },
        'personId1',
        null
    ],
    ['Empty household', { household: {} }, undefined, null],
    ['Empty response', {}, 'personId', null]
]).test('getActivePerson: %s', (_title, response, currentPersonId, expected) => {
    const interview = _cloneDeep(interviewAttributesWithHh);
    interview.response = response;
    interview.response._activePersonId = currentPersonId;
    expect(Helpers.getActivePerson({ interview })).toEqual(expected);
});

describe('getPersons', () => {
    test('test without household', () => {
        expect(Helpers.getPersons({ interview: interviewAttributes })).toEqual({});
    });

    test('test without persons', () => {
        const attributes = _cloneDeep(interviewAttributes) as any;
        attributes.household = {};
        expect(Helpers.getPersons({ interview: attributes })).toEqual({});
    });

    test('empty persons', () => {
        const attributes = _cloneDeep(interviewAttributes) as any;
        attributes.household = { size: 0, persons: {} };
        expect(Helpers.getPersons({ interview: attributes })).toEqual({});
    });

    test('with persons', () => {
        expect(Helpers.getPersons({ interview: interviewAttributesWithHh })).toEqual(
            (interviewAttributesWithHh.response as any).household.persons
        );
    });

    test('array: test without household', () => {
        expect(Helpers.getPersonsArray({ interview: interviewAttributes })).toEqual([]);
    });

    test('array: test without persons', () => {
        const attributes = _cloneDeep(interviewAttributes) as any;
        attributes.household = {};
        expect(Helpers.getPersonsArray({ interview: attributes })).toEqual([]);
    });

    test('array: empty persons', () => {
        const attributes = _cloneDeep(interviewAttributes) as any;
        attributes.household = { size: 0, persons: {} };
        expect(Helpers.getPersonsArray({ interview: attributes })).toEqual([]);
    });

    test('array: with persons, unordered', () => {
        expect(Helpers.getPersonsArray({ interview: interviewAttributesWithHh })).toEqual(
            Object.values((interviewAttributesWithHh.response as any).household.persons)
        );
    });

    test('array: with persons, ordered', () => {
        const attributes = _cloneDeep(interviewAttributesWithHh) as any;
        attributes.response.household.persons.personId1._sequence = 2;
        attributes.response.household.persons.personId2._sequence = 1;
        expect(Helpers.getPersonsArray({ interview: attributes })).toEqual([
            attributes.response.household.persons.personId2,
            attributes.response.household.persons.personId1
        ]);
    });
});

each([
    [
        'personId param provided, returns correct person',
        interviewAttributesWithHh.response,
        { personId: 'personId1' },
        (interviewAttributesWithHh.response as any).household.persons.personId1
    ],
    [
        'personId param provided, non-existent person',
        interviewAttributesWithHh.response,
        { personId: 'unexistentPersonId' },
        null
    ],
    [
        'path param provided, matches household.persons.{personId}.',
        interviewAttributesWithHh.response,
        { path: 'household.persons.personId2.something' },
        (interviewAttributesWithHh.response as any).household.persons.personId2
    ],
    [
        'path param provided, does not match pattern',
        interviewAttributesWithHh.response,
        { path: 'household.something.personId2' },
        null
    ],
    [
        'no personId or path, uses _activePersonId',
        {
            ...interviewAttributesWithHh.response,
            _activePersonId: 'personId2'
        },
        {},
        (interviewAttributesWithHh.response as any).household.persons.personId2
    ],
    ['no personId or path, no _activePersonId', interviewAttributesWithHh.response, {}, null],
    [
        'path param provided, matches but person does not exist',
        interviewAttributesWithHh.response,
        { path: 'household.persons.unexistentPersonId.something' },
        null
    ],
    ['empty household', { household: {} }, { personId: 'personId1' }, null],
    ['empty response', {}, { personId: 'personId1' }, null]
]).test('getPerson: %s', (_title, response, params, expected) => {
    const interview = _cloneDeep(interviewAttributesWithHh);
    interview.response = response;
    expect(Helpers.getPerson({ interview, ...params })).toEqual(expected);
});

each([
    [
        'One person',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1 }
                }
            }
        },
        1
    ],
    [
        'Multiple persons',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1 },
                    personId2: { _uuid: 'personId2', _sequence: 2 },
                    personId3: { _uuid: 'personId3', _sequence: 3 }
                }
            }
        },
        3
    ],
    [
        'Empty persons',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {}
            }
        },
        0
    ],
    ['Empty household', { household: {} }, 0],
    ['Empty response', {}, 0]
]).test('countPersons: %s', (_title, response, expected) => {
    const interview = _cloneDeep(interviewAttributesWithHh);
    interview.response = response;
    expect(Helpers.countPersons({ interview })).toEqual(expected);
});

// Tests for countAdults
each([
    // Default adultAge (18)
    [
        'One person, no age',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1 }
                }
            }
        },
        undefined,
        0
    ],
    [
        'One person, age 17',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 17 }
                }
            }
        },
        undefined,
        0
    ],
    [
        'One person, age 18',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 18 }
                }
            }
        },
        undefined,
        1
    ],
    [
        'Multiple persons, mixed ages',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 17 },
                    personId2: { _uuid: 'personId2', _sequence: 2, age: 18 },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 25 }
                }
            }
        },
        undefined,
        2
    ],
    [
        'Multiple persons, some no age',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1 },
                    personId2: { _uuid: 'personId2', _sequence: 2, age: 18 },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 10 }
                }
            }
        },
        undefined,
        1
    ],
    [
        'Empty persons',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {}
            }
        },
        undefined,
        0
    ],
    ['Empty household', { household: {} }, undefined, 0],
    ['Empty response', {}, undefined, 0],
    // adultAge = 21
    [
        'One person, age 21, adultAge 21',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 21 }
                }
            }
        },
        21,
        1
    ],
    [
        'One person, age 20, adultAge 21',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 20 }
                }
            }
        },
        21,
        0
    ],
    [
        'Multiple persons, mixed ages, adultAge 21',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 17 },
                    personId2: { _uuid: 'personId2', _sequence: 2, age: 18 },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 21 },
                    personId4: { _uuid: 'personId4', _sequence: 4, age: 25 }
                }
            }
        },
        21,
        2
    ],
    [
        'Multiple persons, all below adultAge 21',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 17 },
                    personId2: { _uuid: 'personId2', _sequence: 2, age: 18 },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 20 }
                }
            }
        },
        21,
        0
    ]
]).test('countAdults: %s', (_title, response, adultAge, expected) => {
    const interview = _cloneDeep(interviewAttributesWithHh);
    interview.response = response;
    // Mock config.adultAge if provided, else use default
    if (adultAge !== undefined) {
        projectConfig.adultAge = adultAge;
    }
    expect(Helpers.countAdults({ interview })).toEqual(expected);
});

describe('getInterviewablePersonsArray', () => {
    test('No household', () => {
        const interview = _cloneDeep(interviewAttributesWithHh);
        interview.response.household = undefined;
        expect(Helpers.getInterviewablePersonsArray({ interview })).toEqual([]);
    });

    each([
        [
            'Have ages, one interviewable person',
            {
                personId1: { _uuid: 'personId1', _sequence: 1, age: 23 }
            },
            ['personId1']
        ],
        [
            'Have ages, some non-interviewable persons',
            {
                personId1: { _uuid: 'personId1', _sequence: 1, age: 23 },
                personId2: { _uuid: 'personId2', _sequence: 2, age: 4 },
                personId3: { _uuid: 'personId3', _sequence: 3, age: 23 }
            },
            ['personId1', 'personId3']
        ],
        [
            'No age, all interviewable',
            {
                personId1: { _uuid: 'personId1', _sequence: 1 },
                personId2: { _uuid: 'personId2', _sequence: 2 }
            },
            ['personId1', 'personId2']
        ],
        ['No persons', {}, []]
    ]).test('getInterviewablePersonsArray with persons: %s', (_title, persons, expectedPersonIds: string[]) => {
        projectConfig.interviewableAge = 5;
        const interview = _cloneDeep(interviewAttributesWithHh);
        interview.response.household!.persons = persons;
        expect(Helpers.getInterviewablePersonsArray({ interview })).toEqual(expectedPersonIds.map((id) => persons[id]));
    });
});

each([
    [
        'One person-only',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 18 }
                }
            }
        },
        'personId1',
        true
    ],
    [
        'One person-only, too young',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 12 }
                }
            }
        },
        'personId1',
        false
    ],
    [
        'Multiple persons, one with minimum age, should self-declared self',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 5 },
                    personId2: { _uuid: 'personId2', _sequence: 2, age: 10 },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 20 }
                }
            }
        },
        'personId3',
        true
    ],
    [
        'Multiple persons, one with minimum age, should not self-declared younger',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 5 },
                    personId2: { _uuid: 'personId2', _sequence: 2, age: 10 },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 20 }
                }
            }
        },
        'personId2',
        false
    ],
    [
        'Multiple persons, multiple with minimal age, should self-declared if set',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 34, whoWillAnswerForThisPerson: 'personId1' },
                    personId2: { _uuid: 'personId2', _sequence: 2, age: 18 },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 75 }
                }
            }
        },
        'personId1',
        true
    ],
    [
        'Multiple persons, multiple with minimal age, should not self-declared if other declared',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, whoWillAnswerForThisPerson: 'personId2' },
                    personId2: { _uuid: 'personId2', _sequence: 2, age: 18 },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 75 }
                }
            }
        },
        'personId2',
        false
    ],
    [
        'Multiple persons, multiple with minimal age, should not self-declared if other',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, whoWillAnswerForThisPerson: 'personId2' },
                    personId2: { _uuid: 'personId2', _sequence: 2, age: 18 },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 75 }
                }
            }
        },
        'personId2',
        false
    ],
    [
        'Empty persons',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {}
            }
        },
        { _uuid: 'somePersonId', _sequence: 1 },
        false
    ],
    ['Empty household', { household: {} }, { _uuid: 'somePersonId', _sequence: 1 }, false],
    ['Empty response', {}, { _uuid: 'somePersonId', _sequence: 1 }, false]
]).test('isSelfDeclared: %s', (_title, response, personIdOrPerson: string | Person, expected) => {
    const interview = _cloneDeep(interviewAttributesWithHh);
    interview.response = response;
    const person =
        typeof personIdOrPerson === 'string' ? response.household!.persons![personIdOrPerson] : personIdOrPerson;
    expect(Helpers.isSelfDeclared({ interview, person })).toEqual(expected);
});

each([
    [
        'One person-only',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 18 }
                }
            }
        },
        'personId1',
        1
    ],
    [
        'Multiple persons, self-declared',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 5 },
                    personId2: { _uuid: 'personId2', _sequence: 2, age: 30, whoWillAnswerForThisPerson: 'personId2' },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 20 }
                }
            }
        },
        'personId2',
        1
    ],
    [
        'Multiple persons, not self-declared',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 5 },
                    personId2: { _uuid: 'personId2', _sequence: 2, age: 30, whoWillAnswerForThisPerson: 'personId3' },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 20 }
                }
            }
        },
        'personId2',
        3
    ],
    [
        'Multiple persons, only one with minimal age, should self-declare adult',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 5 },
                    personId2: { _uuid: 'personId2', _sequence: 2, age: 10 },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 20 }
                }
            }
        },
        'personId3',
        1
    ],
    [
        'Multiple persons, only one with minimal age, return count for others',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 5 },
                    personId2: { _uuid: 'personId2', _sequence: 2, age: 10 },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 20 }
                }
            }
        },
        'personId2',
        3
    ],
    [
        'Empty persons',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {}
            }
        },
        { _uuid: 'somePersonId', _sequence: 1 },
        0
    ],
    ['Empty household', { household: {} }, { _uuid: 'somePersonId', _sequence: 1 }, 0],
    ['Empty response', {}, { _uuid: 'somePersonId', _sequence: 1 }, 0]
]).test('getCountOrSelfDeclared: %s', (_title, response, personIdOrPerson: string | Person, expected) => {
    const interview = _cloneDeep(interviewAttributesWithHh);
    interview.response = response;
    const person =
        typeof personIdOrPerson === 'string' ? response.household!.persons![personIdOrPerson] : personIdOrPerson;
    expect(Helpers.getCountOrSelfDeclared({ interview, person })).toEqual(expected);
});

each([
    ['Undefined disability', undefined, false],
    ['Disability yes', 'yes', true],
    ['Disability no', 'no', false],
    ['Disability dont know', 'dontKnow', true],
    ['Disability prefer not to answer', 'preferNotToAnswer', true]
]).test('personMayHaveDisability: %s', (_title, hasDisabilityValue, expected) => {
    const interview = _cloneDeep(interviewAttributesWithHh);
    const person = interview.response.household!.persons!.personId1;
    person.hasDisability = hasDisabilityValue;
    expect(Helpers.personMayHaveDisability({ person })).toEqual(expected);
});

each([
    [
        'Undefined household',
        {
            ...interviewAttributesWithHh.response,
            household: undefined
        },
        false
    ],
    [
        'Empty persons object',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {}
            }
        },
        false
    ],
    [
        'One person with disability',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 5, hasDisability: 'yes' },
                    personId2: { _uuid: 'personId2', _sequence: 2, age: 30, whoWillAnswerForThisPerson: 'personId3' },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 20, hasDisability: 'no' }
                }
            }
        },
        true
    ],
    [
        'All persons with disability',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 5, hasDisability: 'yes' },
                    personId2: {
                        _uuid: 'personId2',
                        _sequence: 2,
                        age: 30,
                        whoWillAnswerForThisPerson: 'personId3',
                        hasDisability: 'yes'
                    },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 20, hasDisability: 'yes' }
                }
            }
        },
        true
    ],
    [
        'No one with disability',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 5, hasDisability: 'no' },
                    personId2: {
                        _uuid: 'personId2',
                        _sequence: 2,
                        age: 30,
                        whoWillAnswerForThisPerson: 'personId3',
                        hasDisability: 'no'
                    },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 20, hasDisability: 'no' }
                }
            }
        },
        false
    ],
    [
        'All undefined disability question',
        {
            ...interviewAttributesWithHh.response,
            household: {
                ...interviewAttributesWithHh.response.household,
                persons: {
                    personId1: { _uuid: 'personId1', _sequence: 1, age: 5 },
                    personId2: { _uuid: 'personId2', _sequence: 2, age: 30, whoWillAnswerForThisPerson: 'personId3' },
                    personId3: { _uuid: 'personId3', _sequence: 3, age: 20 }
                }
            }
        },
        false
    ]
]).test('householdMayHaveDisability: %s', (_title, response, expected) => {
    const interview = _cloneDeep(interviewAttributesWithHh);
    interview.response = response;
    expect(Helpers.householdMayHaveDisability({ interview })).toEqual(expected);
});

describe('getJourneys', () => {
    const person: Person = {
        _uuid: 'arbitraryPerson',
        _sequence: 1
    };

    const journeys = {
        journeyId1: {
            _uuid: 'journeyId1',
            _sequence: 2,
            visitedPlaces: {},
            trips: {}
        },
        journeyId2: {
            _uuid: 'journeyId2',
            _sequence: 1,
            activity: 'work'
        }
    };

    test('object: test without journeys', () => {
        expect(Helpers.getJourneys({ person })).toEqual({});
    });

    test('object: empty journeys', () => {
        const attributes = _cloneDeep(person);
        attributes.journeys = {};
        expect(Helpers.getJourneys({ person: attributes })).toEqual({});
    });

    test('object: with journeys, ordered', () => {
        const attributes = _cloneDeep(person);
        attributes.journeys = journeys;
        expect(Helpers.getJourneys({ person: attributes })).toEqual(journeys);
    });

    test('array: test without journeys', () => {
        expect(Helpers.getJourneysArray({ person })).toEqual([]);
    });

    test('array: empty journeys', () => {
        const attributes = _cloneDeep(person);
        attributes.journeys = {};
        expect(Helpers.getJourneysArray({ person: attributes })).toEqual([]);
    });

    test('array: with journeys, ordered', () => {
        const attributes = _cloneDeep(person);
        attributes.journeys = journeys;
        expect(Helpers.getJourneysArray({ person: attributes })).toEqual([journeys.journeyId2, journeys.journeyId1]);
    });

    each([
        ['null personId, no active person, no journey', interviewAttributesWithHh.response, null, null],
        [
            'null personId, get active person, no journey',
            {
                ...interviewAttributesWithHh.response,
                _activePersonId: 'personId2'
            },
            null,
            null
        ],
        [
            'null personId, get active person, with active journey',
            {
                ...interviewAttributesWithHh.response,
                household: {
                    ...interviewAttributesWithHh.response.household,
                    persons: {
                        ...interviewAttributesWithHh.response.household!.persons,
                        personId2: {
                            ...interviewAttributesWithHh.response.household!.persons!.personId2,
                            journeys: journeys
                        }
                    }
                },
                _activePersonId: 'personId2',
                _activeJourneyId: 'journeyId1'
            },
            null,
            journeys.journeyId1
        ],
        [
            'null personId, get active person, active journey for another person',
            {
                ...interviewAttributesWithHh.response,
                household: {
                    ...interviewAttributesWithHh.response.household,
                    persons: {
                        ...interviewAttributesWithHh.response.household!.persons,
                        personId2: {
                            ...interviewAttributesWithHh.response.household!.persons!.personId2,
                            journeys: journeys
                        }
                    }
                },
                _activePersonId: 'personId1',
                _activeJourneyId: 'journeyId1'
            },
            null,
            null
        ],
        [
            'Existing person, no journey',
            {
                ...interviewAttributesWithHh.response,
                household: {
                    ...interviewAttributesWithHh.response.household,
                    persons: {
                        ...interviewAttributesWithHh.response.household!.persons,
                        personId2: {
                            ...interviewAttributesWithHh.response.household!.persons!.personId2,
                            journeys: journeys
                        }
                    }
                },
                _activePersonId: 'personId1',
                _activeJourneyId: 'journeyId1'
            },
            'personId1',
            null
        ],
        [
            'Existing person, with active journey',
            {
                ...interviewAttributesWithHh.response,
                household: {
                    ...interviewAttributesWithHh.response.household,
                    persons: {
                        ...interviewAttributesWithHh.response.household!.persons,
                        personId2: {
                            ...interviewAttributesWithHh.response.household!.persons!.personId2,
                            journeys: journeys
                        }
                    }
                },
                _activePersonId: 'personId2',
                _activeJourneyId: 'journeyId2'
            },
            'personId2',
            journeys.journeyId2
        ],
        [
            'Existing person, active journey not for this person',
            {
                ...interviewAttributesWithHh.response,
                household: {
                    ...interviewAttributesWithHh.response.household,
                    persons: {
                        personId1: {
                            ...interviewAttributesWithHh.response.household!.persons!.personId2,
                            journeys: {
                                someJourneyId: {
                                    _uuid: 'someJourneyId',
                                    _sequence: 1
                                }
                            }
                        },
                        personId2: {
                            ...interviewAttributesWithHh.response.household!.persons!.personId2,
                            journeys: journeys
                        }
                    }
                },
                _activePersonId: 'personId1',
                _activeJourneyId: 'journeyId1'
            },
            'personId1',
            null
        ],
        ['Empty household', { household: {} }, 'personId1', null],
        ['Empty response', {}, 'personId1', null]
    ]).test('getActiveJourney: %s', (_title, response, personId, expected) => {
        const interview = _cloneDeep(interviewAttributesWithHh);
        interview.response = response;
        const person =
            personId === null
                ? null
                : interview.response?.household?.persons
                  ? interview.response?.household?.persons[personId]
                  : null;
        expect(Helpers.getActiveJourney({ interview, person })).toEqual(expected);
    });
});

describe('getVisitedPlaces', () => {
    const journey: Journey = {
        _uuid: 'arbitraryJourney',
        _sequence: 1
    };

    const visitedPlaces = {
        visitedPlace1: {
            _uuid: 'visitedPlace1',
            _sequence: 2,
            activity: 'home'
        },
        visitedPlace2: {
            _uuid: 'visitedPlace2',
            _sequence: 1,
            activity: 'work'
        }
    };

    test('object: test without visited places', () => {
        expect(Helpers.getVisitedPlaces({ journey })).toEqual({});
    });

    test('object: empty visited places', () => {
        const attributes = _cloneDeep(journey);
        attributes.visitedPlaces = {};
        expect(Helpers.getVisitedPlaces({ journey: attributes })).toEqual({});
    });

    test('object: with visited places, ordered', () => {
        const attributes = _cloneDeep(journey);
        attributes.visitedPlaces = visitedPlaces;
        expect(Helpers.getVisitedPlaces({ journey: attributes })).toEqual(visitedPlaces);
    });

    test('array: test without visited places', () => {
        expect(Helpers.getVisitedPlacesArray({ journey })).toEqual([]);
    });

    test('array: empty visited places', () => {
        const attributes = _cloneDeep(journey);
        attributes.visitedPlaces = {};
        expect(Helpers.getVisitedPlacesArray({ journey: attributes })).toEqual([]);
    });

    test('array: with visited places, ordered', () => {
        const attributes = _cloneDeep(journey);
        attributes.visitedPlaces = visitedPlaces;
        expect(Helpers.getVisitedPlacesArray({ journey: attributes })).toEqual([
            visitedPlaces.visitedPlace2,
            visitedPlaces.visitedPlace1
        ]);
    });

    each([
        ['Null journey, no active journey', {}, false],
        [
            'Null journey, active journey, with active visitedPlace',
            { activePersonId: 'personId1', activeJourneyId: 'journeyId1', activeVisitedPlaceId: 'visitedPlace1' },
            true
        ],
        [
            'Null journey, active journey, active visitedPlace for another journey',
            { activePersonId: 'personId1', activeJourneyId: 'journeyId1', activeVisitedPlaceId: 'visitedPlaceP2V1' },
            false
        ],
        [
            'With journey and active visitedPlace',
            {
                activePersonId: 'personId1',
                activeJourneyId: 'journeyId1',
                activeVisitedPlaceId: 'visitedPlaceP2V1',
                testPersonId: 'personId2',
                testJourneyId: 'journeyId2'
            },
            true
        ],
        [
            'With journey, no active visitedPlace',
            {
                activePersonId: 'personId1',
                activeJourneyId: 'journeyId1',
                testPersonId: 'personId1',
                testJourneyId: 'journeyId1'
            },
            false
        ],
        [
            'With journey, active visitedPlace for another journey',
            {
                activePersonId: 'personId1',
                activeJourneyId: 'journeyId1',
                activeVisitedPlaceId: 'visitedPlaceP2V1',
                testPersonId: 'personId1',
                testJourneyId: 'journeyId1'
            },
            false
        ]
    ]).test(
        'getActiveVisitedPlace: %s',
        (
            _title,
            testData: {
                activePersonId?: string;
                activeJourneyId?: string;
                activeVisitedPlaceId?: string;
                testPersonId?: string;
                testJourneyId?: string;
            },
            expectResult
        ) => {
            const interview = _cloneDeep(interviewAttributesWithHh);
            // Set the persons and journeys for the test
            interview.response.household!.persons = {
                personId1: {
                    _uuid: 'personId1',
                    _sequence: 1,
                    journeys: {
                        journeyId1: {
                            _uuid: 'journeyId1',
                            _sequence: 1,
                            visitedPlaces: visitedPlaces
                        }
                    }
                },
                personId2: {
                    _uuid: 'personId2',
                    _sequence: 2,
                    journeys: {
                        journeyId2: {
                            _uuid: 'journeyId2',
                            _sequence: 1,
                            visitedPlaces: {
                                visitedPlaceP2V1: {
                                    _uuid: 'visitedPlaceP2V1',
                                    _sequence: 1
                                }
                            }
                        }
                    }
                }
            };
            if (testData.activePersonId) {
                interview.response._activePersonId = testData.activePersonId;
            }
            if (testData.activeJourneyId) {
                interview.response._activeJourneyId = testData.activeJourneyId;
            }
            if (testData.activeVisitedPlaceId) {
                interview.response._activeVisitedPlaceId = testData.activeVisitedPlaceId;
            }
            const journey =
                testData.testPersonId && testData.testJourneyId
                    ? interview.response.household!.persons![testData.testPersonId].journeys![testData.testJourneyId]
                    : null;
            const result = expectResult
                ? interview.response.household!.persons![(testData.testPersonId || testData.activePersonId) as string]
                      .journeys![(testData.testJourneyId || testData.activeJourneyId) as string].visitedPlaces![
                      testData.activeVisitedPlaceId!
                  ]
                : null;
            const activeVisitedPlace = Helpers.getActiveVisitedPlace({ interview, journey });
            if (expectResult) {
                expect(activeVisitedPlace).toBeTruthy();
                expect(activeVisitedPlace).toEqual(result);
            } else {
                expect(activeVisitedPlace).toEqual(null);
            }
        }
    );
});

describe('getNext/PreviousVisitedPlace', () => {
    const journey: Journey = {
        _uuid: 'arbitraryJourney',
        _sequence: 1
    };

    const visitedPlaces = {
        visitedPlace1: {
            _uuid: 'visitedPlace1',
            _sequence: 1,
            activity: 'home'
        },
        visitedPlace2: {
            _uuid: 'visitedPlace2',
            _sequence: 2,
            activity: 'work'
        }
    };

    test('Next: without visited places', () => {
        expect(Helpers.getNextVisitedPlace({ journey, visitedPlaceId: 'place' })).toBeNull();
    });

    test('Previous: without visited places', () => {
        expect(Helpers.getPreviousVisitedPlace({ journey, visitedPlaceId: 'place' })).toBeNull();
    });

    each([
        ['With place after', 'visitedPlace1', visitedPlaces.visitedPlace2],
        ['without place after', 'visitedPlace2', null],
        ['Non-existent place', 'nonExistentPlace', null]
    ]).test('Next with places: %s', (_title, visitedPlaceId, expected) => {
        const attributes = _cloneDeep(journey);
        attributes.visitedPlaces = visitedPlaces;
        expect(Helpers.getNextVisitedPlace({ journey: attributes, visitedPlaceId })).toEqual(expected);
    });

    each([
        ['With place before', 'visitedPlace2', visitedPlaces.visitedPlace1],
        ['Without place before', 'visitedPlace1', null],
        ['Non-existent place', 'nonExistentPlace', null]
    ]).test('Previous with places: %s', (_title, visitedPlaceId, expected) => {
        const attributes = _cloneDeep(journey);
        attributes.visitedPlaces = visitedPlaces;
        expect(Helpers.getPreviousVisitedPlace({ journey: attributes, visitedPlaceId })).toEqual(expected);
    });
});

describe('replaceVisitedPlaceShortcuts', () => {
    const shortcutInterview = _cloneDeep(interviewAttributes);
    shortcutInterview.response.household = {
        size: 3,
        persons: {
            person1: {
                _uuid: 'person1',
                _sequence: 1,
                journeys: {
                    journey1: {
                        _uuid: 'journey1',
                        _sequence: 1,
                        visitedPlaces: {
                            basicPlace: {
                                _uuid: 'basicPlace',
                                _sequence: 1,
                                geography: {
                                    type: 'Feature',
                                    geometry: { type: 'Point', coordinates: [-73, 45] },
                                    properties: { lastAction: 'mapClicked' }
                                },
                                name: 'blabla'
                            },
                            usedAsShortcut: {
                                _uuid: 'usedAsShortcut',
                                _sequence: 2,
                                geography: {
                                    type: 'Feature',
                                    geometry: { type: 'Point', coordinates: [-73.1, 45.1] },
                                    properties: { lastAction: 'mapClicked' }
                                },
                                name: 'used as a shortcut'
                            },
                            shortcutToShortcut: {
                                _uuid: 'shortcutToShortcut',
                                _sequence: 3,
                                geography: {
                                    type: 'Feature',
                                    geometry: { type: 'Point', coordinates: [-73.2, 45.2] },
                                    properties: { lastAction: 'shortcut' }
                                },
                                alreadyVisitedBySelfOrAnotherHouseholdMember: true,
                                shortcut: 'household.persons.person3.journeys.journey1.visitedPlaces.shortcutToBasic2'
                            }
                        }
                    }
                }
            },
            person2: {
                _uuid: 'person2',
                _sequence: 2,
                journeys: {
                    journey1: {
                        _uuid: 'journey1',
                        _sequence: 1,
                        visitedPlaces: {
                            isAShortcut: {
                                _uuid: 'isAShortcut',
                                _sequence: 1,
                                geography: {
                                    type: 'Feature',
                                    geometry: { type: 'Point', coordinates: [-73.1, 45.1] },
                                    properties: { lastAction: 'shortcut' }
                                },
                                alreadyVisitedBySelfOrAnotherHouseholdMember: true,
                                shortcut: 'household.persons.person1.journeys.journey1.visitedPlaces.usedAsShortcut'
                            },
                            basicPlace2: {
                                _uuid: 'basicPlace2',
                                _sequence: 2,
                                geography: {
                                    type: 'Feature',
                                    geometry: { type: 'Point', coordinates: [-73.2, 45.2] },
                                    properties: { lastAction: 'markerDragged' }
                                },
                                name: 'basic place 2'
                            }
                        }
                    }
                }
            },
            person3: {
                _uuid: 'person3',
                _sequence: 3,
                journeys: {
                    journey1: {
                        _uuid: 'journey1',
                        _sequence: 1,
                        visitedPlaces: {
                            isAShortcutToo: {
                                _uuid: 'isAShortcutToo',
                                _sequence: 1,
                                geography: {
                                    type: 'Feature',
                                    geometry: { type: 'Point', coordinates: [-73.1, 45.1] },
                                    properties: { lastAction: 'shortcut' }
                                },
                                alreadyVisitedBySelfOrAnotherHouseholdMember: true,
                                shortcut: 'household.persons.person1.journeys.journey1.visitedPlaces.usedAsShortcut'
                            },
                            shortcutToBasic2: {
                                _uuid: 'shortcutToBasic2',
                                _sequence: 2,
                                geography: {
                                    type: 'Feature',
                                    geometry: { type: 'Point', coordinates: [-73.2, 45.2] },
                                    properties: { lastAction: 'shortcut' }
                                },
                                alreadyVisitedBySelfOrAnotherHouseholdMember: true,
                                shortcut: 'household.persons.person2.journeys.journey1.visitedPlaces.basicPlace2'
                            },
                            againAShortcut: {
                                _uuid: 'againAShortcut',
                                _sequence: 3,
                                geography: {
                                    type: 'Feature',
                                    geometry: { type: 'Point', coordinates: [-73.1, 45.1] },
                                    properties: { lastAction: 'shortcut' }
                                },
                                alreadyVisitedBySelfOrAnotherHouseholdMember: true,
                                shortcut: 'household.persons.person1.journeys.journey1.visitedPlaces.usedAsShortcut'
                            }
                        }
                    }
                }
            }
        }
    };

    test('Place is not a shortcut', () => {
        expect(
            Helpers.replaceVisitedPlaceShortcuts({
                interview: shortcutInterview,
                shortcutTo: 'household.persons.person1.journeys.journey1.visitedPlaces.basicPlace1'
            })
        ).toBeUndefined();
    });

    test('Place is a shortcut to a shorcut', () => {
        expect(
            Helpers.replaceVisitedPlaceShortcuts({
                interview: shortcutInterview,
                shortcutTo: 'household.persons.person3.journeys.journey1.visitedPlaces.shortcutToBasic2'
            })
        ).toEqual({
            updatedValuesByPath: {
                ['response.household.persons.person1.journeys.journey1.visitedPlaces.shortcutToShortcut.shortcut']: (
                    (shortcutInterview.response.household!.persons!.person3.journeys!.journey1.visitedPlaces || {})[
                        'shortcutToBasic2'
                    ] as any
                ).shortcut,
                ['response.household.persons.person1.journeys.journey1.visitedPlaces.shortcutToShortcut.geography']:
                    (shortcutInterview.response.household!.persons!.person3.journeys!.journey1.visitedPlaces || {})[
                        'shortcutToBasic2'
                    ].geography
            },
            unsetPaths: []
        });
    });

    test('Place shortcut to one other place', () => {
        expect(
            Helpers.replaceVisitedPlaceShortcuts({
                interview: shortcutInterview,
                shortcutTo: 'household.persons.person2.journeys.journey1.visitedPlaces.basicPlace2'
            })
        ).toEqual({
            updatedValuesByPath: {
                ['response.household.persons.person3.journeys.journey1.visitedPlaces.shortcutToBasic2.name']: (
                    (shortcutInterview.response.household!.persons!.person2.journeys!.journey1.visitedPlaces || {})[
                        'basicPlace2'
                    ] as any
                ).name,
                ['response.household.persons.person3.journeys.journey1.visitedPlaces.shortcutToBasic2.geography']:
                    (shortcutInterview.response.household!.persons!.person2.journeys!.journey1.visitedPlaces || {})[
                        'basicPlace2'
                    ].geography
            },
            unsetPaths: ['response.household.persons.person3.journeys.journey1.visitedPlaces.shortcutToBasic2.shortcut']
        });
    });

    test('Place shortcut to many places from many persons', () => {
        expect(
            Helpers.replaceVisitedPlaceShortcuts({
                interview: shortcutInterview,
                shortcutTo: 'household.persons.person1.journeys.journey1.visitedPlaces.usedAsShortcut'
            })
        ).toEqual({
            updatedValuesByPath: {
                ['response.household.persons.person2.journeys.journey1.visitedPlaces.isAShortcut.name']: (
                    (shortcutInterview.response.household!.persons!.person1.journeys!.journey1.visitedPlaces || {})[
                        'usedAsShortcut'
                    ] as any
                ).name,
                ['response.household.persons.person2.journeys.journey1.visitedPlaces.isAShortcut.geography']:
                    (shortcutInterview.response.household!.persons!.person1.journeys!.journey1.visitedPlaces || {})[
                        'usedAsShortcut'
                    ].geography,
                ['response.household.persons.person3.journeys.journey1.visitedPlaces.isAShortcutToo.shortcut']:
                    'household.persons.person2.journeys.journey1.visitedPlaces.isAShortcut',
                ['response.household.persons.person3.journeys.journey1.visitedPlaces.againAShortcut.shortcut']:
                    'household.persons.person2.journeys.journey1.visitedPlaces.isAShortcut'
            },
            unsetPaths: ['response.household.persons.person2.journeys.journey1.visitedPlaces.isAShortcut.shortcut']
        });
    });
});

describe('getTrips', () => {
    const journey: Journey = {
        _uuid: 'arbitraryJourney',
        _sequence: 1
    };

    const trips = {
        trip1: {
            _uuid: 'trip1',
            _sequence: 2
        },
        trip2: {
            _uuid: 'trip2',
            _sequence: 1
        }
    };

    test('object: test without trips', () => {
        expect(Helpers.getTrips({ journey })).toEqual({});
    });

    test('object: empty trips', () => {
        const attributes = _cloneDeep(journey);
        attributes.trips = {};
        expect(Helpers.getTrips({ journey: attributes })).toEqual({});
    });

    test('object: with trips', () => {
        const attributes = _cloneDeep(journey);
        attributes.trips = trips;
        expect(Helpers.getTrips({ journey: attributes })).toEqual(trips);
    });

    test('array: test without trips', () => {
        expect(Helpers.getTripsArray({ journey })).toEqual([]);
    });

    test('array: empty trips', () => {
        const attributes = _cloneDeep(journey);
        attributes.trips = {};
        expect(Helpers.getTripsArray({ journey: attributes })).toEqual([]);
    });

    test('array: with trips, ordered', () => {
        const attributes = _cloneDeep(journey);
        attributes.trips = trips;
        expect(Helpers.getTripsArray({ journey: attributes })).toEqual([trips.trip2, trips.trip1]);
    });

    each([
        ['Null journey, no active journey', {}, false],
        [
            'Null journey, active journey, with active trip',
            { activePersonId: 'personId1', activeJourneyId: 'journeyId1', activeTripId: 'trip1' },
            true
        ],
        [
            'Null journey, active journey, active trip for another journey',
            { activePersonId: 'personId1', activeJourneyId: 'journeyId1', activeTripId: 'tripP2T1' },
            false
        ],
        [
            'With journey and active trip',
            {
                activePersonId: 'personId1',
                activeJourneyId: 'journeyId1',
                activeTripId: 'tripP2T1',
                testPersonId: 'personId2',
                testJourneyId: 'journeyId2'
            },
            true
        ],
        [
            'With journey, no active trip',
            {
                activePersonId: 'personId1',
                activeJourneyId: 'journeyId1',
                testPersonId: 'personId1',
                testJourneyId: 'journeyId1'
            },
            false
        ],
        [
            'With journey, active trip for another journey',
            {
                activePersonId: 'personId1',
                activeJourneyId: 'journeyId1',
                activeTripId: 'tripP2T1',
                testPersonId: 'personId1',
                testJourneyId: 'journeyId1'
            },
            false
        ]
    ]).test(
        'getActiveTrip: %s',
        (
            _title,
            testData: {
                activePersonId?: string;
                activeJourneyId?: string;
                activeTripId?: string;
                testPersonId?: string;
                testJourneyId?: string;
            },
            expectResult
        ) => {
            const interview = _cloneDeep(interviewAttributesWithHh);
            // Set the persons and journeys for the test
            interview.response.household!.persons = {
                personId1: {
                    _uuid: 'personId1',
                    _sequence: 1,
                    journeys: {
                        journeyId1: {
                            _uuid: 'journeyId1',
                            _sequence: 1,
                            trips: trips
                        }
                    }
                },
                personId2: {
                    _uuid: 'personId2',
                    _sequence: 2,
                    journeys: {
                        journeyId2: {
                            _uuid: 'journeyId2',
                            _sequence: 1,
                            trips: {
                                tripP2T1: {
                                    _uuid: 'tripP2T1',
                                    _sequence: 1
                                }
                            }
                        }
                    }
                }
            };
            if (testData.activePersonId) {
                interview.response._activePersonId = testData.activePersonId;
            }
            if (testData.activeJourneyId) {
                interview.response._activeJourneyId = testData.activeJourneyId;
            }
            if (testData.activeTripId) {
                interview.response._activeTripId = testData.activeTripId;
            }
            const journey =
                testData.testPersonId && testData.testJourneyId
                    ? interview.response.household!.persons![testData.testPersonId].journeys![testData.testJourneyId]
                    : null;
            const result = expectResult
                ? interview.response.household!.persons![(testData.testPersonId || testData.activePersonId) as string]
                      .journeys![(testData.testJourneyId || testData.activeJourneyId) as string].trips![
                      testData.activeTripId!
                  ]
                : null;
            const activeTrip = Helpers.getActiveTrip({ interview, journey });
            if (expectResult) {
                expect(activeTrip).toBeTruthy();
                expect(activeTrip).toEqual(result);
            } else {
                expect(activeTrip).toEqual(null);
            }
        }
    );

    each([
        ['Is first trip', trips.trip2, null],
        ['Has previous trip', trips.trip1, trips.trip2],
        ['Trip not found', { _uuid: 'unexistentTrip', _sequence: 3 }, null]
    ]).test('getPreviousTrip: %s', (_title, currentTrip, previousTrip) => {
        const attributes = _cloneDeep(journey);
        attributes.trips = trips;
        expect(Helpers.getPreviousTrip({ currentTrip, journey: attributes })).toEqual(previousTrip);
    });
});

describe('selectNextIncompleteTrip', () => {
    const segments = {
        segment1: { _uuid: 'segment1', _sequence: 1, mode: 'carDriver' as const, hasNextMode: true, _isNew: false },
        segment2: { _uuid: 'segment1', _sequence: 1, mode: 'carDriver' as const, hasNextMode: false, _isNew: false }
    };

    const trips = {
        trip1: { _uuid: 'trip1', _sequence: 1, segments },
        trip2: { _uuid: 'trip2', _sequence: 2 }
    };

    const journey: Journey = { _uuid: 'arbitraryJourney', _sequence: 1, trips };

    test('should select trip with no segment', () => {
        const attributes = _cloneDeep(journey);
        expect(Helpers.selectNextIncompleteTrip({ journey: attributes })).toEqual(attributes.trips!.trip2);
    });

    test('should select trip where one segment does not have a mode', () => {
        const attributes = _cloneDeep(journey);
        delete attributes.trips!.trip1.segments!.segment2.mode;
        expect(Helpers.selectNextIncompleteTrip({ journey: attributes })).toEqual(attributes.trips!.trip1);
    });

    test('should select trip with segment with hasNextMode not set or true', () => {
        const attributes = _cloneDeep(journey);
        // Set hasNextMode to false to last segment
        attributes.trips!.trip1.segments!.segment2.hasNextMode = true;
        expect(Helpers.selectNextIncompleteTrip({ journey: attributes })).toEqual(attributes.trips!.trip1);

        // Delete hasNextMode in last segment
        delete attributes.trips!.trip1.segments!.segment2.hasNextMode;
        expect(Helpers.selectNextIncompleteTrip({ journey: attributes })).toEqual(attributes.trips!.trip1);
    });

    test('should return null if all trips complete', () => {
        const attributes = _cloneDeep(journey);
        // segments of trip2
        attributes.trips!.trip2.segments = segments;
        expect(Helpers.selectNextIncompleteTrip({ journey: attributes })).toEqual(null);
    });
});

describe('getOrigin/getDestination', () => {
    test('getOrigin, existing', () => {
        const journey = interviewAttributesForTestCases.response.household!.persons!.personId1.journeys!.journeyId1;
        expect(Helpers.getOrigin({ trip: journey.trips!.tripId1P1, visitedPlaces: journey.visitedPlaces! })).toEqual(
            journey.visitedPlaces!.homePlace1P1
        );
    });

    test('getOrigin, unexisting', () => {
        const journey = interviewAttributesForTestCases.response.household!.persons!.personId1.journeys!.journeyId1;
        expect(Helpers.getOrigin({ trip: journey.trips!.tripId1P1, visitedPlaces: {} })).toEqual(null);
    });

    test('getOrigin, trip without origin', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const journey = interview.response.household!.persons!.personId2.journeys!.journeyId2;
        // Unset origin
        delete journey.trips!.tripId3P2._originVisitedPlaceUuid;
        expect(Helpers.getOrigin({ trip: journey.trips!.tripId3P2, visitedPlaces: journey.visitedPlaces! })).toEqual(
            null
        );
    });

    test('getDestination, existing', () => {
        const journey = interviewAttributesForTestCases.response.household!.persons!.personId1.journeys!.journeyId1;
        expect(
            Helpers.getDestination({ trip: journey.trips!.tripId1P1, visitedPlaces: journey.visitedPlaces! })
        ).toEqual(journey.visitedPlaces!.workPlace1P1);
    });

    test('getDestination: unexisting', () => {
        const journey = interviewAttributesForTestCases.response.household!.persons!.personId1.journeys!.journeyId1;
        // Pass an empty visited places object
        expect(Helpers.getDestination({ trip: journey.trips!.tripId1P1, visitedPlaces: {} })).toEqual(null);
    });

    test('getDestination, trip without destination', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const journey = interview.response.household!.persons!.personId2.journeys!.journeyId2;
        // Unset destination
        delete journey.trips!.tripId3P2._destinationVisitedPlaceUuid;
        expect(
            Helpers.getDestination({ trip: journey.trips!.tripId3P2, visitedPlaces: journey.visitedPlaces! })
        ).toEqual(null);
    });
});

describe('getVisitedPlaceNames', () => {
    const mockedT = jest.fn().mockReturnValue('mocked') as unknown as jest.MockedFunction<TFunction>;

    each([
        [
            'Home place',
            interviewAttributesForTestCases.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!
                .homePlace1P1,
            'survey:visitedPlace:activityCategories:home',
            'mocked'
        ],
        [
            'Place with a name',
            interviewAttributesForTestCases.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!
                .workPlace1P1,
            undefined,
            interviewAttributesForTestCases.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!
                .workPlace1P1.name
        ],
        [
            'Place with a shortcut',
            interviewAttributesForTestCases.response.household!.persons!.personId2.journeys!.journeyId2.visitedPlaces!
                .shoppingPlace1P2,
            undefined,
            interviewAttributesForTestCases.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!
                .otherPlace2P1.name
        ],
        [
            'Place with neither name or shortcut',
            interviewAttributesForTestCases.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!
                .otherPlaceP1,
            'survey:placeGeneric',
            'mocked 4'
        ]
    ]).test('%s', (_title, visitedPlace, mockedTVal, expected) => {
        const name = Helpers.getVisitedPlaceName({
            t: mockedT,
            visitedPlace,
            interview: interviewAttributesForTestCases
        });
        if (mockedTVal) {
            expect(mockedT).toHaveBeenCalledWith(mockedTVal);
        } else {
            expect(mockedT).not.toHaveBeenCalled();
        }
        expect(name).toEqual(expected);
    });
});

describe('getVisitedPlaceGeography', () => {
    each([
        [
            'Home place',
            interviewAttributesForTestCases.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!
                .homePlace1P1,
            interviewAttributesForTestCases.response.household!.persons!.personId1,
            interviewAttributesForTestCases.response.home!.geography
        ],
        [
            'Place with a geography',
            interviewAttributesForTestCases.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!
                .workPlace1P1,
            interviewAttributesForTestCases.response.household!.persons!.personId1,
            interviewAttributesForTestCases.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!
                .workPlace1P1.geography
        ],
        [
            'Place with a shortcut',
            interviewAttributesForTestCases.response.household!.persons!.personId2.journeys!.journeyId2.visitedPlaces!
                .shoppingPlace1P2,
            interviewAttributesForTestCases.response.household!.persons!.personId2,
            interviewAttributesForTestCases.response.household!.persons!.personId2.journeys!.journeyId2.visitedPlaces!
                .shoppingPlace1P2.geography
        ],
        [
            'Place without a geography',
            interviewAttributesForTestCases.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!
                .otherPlaceP1,
            interviewAttributesForTestCases.response.household!.persons!.personId1,
            null
        ]
    ]).test('%s', (_title, visitedPlace, person, expected) => {
        const geography = Helpers.getVisitedPlaceGeography({
            visitedPlace,
            interview: interviewAttributesForTestCases,
            person
        });
        if (expected) {
            expect(geography).toEqual(expected);
        } else {
            expect(geography).toBeNull();
        }
    });
});

describe('getSegments', () => {
    const trip: Trip = {
        _uuid: 'arbitraryTrip',
        _sequence: 1
    };

    const segments = {
        segment1: {
            _uuid: 'segment1',
            _sequence: 2,
            _isNew: false
        },
        segment2: {
            _uuid: 'segment2',
            _sequence: 1,
            _isNew: false
        }
    };

    test('object: test without segments', () => {
        expect(Helpers.getSegments({ trip })).toEqual({});
    });

    test('object: empty segments', () => {
        const attributes = _cloneDeep(trip);
        attributes.segments = {};
        expect(Helpers.getSegments({ trip: attributes })).toEqual({});
    });

    test('object: with segments', () => {
        const attributes = _cloneDeep(trip);
        attributes.segments = segments;
        expect(Helpers.getSegments({ trip: attributes })).toEqual(segments);
    });

    test('array: test without segments', () => {
        expect(Helpers.getSegmentsArray({ trip })).toEqual([]);
    });

    test('array: empty segments', () => {
        const attributes = _cloneDeep(trip);
        attributes.segments = {};
        expect(Helpers.getSegmentsArray({ trip: attributes })).toEqual([]);
    });

    test('array: with segments, ordered', () => {
        const attributes = _cloneDeep(trip);
        attributes.segments = segments;
        expect(Helpers.getSegmentsArray({ trip: attributes })).toEqual([segments.segment2, segments.segment1]);
    });
});
