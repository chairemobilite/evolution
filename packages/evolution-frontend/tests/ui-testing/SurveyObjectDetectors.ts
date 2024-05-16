/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// This file contains functions to detect survey objects from the survey update
// data for playwright tests

// Regexes for specific survey objects
const uuidRegex = /[0-9a-f-]{36}/g
const personObjectKeyRegex = /^responses\.household\.persons\.([0-9a-f-]{36})$/
const journeyObjectKeyRegex = /^responses\.household\.persons\.[0-9a-f-]{36}.journeys.[0-9a-f-]{36}$/
const visitedPlaceObjectKeyRegex = /^responses\.household\.persons\.[0-9a-f-]{36}.journeys.[0-9a-f-]{36}.visitedPlaces.[0-9a-f-]{36}$/
const tripObjectKeyRegex = /^responses\.household\.persons\.[0-9a-f-]{36}.journeys.[0-9a-f-]{36}.trips.[0-9a-f-]{36}$/
const segmentObjectKeyRegex = /^responses\.household\.persons\.[0-9a-f-]{36}.journeys.[0-9a-f-]{36}.trips.[0-9a-f-]{36}.segments.[0-9a-f-]{36}$/
const activePersonKeyRegex = /^responses\._activePersonId$/;
const activeJourneyKeyRegex = /^responses\._activeJourneyId$/;
const activeVisitedPlaceKeyRegex = /^responses\._activeVisitedPlaceId$/;
const activeTripKeyRegex = /^responses\._activeTripId$/;

// Store the survey object IDs
let personIds: string[] = [];
let journeys: { [personId: string]: string[] } = {};
let visitedPlaces: { [journeyId: string]: string[] } = {};
let trips: { [journeyId: string]: string[] } = {};
let segments: { [tripId: string]: string[] } = {};
// Store the active object IDs
let activePersonId: string | undefined = undefined;
let activeJourneyId: string | undefined = undefined;
let activeVisitedPlaceId: string | undefined = undefined;
let activeTripId: string | undefined = undefined;

// Replace ${personId[n]} with the actual personId
const replaceWithPersonId = (str: string): string => {
    let newString = str;
    const personIdRegex = /\$\{personId\[(\d+)\]\}/g;
    const matchGroups = str.match(personIdRegex);
    if (matchGroups !== null) {
        const personIndex = Number((matchGroups[0].match(/\d+/g)as any)[0]);
        newString = str.replace(personIdRegex, personIds[personIndex]);
    }
    return newString;
};

const replaceWithActiveObjectId = (str: string, activeObjectStr: string, activeObjectId: string | undefined): string =>
    str.includes(activeObjectStr) && typeof activeObjectId === 'string' ? str.replace(activeObjectStr, activeObjectId) : str;

// Replace ${segmentId[n]} with the actual segment ID. The segment is supposed to be for the active trip (there is no activeSegment property)
const replaceWithSegmentId = (str: string): string => {
    let newString = str;
    const segmentIdRegex = /\$\{segmentId\[(\d+)\]\}/g;
    const matchGroups = str.match(segmentIdRegex);
    if (matchGroups !== null && typeof activeTripId === 'string') {
        const segmentIndex = Number((matchGroups[0].match(/\d+/g)as any)[0]);
        newString = str.replace(segmentIdRegex, segments[activeTripId][segmentIndex]);
    }
    return newString;
};

const activePersonStr = '${activePersonId}';
const activeJourneyStr = '${activeJourneyId}';
const activeVisitedPlaceStr = '${activeVisitedPlaceId}';
const activeTripStr = '${activeTripId}';
/**
 * Replace any object ID in ${objectId[n]} or ${objectPath} format with the actual object ID
 * 
 * @param str The string from which to replace the ids
 * @returns the replaced string
 */
export const replaceWithIds = (str: string): string => {
    let newString = replaceWithPersonId(str);
    newString = replaceWithActiveObjectId(newString, activePersonStr, activePersonId);
    newString = replaceWithActiveObjectId(newString, activeJourneyStr, activeJourneyId);
    newString = replaceWithActiveObjectId(newString, activeVisitedPlaceStr, activeVisitedPlaceId);
    newString = replaceWithActiveObjectId(newString, activeTripStr, activeTripId);
    newString = replaceWithSegmentId(newString);
    return newString;
}

// Detect the person ids from the survey update data
const detectPersonIds = (data: any) => {
    // Get the person objects and store the person ids
    const personObjects = Object.keys(data).filter(key => key.match(personObjectKeyRegex) !== null);
    if (personObjects.length > 0) {
        // FIXME _sequence and _uuid may not be set, or they may come differently, for example when adding a person manually ?
        personIds = Array(personObjects.length);
        personObjects.forEach(key => {
            const personData = data[key];
            personIds[personData['_sequence'] - 1] = personData['_uuid'];
        });
    }
};

