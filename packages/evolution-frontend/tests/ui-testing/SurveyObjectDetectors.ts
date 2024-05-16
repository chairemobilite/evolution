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
const activePersonKeyRegex = /^responses\._activePersonId$/
const journeyObjectKeyRegex = /^responses\.household\.persons\.[0-9a-f-]{36}.journeys.[0-9a-f-]{36}$/
const activeJourneyKeyRegex = /^responses\._activeJourneyId$/
const visitedPlaceObjectKeyRegex = /^responses\.household\.persons\.[0-9a-f-]{36}.journeys.[0-9a-f-]{36}.visitedPlaces.[0-9a-f-]{36}$/
const activeVisitedPlaceKeyRegex = /^responses\._activeVisitedPlaceId$/

// Store the survey object IDs
let personIds: string[] = [];
let journeys: { [personId: string]: string[] } = {};
let visitedPlaces: { [journeyId: string]: string[] } = {};
// Store the active object IDs
let activePersonId: string | undefined = undefined;
let activeJourneyId: string | undefined = undefined;
let activeVisitedPlaceId: string | undefined = undefined;

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

const replaceWithActivePersonId = (str: string): string => {
    const activePersonStr = '${activePersonId}';
    return str.includes(activePersonStr) && typeof activePersonId === 'string' ? str.replace(activePersonStr, activePersonId) : str;
}

const replaceWithActiveJourneyId = (str: string): string => {
    const activeJourneyStr = '${activeJourneyId}';
    return str.includes(activeJourneyStr) && typeof activeJourneyId === 'string' ? str.replace(activeJourneyStr, activeJourneyId) : str;
}

const replaceWithActiveVisitedPlaceId = (str: string): string => {
    const activeVisitedPlaceStr = '${activeVisitedPlaceId}';
    return str.includes(activeVisitedPlaceStr) && typeof activeVisitedPlaceId === 'string' ? str.replace(activeVisitedPlaceStr, activeVisitedPlaceId) : str;
}

/**
 * Replace any object ID in ${objectId[n]} or ${objectPath} format with the actual object ID
 * 
 * @param str The string from which to replace the ids
 * @returns the replaced string
 */
export const replaceWithIds = (str: string): string => {
    let newString = replaceWithPersonId(str);
    newString = replaceWithActivePersonId(newString);
    newString = replaceWithActiveJourneyId(newString);
    newString = replaceWithActiveVisitedPlaceId(newString);
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

// Detect the active person id from the survey update data
const detectActivePerson = (data: any) => {
    // Get the person objects and store the person ids
    const activePersonKey = Object.keys(data).find(key => key.match(activePersonKeyRegex) !== null);
    if (activePersonKey !== undefined) {
        activePersonId = data[activePersonKey];
    }
};

function detectJourneys(data: any) {
    // Get the person objects and store the person ids
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
    // Get the person objects and store the person ids
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

// Detect the active journey id from the survey update data
const detectActiveJourney = (data: any) => {
    const activeJourneyKey = Object.keys(data).find(key => key.match(activeJourneyKeyRegex) !== null);
    if (activeJourneyKey !== undefined) {
        activeJourneyId = data[activeJourneyKey];
    }
};

// Detect the active visited place id from the survey update data
const detectActiveVisitedPlace = (data: any) => {
    const activeVisitedPlaceKy = Object.keys(data).find(key => key.match(activeVisitedPlaceKeyRegex) !== null);
    if (activeVisitedPlaceKy !== undefined) {
        activeVisitedPlaceId = data[activeVisitedPlaceKy];
    }
};

export const detectSurveyObjects = (data: any) => {
    detectPersonIds(data);
    detectActivePerson(data);
    detectJourneys(data);
    detectVisitedPlaces(data);
    detectActiveJourney(data);
    detectActiveVisitedPlace(data);
};

