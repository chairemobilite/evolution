/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import { surveyObjectExistsInInterview } from '../surveyObjectExistsInInterview';
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import type { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

const interviewUuid = uuidV4();
const householdUuid = uuidV4();
const homeUuid = uuidV4();
const personUuid = uuidV4();
const journeyUuid = uuidV4();
const tripUuid = uuidV4();
const segmentUuid = uuidV4();
const visitedPlaceUuid = uuidV4();
const organizationUuid = uuidV4();
const vehicleUuid = uuidV4();
const tripChainUuid = uuidV4();
const junctionUuid = uuidV4();
const workPlaceUuid = uuidV4();
const schoolPlaceUuid = uuidV4();

const interview = {
    uuid: interviewUuid,
    corrected_response: {
        organization: { _uuid: organizationUuid },
        household: {
            _uuid: householdUuid,
            _vehicles: [{ _uuid: vehicleUuid }],
            persons: {
                [personUuid]: {
                    _workPlaces: [{ _uuid: workPlaceUuid }],
                    _schoolPlaces: [{ _uuid: schoolPlaceUuid }],
                    journeys: {
                        [journeyUuid]: {
                            _tripChains: [{ _uuid: tripChainUuid }],
                            visitedPlaces: { [visitedPlaceUuid]: {} },
                            trips: {
                                [tripUuid]: {
                                    _junctions: [{ _uuid: junctionUuid }],
                                    segments: { [segmentUuid]: {} }
                                }
                            }
                        }
                    }
                }
            }
        },
        home: { _uuid: homeUuid }
    }
} as unknown as InterviewAttributes;

describe.each([
    ['interview', interviewUuid, true],
    ['interview', uuidV4(), false],
    ['household', householdUuid, true],
    ['home', homeUuid, true],
    ['person', personUuid, true],
    ['journey', journeyUuid, true],
    ['visitedPlace', visitedPlaceUuid, true],
    ['trip', tripUuid, true],
    ['segment', segmentUuid, true],
    ['organization', organizationUuid, true],
    ['vehicle', vehicleUuid, true],
    ['tripChain', tripChainUuid, true],
    ['junction', junctionUuid, true],
    ['workPlace', workPlaceUuid, true],
    ['schoolPlace', schoolPlaceUuid, true],
    ['person', uuidV4(), false]
] as const)('surveyObjectExistsInInterview', (objectType, objectUuid, expected) => {
    test(`${objectType}/${objectUuid} => ${expected}`, () => {
        expect(surveyObjectExistsInInterview(interview, objectType, objectUuid)).toBe(expected);
    });
});

test('returns false when corrected_response is missing for nested objects', () => {
    const interviewWithoutCorrectedResponse = { uuid: interviewUuid } as unknown as InterviewAttributes;
    expect(surveyObjectExistsInInterview(interviewWithoutCorrectedResponse, 'interview', interviewUuid)).toBe(true);
    expect(surveyObjectExistsInInterview(interviewWithoutCorrectedResponse, 'person', personUuid)).toBe(false);
});

test('falls back to response when corrected_response is blank', () => {
    const interviewWithResponseOnly = {
        uuid: interviewUuid,
        response: interview.corrected_response
    } as unknown as InterviewAttributes;
    expect(surveyObjectExistsInInterview(interviewWithResponseOnly, 'person', personUuid)).toBe(true);
});

test('ignores inherited properties on collection objects', () => {
    const inheritedPersonUuid = uuidV4();
    const persons = Object.create({ [inheritedPersonUuid]: {} });
    persons[personUuid] = {
        journeys: {
            [journeyUuid]: {
                visitedPlaces: {},
                trips: {}
            }
        }
    };

    const interviewWithInheritedPerson = {
        uuid: interviewUuid,
        corrected_response: {
            household: { persons }
        }
    } as unknown as InterviewAttributes;

    expect(surveyObjectExistsInInterview(interviewWithInheritedPerson, 'person', inheritedPersonUuid)).toBe(false);
    expect(surveyObjectExistsInInterview(interviewWithInheritedPerson, 'person', personUuid)).toBe(true);
});

test('matches singleton objects without _uuid when objectUuid equals interview uuid', () => {
    const inheritedUuidInterview = {
        uuid: interviewUuid,
        corrected_response: {
            household: {},
            home: {},
            organization: {}
        }
    } as unknown as InterviewAttributes;

    expect(surveyObjectExistsInInterview(inheritedUuidInterview, 'household', interviewUuid)).toBe(true);
    expect(surveyObjectExistsInInterview(inheritedUuidInterview, 'home', interviewUuid)).toBe(true);
    expect(surveyObjectExistsInInterview(inheritedUuidInterview, 'organization', interviewUuid)).toBe(true);
    expect(surveyObjectExistsInInterview(inheritedUuidInterview, 'household', uuidV4())).toBe(false);
});

test('throws for unsupported survey object type', () => {
    expect(() =>
        surveyObjectExistsInInterview(interview, 'unsupportedType' as SurveyObjectName, uuidV4())
    ).toThrow('Unsupported survey object type: unsupportedType');
});
