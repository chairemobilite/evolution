/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import each from 'jest-each';
import i18n from 'i18next';
import _cloneDeep from 'lodash/cloneDeep';
import { Person, UserInterviewAttributes } from '../../interviews/interview';

import * as Helpers from '../helpers';

jest.mock('i18next', () => ({
    t: jest.fn(),
    language: 'en'
}));
jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('arbitrary uuid') }));

const interviewAttributes: UserInterviewAttributes = {
    id: 1,
    uuid: 'arbitrary uuid',
    participant_id: 1,
    is_completed: false,
    is_questionable: false,
    responses: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
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
    } as any,
    is_valid: true
};

const interviewAttributesWithHh: UserInterviewAttributes = {
    id: 1,
    uuid: 'arbitrary uuid',
    participant_id: 1,
    is_completed: false,
    is_questionable: false,
    responses: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        },
        household: {
            size: 1,
            persons: {
                personId1: {
                    _uuid: 'personId1'
                },
                personId2: {
                    _uuid: 'personId2'
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
    } as any,
    is_valid: true
};

beforeEach(() => {
    jest.clearAllMocks();
})

each([
    ['Has Household', interviewAttributesWithHh.responses, interviewAttributesWithHh.responses.household],
    ['Empty responses', {}, {}]
]).test('getHousehold: %s', (_title, responses, expected) => {
    const interview = _cloneDeep(interviewAttributes);
    interview.responses = responses;
    expect(Helpers.getHousehold(interview)).toEqual(expected);
});

each([
    ['Person 1', interviewAttributesWithHh.responses, 'personId1', (interviewAttributesWithHh.responses as any).household.persons.personId1],
    ['Person 2', interviewAttributesWithHh.responses, 'personId2', (interviewAttributesWithHh.responses as any).household.persons.personId2],
    ['Undefined active person', interviewAttributesWithHh.responses, undefined, (interviewAttributesWithHh.responses as any).household.persons.personId1],
    ['Empty persons', { household: { ...interviewAttributesWithHh.responses.household, persons: {} } }, 'personId1', {}],
    ['Empty household', { household: {} }, undefined, {}],
    ['Empty responses', {}, 'personId', {}]
]).test('getCurrentPerson: %s', (_title, responses, currentPersonId, expected) => {
    const interview = _cloneDeep(interviewAttributesWithHh);
    interview.responses = responses;
    interview.responses._activePersonId = currentPersonId;
    expect(Helpers.getActivePerson(interview)).toEqual(expected);
});

describe('getPersons', () => {
    test('test without household', () => {
        expect(Helpers.getPersons(interviewAttributes)).toEqual({});
    });

    test('test without persons', () => {
        const attributes = _cloneDeep(interviewAttributes) as any;
        attributes.household = {};
        expect(Helpers.getPersons(interviewAttributes)).toEqual({});
    });

    test('empty persons', () => {
        const attributes = _cloneDeep(interviewAttributes) as any;
        attributes.household = { size: 0, persons: {} };
        expect(Helpers.getPersons(interviewAttributes)).toEqual({});
    });

    test('with persons', () => {
        expect(Helpers.getPersons(interviewAttributesWithHh)).toEqual((interviewAttributesWithHh.responses as any).household.persons);
    });

    test('array: test without household', () => {
        expect(Helpers.getPersonsArray(interviewAttributes)).toEqual([]);
    });

    test('array: test without persons', () => {
        const attributes = _cloneDeep(interviewAttributes) as any;
        attributes.household = {};
        expect(Helpers.getPersonsArray(interviewAttributes)).toEqual([]);
    });

    test('array: empty persons', () => {
        const attributes = _cloneDeep(interviewAttributes) as any;
        attributes.household = { size: 0, persons: {} };
        expect(Helpers.getPersonsArray(interviewAttributes)).toEqual([]);
    });

    test('array: with persons, unordered', () => {
        expect(Helpers.getPersonsArray(interviewAttributesWithHh)).toEqual(Object.values((interviewAttributesWithHh.responses as any).household.persons));
    });

    test('array: with persons, ordered', () => {
        const attributes = _cloneDeep(interviewAttributesWithHh) as any;
        attributes.responses.household.persons.personId1._sequence = 2;
        attributes.responses.household.persons.personId2._sequence = 1;
        expect(Helpers.getPersonsArray(attributes)).toEqual([attributes.responses.household.persons.personId2, attributes.responses.household.persons.personId1]);
    });
});

describe('getVisitedPlaces', () => {

    const person: Person = {
        _uuid: 'arbitraryPerson',
        _sequence: 1
    }

    const visitedPlaces = {
        visitedPlace1: {
            _uuid: 'visitedPlace1',
            _sequence: 2,
            activity: 'home',
        },
        visitedPlace2: {
            _uuid: 'visitedPlace2',
            _sequence: 1,
            activity: 'work',
        }
    }

    test('object: test without visited places', () => {
        expect(Helpers.getVisitedPlaces(person)).toEqual({});
    });

    test('object: empty visited places', () => {
        const attributes = _cloneDeep(person);
        attributes.visitedPlaces = { };
        expect(Helpers.getVisitedPlaces(attributes)).toEqual({});
    });

    test('object: with visited places, ordered', () => {
        const attributes = _cloneDeep(person);
        attributes.visitedPlaces = visitedPlaces;
        expect(Helpers.getVisitedPlaces(attributes)).toEqual(visitedPlaces);
    });

    test('array: test without visited places', () => {
        expect(Helpers.getVisitedPlacesArray(person)).toEqual([]);
    });

    test('array: empty visited places', () => {
        const attributes = _cloneDeep(person);
        attributes.visitedPlaces = { };
        expect(Helpers.getVisitedPlacesArray(attributes)).toEqual([]);
    });

    test('array: with visited places, ordered', () => {
        const attributes = _cloneDeep(person);
        attributes.visitedPlaces = visitedPlaces;
        expect(Helpers.getVisitedPlacesArray(attributes)).toEqual([visitedPlaces.visitedPlace2, visitedPlaces.visitedPlace1]);
    });

});

describe('replaceVisitedPlaceShortcuts', () => {

    const shortcutInterview = _cloneDeep(interviewAttributes);
    shortcutInterview.responses.household = {
        size: 3,
        persons: {
            person1: {
                _uuid: 'person1',
                _sequence: 1,
                visitedPlaces: {
                    basicPlace: {
                        _uuid: 'basicPlace',
                        _sequence: 1,
                        geography: {
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: [-73, 45 ]},
                            properties: { lastAction: 'mapClicked' }
                        },
                        name: 'blabla'
                    },
                    usedAsShortcut: {
                        _uuid: 'usedAsShortcut',
                        _sequence: 2,
                        geography: {
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: [-73.1, 45.1 ]},
                            properties: { lastAction: 'mapClicked' }
                        },
                        name: 'used as a shortcut'
                    },
                    shortcutToShortcut: {
                        _uuid: 'shortcutToShortcut',
                        _sequence: 3,
                        geography: {
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: [-73.2, 45.2 ]},
                            properties: { lastAction: 'shortcut' }
                        },
                        shortcut: 'household.persons.person3.visitedPlaces.shortcutToBasic2'
                    },
                }
            },
            person2: {
                _uuid: 'person2',
                _sequence: 2,
                visitedPlaces: {
                    isAShortcut: {
                        _uuid: 'isAShortcut',
                        _sequence: 1,
                        geography: {
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: [-73.1, 45.1 ]},
                            properties: { lastAction: 'shortcut' }
                        },
                        shortcut: 'household.persons.person1.visitedPlaces.usedAsShortcut'
                    },
                    basicPlace2: {
                        _uuid: 'basicPlace2',
                        _sequence: 2,
                        geography: {
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: [-73.2, 45.2 ]},
                            properties: { lastAction: 'markerDragged' }
                        },
                        name: 'basic place 2'
                    },
                }
            },
            person3: {
                _uuid: 'person3',
                _sequence: 3,
                visitedPlaces: {
                    isAShortcutToo: {
                        _uuid: 'isAShortcutToo',
                        _sequence: 1,
                        geography: {
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: [-73.1, 45.1 ]},
                            properties: { lastAction: 'shortcut' }
                        },
                        shortcut: 'household.persons.person1.visitedPlaces.usedAsShortcut'
                    },
                    shortcutToBasic2: {
                        _uuid: 'shortcutToBasic2',
                        _sequence: 2,
                        geography: {
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: [-73.2, 45.2 ]},
                            properties: { lastAction: 'shortcut' }
                        },
                        shortcut: 'household.persons.person2.visitedPlaces.basicPlace2'
                    },
                    againAShortcut: {
                        _uuid: 'againAShortcut',
                        _sequence: 3,
                        geography: {
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: [-73.1, 45.1 ]},
                            properties: { lastAction: 'shortcut' }
                        },
                        shortcut: 'household.persons.person1.visitedPlaces.usedAsShortcut'
                    },
                }
            }
        }
    }

    test('Place is not a shortcut', () => {
        expect(Helpers.replaceVisitedPlaceShortcuts(shortcutInterview, 'household.persons.person1.visitedPlaces.basicPlace1')).toBeUndefined();
    });

    test('Place is a shortcut to a shorcut', () => {
        expect(Helpers.replaceVisitedPlaceShortcuts(shortcutInterview, 'household.persons.person3.visitedPlaces.shortcutToBasic2')).toEqual({
            updatedValuesByPath: {
                ['responses.household.persons.person1.visitedPlaces.shortcutToShortcut.shortcut']: ((shortcutInterview.responses.household?.persons['person3'].visitedPlaces || {})['shortcutToBasic2'] as any).shortcut,
                ['responses.household.persons.person1.visitedPlaces.shortcutToShortcut.geography']: (shortcutInterview.responses.household?.persons['person3'].visitedPlaces || {})['shortcutToBasic2'].geography
            },
            unsetPaths: []
        });
    });

    test('Place shortcut to one other place', () => {
        expect(Helpers.replaceVisitedPlaceShortcuts(shortcutInterview, 'household.persons.person2.visitedPlaces.basicPlace2')).toEqual({
            updatedValuesByPath: {
                ['responses.household.persons.person3.visitedPlaces.shortcutToBasic2.name']: ((shortcutInterview.responses.household?.persons['person2'].visitedPlaces || {})['basicPlace2'] as any).name,
                ['responses.household.persons.person3.visitedPlaces.shortcutToBasic2.geography']: (shortcutInterview.responses.household?.persons['person2'].visitedPlaces || {})['basicPlace2'].geography
            },
            unsetPaths: ['responses.household.persons.person3.visitedPlaces.shortcutToBasic2.shortcut']
        });
    });

    test('Place shortcut to many places from many persons', () => {
        expect(Helpers.replaceVisitedPlaceShortcuts(shortcutInterview, 'household.persons.person1.visitedPlaces.usedAsShortcut')).toEqual({
            updatedValuesByPath: {
                ['responses.household.persons.person2.visitedPlaces.isAShortcut.name']: ((shortcutInterview.responses.household?.persons['person1'].visitedPlaces || {})['usedAsShortcut'] as any).name,
                ['responses.household.persons.person2.visitedPlaces.isAShortcut.geography']: (shortcutInterview.responses.household?.persons['person1'].visitedPlaces || {})['usedAsShortcut'].geography,
                ['responses.household.persons.person3.visitedPlaces.isAShortcutToo.shortcut']: 'household.persons.person2.visitedPlaces.isAShortcut',
                ['responses.household.persons.person3.visitedPlaces.againAShortcut.shortcut']: 'household.persons.person2.visitedPlaces.isAShortcut'
            },
            unsetPaths: ['responses.household.persons.person2.visitedPlaces.isAShortcut.shortcut']
        });
    });
});
