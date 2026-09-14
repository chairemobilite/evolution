/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _cloneDeep from 'lodash/cloneDeep';

import { ExtendedHouseholdAttributes } from 'evolution-common/lib/services/baseObjects/Household';
import { ExtendedJourneyAttributes } from 'evolution-common/lib/services/baseObjects/Journey';
import { ExtendedPersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';
import { ExtendedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/Place';
import { ExtendedSegmentAttributes } from 'evolution-common/lib/services/baseObjects/Segment';
import { ExtendedTripAttributes } from 'evolution-common/lib/services/baseObjects/Trip';
import { ExtendedVisitedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import projectConfig from '../../config/projectConfig';
import type { SurveyObjectParser, SurveyObjectParsers } from '../audits/types';

type AttributesByUuid<T> = { [uuid: string]: T };

const hasConfiguredParser = (parsers: SurveyObjectParsers | undefined): parsers is SurveyObjectParsers => {
    return parsers !== undefined && Object.values(parsers).some((parser) => parser !== undefined);
};

/**
 * Parse each uuid-keyed child once.
 *
 * @param attributesByUuid - Questionnaire hashmap keyed by uuid
 * @param parser - Optional survey object parser for this level
 * @param correctedResponse - Cloned response passed to the parser as context
 * @returns Parsed hashmap, without the `'undefined'` key
 */
const parseAttributesByUuid = <T extends object>(
    attributesByUuid: AttributesByUuid<T> | undefined,
    parser: SurveyObjectParser<T, CorrectedResponse> | undefined,
    correctedResponse: CorrectedResponse
): AttributesByUuid<T> => {
    const parsed: AttributesByUuid<T> = {};
    for (const [uuid, attributes] of Object.entries(attributesByUuid ?? {})) {
        if (uuid === 'undefined') {
            continue;
        }
        parsed[uuid] = parser ? parser(attributes, correctedResponse) : attributes;
    }
    return parsed;
};

/**
 * Run every configured `surveyObjectParsers` entry once, then return a response
 * the object factories can consume without parsing again.
 *
 * The interview `corrected_response` is deep-cloned first. Parsers are not
 * required to clone: they run on that copy, so the stored interview is left
 * unchanged.
 *
 * Order: interview, home, household, person, journey, then each journey's
 * visited places and trips, then each trip's segments. When no parser is
 * configured, the original response is returned.
 *
 * @param originalCorrectedResponse - Interview `corrected_response`
 * @returns Parsed corrected response
 */
export const parseCorrectedResponse = (originalCorrectedResponse: CorrectedResponse): CorrectedResponse => {
    const parsers = projectConfig.surveyObjectParsers;
    if (!hasConfiguredParser(parsers)) {
        return originalCorrectedResponse;
    }

    let parsed = _cloneDeep(originalCorrectedResponse);
    if (parsers.interview) {
        parsed = parsers.interview(parsed);
    }

    if (parsed.home !== undefined && parsers.home) {
        parsed.home = parsers.home(parsed.home as ExtendedPlaceAttributes, parsed) as CorrectedResponse['home'];
    }

    if (parsed.household === undefined) {
        return parsed;
    }

    const household = (
        parsers.household
            ? parsers.household(parsed.household as ExtendedHouseholdAttributes, parsed)
            : parsed.household
    ) as ExtendedHouseholdAttributes;

    const persons = parseAttributesByUuid(
        household.persons as AttributesByUuid<ExtendedPersonAttributes> | undefined,
        parsers.person,
        parsed
    );
    for (const person of Object.values(persons)) {
        const journeys = parseAttributesByUuid(
            person.journeys as AttributesByUuid<ExtendedJourneyAttributes> | undefined,
            parsers.journey,
            parsed
        );
        for (const journey of Object.values(journeys)) {
            journey.visitedPlaces = parseAttributesByUuid(
                journey.visitedPlaces as AttributesByUuid<ExtendedVisitedPlaceAttributes> | undefined,
                parsers.visitedPlace,
                parsed
            );
            const trips = parseAttributesByUuid(
                journey.trips as AttributesByUuid<ExtendedTripAttributes> | undefined,
                parsers.trip,
                parsed
            );
            for (const trip of Object.values(trips)) {
                trip.segments = parseAttributesByUuid(
                    trip.segments as AttributesByUuid<ExtendedSegmentAttributes> | undefined,
                    parsers.segment,
                    parsed
                );
            }
            journey.trips = trips;
        }
        person.journeys = journeys;
    }

    household.persons = persons;
    parsed.household = household as CorrectedResponse['household'];
    return parsed;
};
