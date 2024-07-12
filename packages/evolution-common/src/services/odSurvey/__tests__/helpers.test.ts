/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import each from 'jest-each';
import i18n from 'i18next';
import _cloneDeep from 'lodash/cloneDeep';
import { Journey, Person, Trip, UserInterviewAttributes } from '../../interviews/interview';

import * as Helpers from '../helpers';

jest.mock('i18next', () => ({
    t: jest.fn(),
    language: 'en'
}));
jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('arbitrary uuid') }));

const baseInterviewAttributes: Pick<UserInterviewAttributes, 'id' | 'uuid' | 'participant_id' | 'is_completed' | 'is_questionable' | 'is_valid'> = {
    id: 1,
    uuid: 'arbitrary uuid',
    participant_id: 1,
    is_completed: false,
    is_questionable: false,
    is_valid: true
}

const interviewAttributes: UserInterviewAttributes = {
    ...baseInterviewAttributes,
    responses: {
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
    responses: {
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

each([
    ['null personId, no active person', interviewAttributesWithHh.responses, null, null],
    ['null personId, get active person', {
        ...interviewAttributesWithHh.responses,
        _activePersonId: 'personId2'
    }, null, (interviewAttributesWithHh.responses as any).household.persons.personId2],
    ['Existing person ID', interviewAttributesWithHh.responses, 'personId1', (interviewAttributesWithHh.responses as any).household.persons.personId1],
    ['Non-existent person ID', interviewAttributesWithHh.responses, 'unexistentPersonId', null],
    ['Empty household', { household: {} }, 'personId1', null],
    ['Empty responses', {}, 'personId1', null]
]).test('getPerson: %s', (_title, responses, personId, expected) => {
    const interview = _cloneDeep(interviewAttributesWithHh);
    interview.responses = responses;
    expect(Helpers.getPerson(interview, personId)).toEqual(expected);
});

describe('getJourneys', () => {

    const person: Person = {
        _uuid: 'arbitraryPerson',
        _sequence: 1,
    }

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
            activity: 'work',
        }
    }

    test('object: test without journeys', () => {
        expect(Helpers.getJourneys(person)).toEqual({});
    });

    test('object: empty journeys', () => {
        const attributes = _cloneDeep(person);
        attributes.journeys = { };
        expect(Helpers.getJourneys(attributes)).toEqual({});
    });

    test('object: with journeys, ordered', () => {
        const attributes = _cloneDeep(person);
        attributes.journeys = journeys;
        expect(Helpers.getJourneys(attributes)).toEqual(journeys);
    });

    test('array: test without journeys', () => {
        expect(Helpers.getJourneysArray(person)).toEqual([]);
    });

    test('array: empty journeys', () => {
        const attributes = _cloneDeep(person);
        attributes.journeys = { };
        expect(Helpers.getJourneysArray(attributes)).toEqual([]);
    });

    test('array: with journeys, ordered', () => {
        const attributes = _cloneDeep(person);
        attributes.journeys = journeys;
        expect(Helpers.getJourneysArray(attributes)).toEqual([journeys.journeyId2, journeys.journeyId1]);
    });

    each([
        ['null personId, no active person, no journey', interviewAttributesWithHh.responses, null, null],
        ['null personId, get active person, no journey', {
            ...interviewAttributesWithHh.responses,
            _activePersonId: 'personId2'
        }, null, null],
        ['null personId, get active person, with active journey', {
            ...interviewAttributesWithHh.responses,
            household: {
                ...interviewAttributesWithHh.responses.household,
                persons: {
                    ...interviewAttributesWithHh.responses.household!.persons,
                    personId2: {
                        ...interviewAttributesWithHh.responses.household!.persons!.personId2,
                        journeys: journeys
                    }
                }
            },
            _activePersonId: 'personId2',
            _activeJourneyId: 'journeyId1'
        }, null, journeys.journeyId1],
        ['null personId, get active person, active journey for another person', {
            ...interviewAttributesWithHh.responses,
            household: {
                ...interviewAttributesWithHh.responses.household,
                persons: {
                    ...interviewAttributesWithHh.responses.household!.persons,
                    personId2: {
                        ...interviewAttributesWithHh.responses.household!.persons!.personId2,
                        journeys: journeys
                    }
                }
            },
            _activePersonId: 'personId1',
            _activeJourneyId: 'journeyId1'
        }, null, null],
        ['Existing person, no journey', {
            ...interviewAttributesWithHh.responses,
            household: {
                ...interviewAttributesWithHh.responses.household,
                persons: {
                    ...interviewAttributesWithHh.responses.household!.persons,
                    personId2: {
                        ...interviewAttributesWithHh.responses.household!.persons!.personId2,
                        journeys: journeys
                    }
                }
            },
            _activePersonId: 'personId1',
            _activeJourneyId: 'journeyId1'
        }, 'personId1', null],
        ['Existing person, with active journey', {
            ...interviewAttributesWithHh.responses,
            household: {
                ...interviewAttributesWithHh.responses.household,
                persons: {
                    ...interviewAttributesWithHh.responses.household!.persons,
                    personId2: {
                        ...interviewAttributesWithHh.responses.household!.persons!.personId2,
                        journeys: journeys
                    }
                }
            },
            _activePersonId: 'personId2',
            _activeJourneyId: 'journeyId2'
        }, 'personId2', journeys.journeyId2],
        ['Existing person, active journey not for this person', {
            ...interviewAttributesWithHh.responses,
            household: {
                ...interviewAttributesWithHh.responses.household,
                persons: {
                    personId1: {
                        ...interviewAttributesWithHh.responses.household!.persons!.personId2,
                        journeys: {
                            'someJourneyId': {
                                _uuid: 'someJourneyId',
                                _sequence: 1
                            }
                        }
                    },
                    personId2: {
                        ...interviewAttributesWithHh.responses.household!.persons!.personId2,
                        journeys: journeys
                    }
                }
            },
            _activePersonId: 'personId1',
            _activeJourneyId: 'journeyId1'
        }, 'personId1', null],
        ['Empty household', { household: {} }, 'personId1', null],
        ['Empty responses', {}, 'personId1', null]
    ]).test('getActiveJourney: %s', (_title, responses, personId, expected) => {
        const interview = _cloneDeep(interviewAttributesWithHh);
        interview.responses = responses;
        const person = personId === null ? null : interview.responses?.household?.persons ? interview.responses?.household?.persons[personId] : null
        expect(Helpers.getActiveJourney(interview, person)).toEqual(expected);
    });

});

describe('getVisitedPlaces', () => {

    const journey: Journey = {
        _uuid: 'arbitraryJourney',
        _sequence: 1,
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
        expect(Helpers.getVisitedPlaces(journey)).toEqual({});
    });

    test('object: empty visited places', () => {
        const attributes = _cloneDeep(journey);
        attributes.visitedPlaces = { };
        expect(Helpers.getVisitedPlaces(attributes)).toEqual({});
    });

    test('object: with visited places, ordered', () => {
        const attributes = _cloneDeep(journey);
        attributes.visitedPlaces = visitedPlaces;
        expect(Helpers.getVisitedPlaces(attributes)).toEqual(visitedPlaces);
    });

    test('array: test without visited places', () => {
        expect(Helpers.getVisitedPlacesArray(journey)).toEqual([]);
    });

    test('array: empty visited places', () => {
        const attributes = _cloneDeep(journey);
        attributes.visitedPlaces = { };
        expect(Helpers.getVisitedPlacesArray(attributes)).toEqual([]);
    });

    test('array: with visited places, ordered', () => {
        const attributes = _cloneDeep(journey);
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
                                shortcut: 'household.persons.person3.journeys.journey1.visitedPlaces.shortcutToBasic2'
                            },
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
                                    geometry: { type: 'Point', coordinates: [-73.1, 45.1 ]},
                                    properties: { lastAction: 'shortcut' }
                                },
                                shortcut: 'household.persons.person1.journeys.journey1.visitedPlaces.usedAsShortcut'
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
                                    geometry: { type: 'Point', coordinates: [-73.1, 45.1 ]},
                                    properties: { lastAction: 'shortcut' }
                                },
                                shortcut: 'household.persons.person1.journeys.journey1.visitedPlaces.usedAsShortcut'
                            },
                            shortcutToBasic2: {
                                _uuid: 'shortcutToBasic2',
                                _sequence: 2,
                                geography: {
                                    type: 'Feature',
                                    geometry: { type: 'Point', coordinates: [-73.2, 45.2 ]},
                                    properties: { lastAction: 'shortcut' }
                                },
                                shortcut: 'household.persons.person2.journeys.journey1.visitedPlaces.basicPlace2'
                            },
                            againAShortcut: {
                                _uuid: 'againAShortcut',
                                _sequence: 3,
                                geography: {
                                    type: 'Feature',
                                    geometry: { type: 'Point', coordinates: [-73.1, 45.1 ]},
                                    properties: { lastAction: 'shortcut' }
                                },
                                shortcut: 'household.persons.person1.journeys.journey1.visitedPlaces.usedAsShortcut'
                            },
                        }
                    }
                }
            }
        }
    }

    test('Place is not a shortcut', () => {
        expect(Helpers.replaceVisitedPlaceShortcuts(shortcutInterview, 'household.persons.person1.journeys.journey1.visitedPlaces.basicPlace1')).toBeUndefined();
    });

    test('Place is a shortcut to a shorcut', () => {
        expect(Helpers.replaceVisitedPlaceShortcuts(shortcutInterview, 'household.persons.person3.journeys.journey1.visitedPlaces.shortcutToBasic2')).toEqual({
            updatedValuesByPath: {
                ['responses.household.persons.person1.journeys.journey1.visitedPlaces.shortcutToShortcut.shortcut']: ((shortcutInterview.responses.household!.persons!.person3.journeys!.journey1.visitedPlaces || {})['shortcutToBasic2'] as any).shortcut,
                ['responses.household.persons.person1.journeys.journey1.visitedPlaces.shortcutToShortcut.geography']: (shortcutInterview.responses.household!.persons!.person3.journeys!.journey1.visitedPlaces || {})['shortcutToBasic2'].geography
            },
            unsetPaths: []
        });
    });

    test('Place shortcut to one other place', () => {
        expect(Helpers.replaceVisitedPlaceShortcuts(shortcutInterview, 'household.persons.person2.journeys.journey1.visitedPlaces.basicPlace2')).toEqual({
            updatedValuesByPath: {
                ['responses.household.persons.person3.journeys.journey1.visitedPlaces.shortcutToBasic2.name']: ((shortcutInterview.responses.household!.persons!.person2.journeys!.journey1.visitedPlaces || {})['basicPlace2'] as any).name,
                ['responses.household.persons.person3.journeys.journey1.visitedPlaces.shortcutToBasic2.geography']: (shortcutInterview.responses.household!.persons!.person2.journeys!.journey1.visitedPlaces || {})['basicPlace2'].geography
            },
            unsetPaths: ['responses.household.persons.person3.journeys.journey1.visitedPlaces.shortcutToBasic2.shortcut']
        });
    });

    test('Place shortcut to many places from many persons', () => {
        expect(Helpers.replaceVisitedPlaceShortcuts(shortcutInterview, 'household.persons.person1.journeys.journey1.visitedPlaces.usedAsShortcut')).toEqual({
            updatedValuesByPath: {
                ['responses.household.persons.person2.journeys.journey1.visitedPlaces.isAShortcut.name']: ((shortcutInterview.responses.household!.persons!.person1.journeys!.journey1.visitedPlaces || {})['usedAsShortcut'] as any).name,
                ['responses.household.persons.person2.journeys.journey1.visitedPlaces.isAShortcut.geography']: (shortcutInterview.responses.household!.persons!.person1.journeys!.journey1.visitedPlaces || {})['usedAsShortcut'].geography,
                ['responses.household.persons.person3.journeys.journey1.visitedPlaces.isAShortcutToo.shortcut']: 'household.persons.person2.journeys.journey1.visitedPlaces.isAShortcut',
                ['responses.household.persons.person3.journeys.journey1.visitedPlaces.againAShortcut.shortcut']: 'household.persons.person2.journeys.journey1.visitedPlaces.isAShortcut'
            },
            unsetPaths: ['responses.household.persons.person2.journeys.journey1.visitedPlaces.isAShortcut.shortcut']
        });
    });
});


