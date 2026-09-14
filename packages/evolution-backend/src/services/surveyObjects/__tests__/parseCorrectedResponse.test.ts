/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import projectConfig, { setProjectConfig } from '../../../config/projectConfig';
import { parseCorrectedResponse } from '../parseCorrectedResponse';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';

const personUuid = 'person-uuid';
const journeyUuid = 'journey-uuid';
const visitedPlaceUuid = 'visited-place-uuid';
const tripUuid = 'trip-uuid';
const segmentUuid = 'segment-uuid';

const buildCorrectedResponse = (): CorrectedResponse =>
    ({
        _language: 'en',
        home: {
            address: '123 Test St'
        },
        household: {
            size: 2,
            persons: {
                [personUuid]: {
                    _uuid: personUuid,
                    _sequence: 1,
                    age: 30,
                    journeys: {
                        [journeyUuid]: {
                            _uuid: journeyUuid,
                            _sequence: 1,
                            visitedPlaces: {
                                [visitedPlaceUuid]: {
                                    _uuid: visitedPlaceUuid,
                                    _sequence: 1,
                                    activity: 'home',
                                    nextPlaceCategory: 'visitedAnotherPlace'
                                }
                            },
                            trips: {
                                [tripUuid]: {
                                    _uuid: tripUuid,
                                    _sequence: 1,
                                    segments: {
                                        [segmentUuid]: {
                                            _uuid: segmentUuid,
                                            _sequence: 1,
                                            mode: 'walk',
                                            hasNextMode: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }) as unknown as CorrectedResponse;

describe('parseCorrectedResponse', () => {
    let originalConfig: typeof projectConfig;

    beforeEach(() => {
        originalConfig = { ...projectConfig };
    });

    afterEach(() => {
        setProjectConfig(originalConfig);
    });

    test.each([
        {
            title: 'parsers is undefined',
            surveyObjectParsers: undefined
        },
        {
            title: 'no parser is configured',
            surveyObjectParsers: {}
        }
    ])('returns the original response when $title', ({ surveyObjectParsers }) => {
        setProjectConfig({ surveyObjectParsers });
        const original = buildCorrectedResponse();

        expect(parseCorrectedResponse(original)).toBe(original);
    });

    test.each([
        {
            title: 'interview',
            parserName: 'interview' as const,
            getInput: (response: CorrectedResponse) => response
        },
        {
            title: 'home',
            parserName: 'home' as const,
            getInput: (response: CorrectedResponse) => response.home
        },
        {
            title: 'household',
            parserName: 'household' as const,
            getInput: (response: CorrectedResponse) => response.household
        },
        {
            title: 'person',
            parserName: 'person' as const,
            getInput: (response: CorrectedResponse) => response.household!.persons![personUuid]
        },
        {
            title: 'journey',
            parserName: 'journey' as const,
            getInput: (response: CorrectedResponse) =>
                response.household!.persons![personUuid].journeys![journeyUuid]
        },
        {
            title: 'visitedPlace',
            parserName: 'visitedPlace' as const,
            getInput: (response: CorrectedResponse) =>
                response.household!.persons![personUuid].journeys![journeyUuid].visitedPlaces![
                    visitedPlaceUuid
                ]
        },
        {
            title: 'trip',
            parserName: 'trip' as const,
            getInput: (response: CorrectedResponse) =>
                response.household!.persons![personUuid].journeys![journeyUuid].trips![tripUuid]
        },
        {
            title: 'segment',
            parserName: 'segment' as const,
            getInput: (response: CorrectedResponse) =>
                response.household!.persons![personUuid].journeys![journeyUuid].trips![tripUuid].segments![
                    segmentUuid
                ]
        }
    ])('calls the $title parser once', ({ parserName, getInput }) => {
        const original = buildCorrectedResponse();
        const parser = jest.fn((attributes: object, _correctedResponse?: CorrectedResponse) => ({
            ...attributes
        }));
        setProjectConfig({
            surveyObjectParsers: {
                [parserName]: parser
            }
        });

        parseCorrectedResponse(original);

        expect(parser).toHaveBeenCalledTimes(1);
        expect(parser.mock.calls[0][0]).toEqual(getInput(original));
        expect(parser.mock.calls[0][0]).not.toBe(getInput(original));
        if (parserName !== 'interview') {
            expect(parser.mock.calls[0][1]).toEqual(original);
            expect(parser.mock.calls[0][1]).not.toBe(original);
        }
    });

    it('runs each configured parser once on a nested diary', () => {
        const original = buildCorrectedResponse();
        const parsers = {
            interview: jest.fn((response) => ({ ...response })),
            home: jest.fn((home) => ({ ...home })),
            household: jest.fn((household) => ({ ...household })),
            person: jest.fn((person) => ({ ...person })),
            journey: jest.fn((journey) => ({ ...journey })),
            visitedPlace: jest.fn((visitedPlace) => ({ ...visitedPlace })),
            trip: jest.fn((trip) => ({ ...trip })),
            segment: jest.fn((segment) => ({ ...segment }))
        };
        setProjectConfig({ surveyObjectParsers: parsers });

        parseCorrectedResponse(original);

        expect(parsers.interview).toHaveBeenCalledTimes(1);
        expect(parsers.home).toHaveBeenCalledTimes(1);
        expect(parsers.household).toHaveBeenCalledTimes(1);
        expect(parsers.person).toHaveBeenCalledTimes(1);
        expect(parsers.journey).toHaveBeenCalledTimes(1);
        expect(parsers.visitedPlace).toHaveBeenCalledTimes(1);
        expect(parsers.trip).toHaveBeenCalledTimes(1);
        expect(parsers.segment).toHaveBeenCalledTimes(1);
    });

    it('drops the undefined uuid key and keeps parser remaps on children', () => {
        const original = buildCorrectedResponse();
        original.household!.persons!.undefined = { _uuid: 'undefined', age: 1 } as any;
        original.household!.persons![personUuid].journeys![journeyUuid].trips![tripUuid].segments!.undefined = {
            _uuid: 'undefined'
        } as any;

        setProjectConfig({
            surveyObjectParsers: {
                person: (person) => ({ ...person, age: 99 }),
                segment: (segment) => ({ ...segment, hasNextMode: false }),
                visitedPlace: (visitedPlace) => ({
                    ...visitedPlace,
                    nextPlaceCategory: 'stayedThereUntilTheNextDay'
                })
            }
        });

        const parsed = parseCorrectedResponse(original);
        const parsedPerson = parsed.household!.persons![personUuid];
        const parsedJourney = parsedPerson.journeys![journeyUuid];

        expect(parsed.household!.persons!.undefined).toBeUndefined();
        expect(parsedPerson.age).toBe(99);
        expect((parsedJourney.visitedPlaces![visitedPlaceUuid] as any).nextPlaceCategory).toBe(
            'stayedThereUntilTheNextDay'
        );
        expect(parsedJourney.trips![tripUuid].segments![segmentUuid].hasNextMode).toBe(false);
        expect(parsedJourney.trips![tripUuid].segments!.undefined).toBeUndefined();
        expect(original.household!.persons![personUuid].age).toBe(30);
    });

    it('does not mutate the original response when a parser writes in place', () => {
        const original = buildCorrectedResponse();
        setProjectConfig({
            surveyObjectParsers: {
                person: (person) => Object.assign(person, { age: 99 })
            }
        });

        const parsed = parseCorrectedResponse(original);

        expect(parsed.household!.persons![personUuid].age).toBe(99);
        expect(original.household!.persons![personUuid].age).toBe(30);
        expect(parsed).not.toBe(original);
    });
});
