/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { UserInterviewAttributes, UserRuntimeInterviewAttributes } from '../../services/questionnaire/types';

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

export const homeGeographyCoordinates = [-73.5932, 45.5016] as [number, number];
export const workPlace1P1Coordinates = [-73, 45] as [number, number];
export const otherPlace2P1Coordinates = [-73.6149, 45.5362] as [number, number];
export const shoppingPlace1P2Coordinates = [-73.6149, 45.5362] as [number, number];
export const otherWorkPlace1P2Coordinates = [-73.6347, 45.5608] as [number, number];
export const schoolPlace1P3Coordinates = [-73.6131, 45.504] as [number, number];

/**
 * Interview attributes with complete data. For sake of testing, the data for
 * similar objects are not all present. For example, some information is missing
 * for persons, some places don't have geographies, etc. This data is meant for
 * objects and helper tests requiring a variety of use cases. It does not
 * represent a complete interview for a single configuration, where some fields
 * would be expected to be either present or not for all objects of the same
 * type.
 *
 * personId1/journeyId1: With age and driving license, has 4 trips (2 chains)
 * named tripN, where N is the sequence number, none have segments
 *
 * personId2/journeyId2: With age and no driving license, has 3 trips (1 chain),
 * named p2tripN, where N is the sequence number, with previous segment data
 *
 * personId3/journeyId3: Minimal person data, 2 trips (1 chain), named p3tripN
 *
 * _activerPersonId, _activerJourneyId, etc are not set and should be set by
 * individual tests, after cloning this object
 *
 * This base interview is used by many unit tests to test the behavior of the
 * widgets. Do not change it too much, as it may impact other tests.
 */