const detectActiveObject = (data: any, activeObjectKeyRegex: RegExp, setter: (str: string) => void) => {
    // Get the person objects and store the person ids
    const activeObjectKey = Object.keys(data).find(key => key.match(activeObjectKeyRegex) !== null);
    if (activeObjectKey !== undefined) {
        setter(data[activeObjectKey]);
    }
}

function detectJourneys(data: any) {
    // Get the journey objects and store the journey ids
    const journeyObjectsKeys = Object.keys(data).filter(key => key.match(journeyObjectKeyRegex) !== null);
    if (journeyObjectsKeys.length > 0) {
        journeyObjectsKeys.map(key => {
            const matchGroups = key.match(uuidRegex);
            if (matchGroups !== null && matchGroups.length === 2) {
                return { personId: matchGroups[0], journeyId: matchGroups[1], data: data[key] };
            }
            throw `Invalid journey found: ${key}`;
        }).sort((a, b) => a.data['_sequence'] - b.data['_sequence']).forEach(personJourney => {
            if (!journeys[personJourney.personId]) {
                journeys[personJourney.personId] = [];
            }
            journeys[personJourney.personId].push(personJourney.journeyId);
        });
    }
}

function detectVisitedPlaces(data: any) {
    // Get the visited place objects and store the visited places ids
    const visitedPlaceObjectKeys = Object.keys(data).filter(key => key.match(visitedPlaceObjectKeyRegex) !== null);
    if (visitedPlaceObjectKeys.length > 0) {
        visitedPlaceObjectKeys.map(key => {
            const matchGroups = key.match(uuidRegex);
            if (matchGroups !== null && matchGroups.length === 3) {
                return { journeyId: matchGroups[1], visitedPlaceId: matchGroups[2], data: data[key] };
            }
            throw `Invalid visited place found: ${key}`;
        }).sort((a, b) => a.data['_sequence'] - b.data['_sequence']).forEach(journeyVisitedPlace => {
            if (!visitedPlaces[journeyVisitedPlace.journeyId]) {
                visitedPlaces[journeyVisitedPlace.journeyId] = [];
            }
            visitedPlaces[journeyVisitedPlace.journeyId].push(journeyVisitedPlace.visitedPlaceId);
        });
    }
}

function detectTrips(data: any) {
    // Get the trip objects and store the trip ids
    const tripObjectKeys = Object.keys(data).filter(key => key.match(tripObjectKeyRegex) !== null);
    if (tripObjectKeys.length > 0) {
        tripObjectKeys.map(key => {
            const matchGroups = key.match(uuidRegex);
            if (matchGroups !== null && matchGroups.length === 3) {
                return { journeyId: matchGroups[1], tripId: matchGroups[2], data: data[key] };
            }
            throw `Invalid trip found: ${key}`;
        }).sort((a, b) => a.data['_sequence'] - b.data['_sequence']).forEach(journeyTrip => {
            if (!trips[journeyTrip.journeyId]) {
                trips[journeyTrip.journeyId] = [];
            }
            trips[journeyTrip.journeyId].push(journeyTrip.tripId);
        });
    }
}

function detectSegments(data: any) {
    // Get the segment objects and store their ids
    const segmentObjectKeys = Object.keys(data).filter(key => key.match(segmentObjectKeyRegex) !== null);
    if (segmentObjectKeys.length > 0) {
        segmentObjectKeys.map(key => {
            const matchGroups = key.match(uuidRegex);
            if (matchGroups !== null && matchGroups.length === 4) {
                return { tripId: matchGroups[2], segmentId: matchGroups[3], data: data[key] };
            }
            throw `Invalid segment found: ${key}`;
        }).sort((a, b) => a.data['_sequence'] - b.data['_sequence']).forEach(segmentTrip => {
            if (!segments[segmentTrip.tripId]) {
                segments[segmentTrip.tripId] = [];
            }
            segments[segmentTrip.tripId].push(segmentTrip.segmentId);
        });
    }
}

export const detectSurveyObjects = (data: any) => {
    detectPersonIds(data);
    detectJourneys(data);
    detectVisitedPlaces(data);
    detectTrips(data);
    detectSegments(data);
    detectActiveObject(data, activePersonKeyRegex, (activeId) => activePersonId = activeId);
    detectActiveObject(data, activeJourneyKeyRegex, (activeId) => activeJourneyId = activeId);
    detectActiveObject(data, activeVisitedPlaceKeyRegex, (activeId) => activeVisitedPlaceId = activeId);
    detectActiveObject(data, activeTripKeyRegex, (activeId) => activeTripId = activeId);
};