describe('getTrips', () => {

    const journey: Journey = {
        _uuid: 'arbitraryJourney',
        _sequence: 1,
    }

    const trips = {
        trip1: {
            _uuid: 'trip1',
            _sequence: 2
        },
        trip2: {
            _uuid: 'trip2',
            _sequence: 1
        }
    }

    test('object: test without trips', () => {
        expect(Helpers.getTrips(journey)).toEqual({});
    });

    test('object: empty trips', () => {
        const attributes = _cloneDeep(journey);
        attributes.trips = { };
        expect(Helpers.getTrips(attributes)).toEqual({});
    });

    test('object: with trips', () => {
        const attributes = _cloneDeep(journey);
        attributes.trips = trips;
        expect(Helpers.getTrips(attributes)).toEqual(trips);
    });

    test('array: test without trips', () => {
        expect(Helpers.getTripsArray(journey)).toEqual([]);
    });

    test('array: empty trips', () => {
        const attributes = _cloneDeep(journey);
        attributes.trips = { };
        expect(Helpers.getTripsArray(attributes)).toEqual([]);
    });

    test('array: with trips, ordered', () => {
        const attributes = _cloneDeep(journey);
        attributes.trips = trips;
        expect(Helpers.getTripsArray(attributes)).toEqual([trips.trip2, trips.trip1]);
    });

    each([
        ['Null journey, no active journey', { }, false],
        ['Null journey, active journey, with active trip', { activePersonId: 'personId1', activeJourneyId: 'journeyId1', activeTripId: 'trip1' }, true],
        ['Null journey, active journey, active trip for another journey', { activePersonId: 'personId1', activeJourneyId: 'journeyId1', activeTripId: 'tripP2T1' }, false],
        ['With journey and active trip', { activePersonId: 'personId1', activeJourneyId: 'journeyId1', activeTripId: 'tripP2T1', testPersonId: 'personId2', testJourneyId: 'journeyId2' }, true],
        ['With journey, no active trip', { activePersonId: 'personId1', activeJourneyId: 'journeyId1', testPersonId: 'personId1', testJourneyId: 'journeyId1' }, false],
        ['With journey, active trip for another journey', { activePersonId: 'personId1', activeJourneyId: 'journeyId1', activeTripId: 'tripP2T1', testPersonId: 'personId1', testJourneyId: 'journeyId1'  }, false]
    ]).test('getActiveTrip: %s', (_title, testData: { activePersonId?: string, activeJourneyId?: string, activeTripId?: string, testPersonId?: string, testJourneyId?: string }, expectResult) => {
        const interview = _cloneDeep(interviewAttributesWithHh);
        // Set the persons and journeys for the test
        interview.responses.household!.persons = {
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
                _uuid: 'personId2', _sequence: 2,
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
        }
        if (testData.activePersonId) {
            interview.responses._activePersonId = testData.activePersonId;
        }
        if (testData.activeJourneyId) {
            interview.responses._activeJourneyId = testData.activeJourneyId;
        }
        if (testData.activeTripId) {
            interview.responses._activeTripId = testData.activeTripId;
        }
        const journey = testData.testPersonId && testData.testJourneyId ? interview.responses.household!.persons![testData.testPersonId].journeys![testData.testJourneyId] : null;
        const result = expectResult ? interview.responses.household!.persons![(testData.testPersonId || testData.activePersonId) as string].journeys![(testData.testJourneyId || testData.activeJourneyId) as string].trips![testData.activeTripId!] : null;
        const activeTrip = Helpers.getActiveTrip(interview, journey);
        if (expectResult) {
            expect(activeTrip).toBeTruthy();
            expect(activeTrip).toEqual(result);
        } else {
            expect(activeTrip).toEqual(null);
        }
    });

});