export const interviewAttributesForTestCases: UserRuntimeInterviewAttributes = {
    ...baseInterviewAttributes,
    response: {
        home: {
            geography: {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: homeGeographyCoordinates },
                properties: { lastAction: 'mapClicked' }
            }
        },
        household: {
            size: 2,
            persons: {
                personId1: {
                    _uuid: 'personId1',
                    _sequence: 1,
                    age: 45,
                    drivingLicenseOwnership: 'yes',
                    journeys: {
                        journeyId1: {
                            _uuid: 'journeyId1',
                            _sequence: 1,
                            visitedPlaces: {
                                homePlace1P1: {
                                    _uuid: 'homePlace1P1',
                                    _sequence: 1,
                                    activityCategory: 'home',
                                    activity: 'home'
                                },
                                workPlace1P1: {
                                    _uuid: 'workPlace1P1',
                                    _sequence: 2,
                                    activityCategory: 'work',
                                    activity: 'workUsual',
                                    name: 'This is my work',
                                    geography: {
                                        type: 'Feature',
                                        geometry: { type: 'Point', coordinates: workPlace1P1Coordinates },
                                        properties: { lastAction: 'mapClicked' }
                                    }
                                },
                                homePlace2P1: {
                                    _uuid: 'homePlace2P1',
                                    _sequence: 3,
                                    activityCategory: 'home',
                                    activity: 'home'
                                },
                                otherPlaceP1: {
                                    _uuid: 'otherPlaceP1',
                                    _sequence: 4,
                                    activityCategory: 'shoppingServiceRestaurant',
                                    activity: 'shopping'
                                },
                                otherPlace2P1: {
                                    _uuid: 'otherPlace2P1',
                                    _sequence: 4,
                                    activityCategory: 'shoppingServiceRestaurant',
                                    activity: 'shopping',
                                    name: 'This is a shopping place',
                                    geography: {
                                        type: 'Feature',
                                        geometry: { type: 'Point', coordinates: otherPlace2P1Coordinates },
                                        properties: { lastAction: 'mapClicked' }
                                    }
                                }
                            },
                            trips: {
                                tripId1P1: {
                                    _uuid: 'tripId1P1',
                                    _sequence: 1,
                                    _originVisitedPlaceUuid: 'homePlace1P1',
                                    _destinationVisitedPlaceUuid: 'workPlace1P1'
                                },
                                tripId2P1: {
                                    _uuid: 'tripId2P1',
                                    _sequence: 2,
                                    _originVisitedPlaceUuid: 'workPlace1P1',
                                    _destinationVisitedPlaceUuid: 'homePlace2P1'
                                },
                                tripId3P1: {
                                    _uuid: 'tripId3P1',
                                    _sequence: 3,
                                    _originVisitedPlaceUuid: 'homePlace2P1',
                                    _destinationVisitedPlaceUuid: 'otherPlaceP1'
                                },
                                tripId4P1: {
                                    _uuid: 'tripId4P1',
                                    _sequence: 4,
                                    _originVisitedPlaceUuid: 'otherPlaceP1',
                                    _destinationVisitedPlaceUuid: 'homePlace2P1'
                                }
                            }
                        }
                    }
                },
                personId2: {
                    _uuid: 'personId2',
                    _sequence: 2,
                    nickname: 'p2',
                    age: 45,
                    drivingLicenseOwnership: 'no',
                    journeys: {
                        journeyId2: {
                            _uuid: 'journeyId2',
                            _sequence: 1,
                            visitedPlaces: {
                                homePlace1P2: {
                                    _uuid: 'homePlace1P2',
                                    _sequence: 1,
                                    activityCategory: 'home',
                                    activity: 'home'
                                },
                                shoppingPlace1P2: {
                                    _uuid: 'shoppingPlace1P2',
                                    _sequence: 2,
                                    activityCategory: 'shoppingServiceRestaurant',
                                    activity: 'shopping',
                                    alreadyVisitedBySelfOrAnotherHouseholdMember: true,
                                    shortcut:
                                        'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1',
                                    geography: {
                                        type: 'Feature',
                                        geometry: { type: 'Point', coordinates: shoppingPlace1P2Coordinates },
                                        properties: { lastAction: 'mapClicked' }
                                    }
                                },
                                otherWorkPlace1P2: {
                                    _uuid: 'otherWorkPlace1P2',
                                    _sequence: 3,
                                    activity: 'other',
                                    activityCategory: 'other',
                                    name: 'This is my work',
                                    geography: {
                                        type: 'Feature',
                                        geometry: { type: 'Point', coordinates: otherWorkPlace1P2Coordinates },
                                        properties: { lastAction: 'mapClicked' }
                                    }
                                },
                                homePlace2P2: {
                                    _uuid: 'homePlace2P2',
                                    _sequence: 4,
                                    activityCategory: 'home',
                                    activity: 'home'
                                }
                            },
                            trips: {
                                tripId1P2: {
                                    _uuid: 'tripId1P2',
                                    _sequence: 1,
                                    _originVisitedPlaceUuid: 'homePlace1P2',
                                    _destinationVisitedPlaceUuid: 'shoppingPlace1P2',
                                    segments: {
                                        segmentId1P2T1: {
                                            _uuid: 'segmentId1P2T1',
                                            _sequence: 1,
                                            _isNew: false,
                                            modePre: 'walk'
                                        }
                                    }
                                },
                                tripId2P2: {
                                    _uuid: 'tripId2P2',
                                    _sequence: 2,
                                    _originVisitedPlaceUuid: 'shoppingPlace1P2',
                                    _destinationVisitedPlaceUuid: 'otherWorkPlace1P2',
                                    segments: {
                                        segmentId1P2T2: {
                                            _uuid: 'segmentId1P2T2',
                                            _sequence: 1,
                                            _isNew: false,
                                            modePre: 'walk'
                                        },
                                        segmentId2P2T2: {
                                            _uuid: 'segmentId2P2T2',
                                            _sequence: 2,
                                            _isNew: false,
                                            modePre: 'transit'
                                        }
                                    }
                                },
                                tripId3P2: {
                                    _uuid: 'tripId3P2',
                                    _sequence: 3,
                                    _originVisitedPlaceUuid: 'otherWorkPlace1P2',
                                    _destinationVisitedPlaceUuid: 'homePlace2P2'
                                }
                            }
                        }
                    }
                },
                personId3: {
                    _uuid: 'personId3',
                    _sequence: 3,
                    journeys: {
                        journeyId3: {
                            _uuid: 'journeyId3',
                            _sequence: 1,
                            visitedPlaces: {
                                homePlace1P3: {
                                    _uuid: 'homePlace1P3',
                                    _sequence: 1,
                                    activityCategory: 'home',
                                    activity: 'home'
                                },
                                schoolPlace1P3: {
                                    _uuid: 'schoolPlace1P3',
                                    _sequence: 2,
                                    activityCategory: 'school',
                                    activity: 'schoolUsual',
                                    name: 'Polytechnique Montréal',
                                    geography: {
                                        type: 'Feature',
                                        geometry: { type: 'Point', coordinates: schoolPlace1P3Coordinates },
                                        properties: { lastAction: 'mapClicked' }
                                    }
                                },
                                homePlace2P3: {
                                    _uuid: 'homePlace2P3',
                                    _sequence: 3,
                                    activityCategory: 'home',
                                    activity: 'home'
                                }
                            },
                            trips: {
                                tripId1P3: {
                                    _uuid: 'tripId1P3',
                                    _sequence: 1,
                                    _originVisitedPlaceUuid: 'homePlace1P3',
                                    _destinationVisitedPlaceUuid: 'schoolPlace1P3'
                                },
                                tripId2P3: {
                                    _uuid: 'tripId2P3',
                                    _sequence: 2,
                                    _originVisitedPlaceUuid: 'schoolPlace1P3',
                                    _destinationVisitedPlaceUuid: 'homePlace2P3'
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    validations: {},
    widgets: {},
    groups: {},
    visibleWidgets: [],
    allWidgetsValid: true
};
