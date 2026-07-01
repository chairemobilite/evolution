/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import type { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

const isRecordWithKey = (record: unknown, key: string): boolean =>
    typeof record === 'object' &&
    record !== null &&
    !Array.isArray(record) &&
    Object.hasOwn(record, key) &&
    // Reject the literal key "undefined" from stringified-undefined UUIDs in response JSON.
    key !== 'undefined';

const arrayContainsObjectUuid = (collection: unknown, objectUuid: string): boolean => {
    if (!Array.isArray(collection)) {
        return false;
    }
    return collection.some(
        (item) =>
            typeof item === 'object' &&
            item !== null &&
            Object.hasOwn(item, '_uuid') &&
            (item as { _uuid?: string })._uuid === objectUuid
    );
};

/** Matches uuid-keyed maps or arrays of objects with `_uuid`. */
const collectionContainsObjectUuid = (collection: unknown, objectUuid: string): boolean =>
    isRecordWithKey(collection, objectUuid) || arrayContainsObjectUuid(collection, objectUuid);

const asNestedRecord = (value: unknown): Record<string, unknown> | undefined =>
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

/** Checks underscore-prefixed and plain collection keys on the same parent record. */
const matchesEitherCollection = (
    record: Record<string, unknown> | undefined,
    primaryKey: string,
    alternateKey: string,
    objectUuid: string
): boolean =>
    collectionContainsObjectUuid(record?.[primaryKey], objectUuid) ||
    collectionContainsObjectUuid(record?.[alternateKey], objectUuid);

const singletonObjectMatchesUuid = (
    object: { _uuid?: string } | undefined,
    objectUuid: string,
    interviewUuid: string
): boolean => {
    if (!object) {
        return false;
    }
    return object._uuid === objectUuid || (!object._uuid && interviewUuid === objectUuid);
};

type ResponseWithHousehold = {
    household?: { persons?: Record<string, unknown> };
};

const personsFromResponse = (responseData: ResponseWithHousehold): unknown[] =>
    Object.values(responseData.household?.persons ?? {});

const journeysFromPerson = (person: unknown): unknown[] =>
    Object.values((person as { journeys?: Record<string, unknown> })?.journeys ?? {});

const tripsFromJourney = (journey: unknown): unknown[] =>
    Object.values((journey as { trips?: Record<string, unknown> })?.trips ?? {});

const somePerson = (responseData: ResponseWithHousehold, predicate: (person: unknown) => boolean): boolean =>
    personsFromResponse(responseData).some(predicate);

const someJourney = (person: unknown, predicate: (journey: unknown) => boolean): boolean =>
    journeysFromPerson(person).some(predicate);

const someTrip = (journey: unknown, predicate: (trip: unknown) => boolean): boolean =>
    tripsFromJourney(journey).some(predicate);

/**
 * Returns whether the interview contains a survey object with the given type and uuid.
 * Uses corrected_response when present; otherwise falls back to response so existence
 * can be checked without mutating the interview.
 * @param interview - Interview attributes, including corrected_response and/or response
 * @param objectType - Survey object type key
 * @param objectUuid - Survey object uuid
 */
export const surveyObjectExistsInInterview = (
    interview: InterviewAttributes,
    objectType: SurveyObjectName,
    objectUuid: string
): boolean => {
    if (objectType === 'interview') {
        return interview.uuid === objectUuid;
    }

    const responseData = interview.corrected_response ?? interview.response;
    if (!responseData) {
        return false;
    }

    switch (objectType) {
    case 'household': {
        const household = responseData.household as { _uuid?: string } | undefined;
        return singletonObjectMatchesUuid(household, objectUuid, interview.uuid);
    }
    case 'home': {
        const home = responseData.home as { _uuid?: string } | undefined;
        return singletonObjectMatchesUuid(home, objectUuid, interview.uuid);
    }
    case 'person':
        return isRecordWithKey(responseData.household?.persons, objectUuid);
    case 'journey':
        return somePerson(responseData, (person) =>
            isRecordWithKey((person as { journeys?: unknown })?.journeys, objectUuid)
        );
    case 'visitedPlace':
        return somePerson(responseData, (person) =>
            someJourney(person, (journey) =>
                isRecordWithKey((journey as { visitedPlaces?: unknown })?.visitedPlaces, objectUuid)
            )
        );
    case 'trip':
        return somePerson(responseData, (person) =>
            someJourney(person, (journey) => isRecordWithKey((journey as { trips?: unknown })?.trips, objectUuid))
        );
    case 'segment':
        return somePerson(responseData, (person) =>
            someJourney(person, (journey) =>
                someTrip(journey, (trip) => isRecordWithKey((trip as { segments?: unknown })?.segments, objectUuid))
            )
        );
    case 'organization': {
        const organization = responseData.organization as { _uuid?: string } | undefined;
        if (singletonObjectMatchesUuid(organization, objectUuid, interview.uuid)) {
            return true;
        }
        return isRecordWithKey(responseData.organizations, objectUuid);
    }
    case 'vehicle': {
        const householdRecord = asNestedRecord(responseData.household);
        if (matchesEitherCollection(householdRecord, '_vehicles', 'vehicles', objectUuid)) {
            return true;
        }
        return somePerson(responseData, (person) =>
            matchesEitherCollection(asNestedRecord(person), '_vehicles', 'vehicles', objectUuid)
        );
    }
    case 'tripChain':
        return somePerson(responseData, (person) =>
            someJourney(person, (journey) =>
                matchesEitherCollection(asNestedRecord(journey), '_tripChains', 'tripChains', objectUuid)
            )
        );
    case 'junction':
        return somePerson(responseData, (person) =>
            someJourney(person, (journey) =>
                someTrip(journey, (trip) =>
                    matchesEitherCollection(asNestedRecord(trip), '_junctions', 'junctions', objectUuid)
                )
            )
        );
    case 'workPlace':
        return somePerson(responseData, (person) =>
            matchesEitherCollection(asNestedRecord(person), '_workPlaces', 'workPlaces', objectUuid)
        );
    case 'schoolPlace':
        return somePerson(responseData, (person) =>
            matchesEitherCollection(asNestedRecord(person), '_schoolPlaces', 'schoolPlaces', objectUuid)
        );
    default: {
        const exhaustiveCheck: never = objectType;
        throw new Error(`Unsupported survey object type: ${exhaustiveCheck}`);
    }
    }
};
