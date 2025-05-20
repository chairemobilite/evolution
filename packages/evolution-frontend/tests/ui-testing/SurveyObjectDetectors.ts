/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// This file contains functions to detect survey objects from the survey update
// data for playwright tests

// Regexes for specific survey objects
const uuidRegex = /[0-9a-f-]{36}/g;
const personObjectKeyRegex = /^response\.household\.persons\.([0-9a-f-]{36})$/;
const vehicleObjectKeyRegex = /^response\.household\.vehicles\.([0-9a-f-]{36})$/;
const journeyObjectKeyRegex = /^response\.household\.persons\.[0-9a-f-]{36}.journeys.[0-9a-f-]{36}$/;
const visitedPlaceObjectKeyRegex = /^response\.household\.persons\.[0-9a-f-]{36}.journeys.[0-9a-f-]{36}.visitedPlaces.[0-9a-f-]{36}$/;
const tripObjectKeyRegex = /^response\.household\.persons\.[0-9a-f-]{36}.journeys.[0-9a-f-]{36}.trips.[0-9a-f-]{36}$/;
const segmentObjectKeyRegex = /^response\.household\.persons\.[0-9a-f-]{36}.journeys.[0-9a-f-]{36}.trips.[0-9a-f-]{36}.segments.[0-9a-f-]{36}$/;
const activePersonKeyRegex = /^response\._activePersonId$/;
const activeJourneyKeyRegex = /^response\._activeJourneyId$/;
const activeVisitedPlaceKeyRegex = /^response\._activeVisitedPlaceId$/;
const activeTripKeyRegex = /^response\._activeTripId$/;
const activeVehicleKeyRegex = /^response\._activeVehicleId$/;

export class SurveyObjectDetector {
    // Store the survey object IDs
    private personIds: string[] = [];
    private vehicleIds: string[] = [];
    private journeys: { [personId: string]: string[] } = {};
    private visitedPlaces: { [journeyId: string]: string[] } = {};
    private trips: { [journeyId: string]: string[] } = {};
    private segments: { [tripId: string]: string[] } = {};
    // Store the active object IDs
    private activePersonId: string | undefined = undefined;
    private activeVehicleId: string | undefined = undefined;
    private activeJourneyId: string | undefined = undefined;
    private activeVisitedPlaceId: string | undefined = undefined;
    private activeTripId: string | undefined = undefined;

    // Replace ${personId[n]} with the actual personId
    private replaceWithPersonId(str: string): string {
        let newString = str;
        const personIdRegex = /\$\{personId\[(\d+)\]\}/g;
        const matchGroups = str.match(personIdRegex);
        if (matchGroups !== null) {
            const personIndex = Number((matchGroups[0].match(/\d+/g) as any)[0]);
            newString = str.replace(personIdRegex, this.personIds[personIndex]);
        }
        return newString;
    }

    private replaceWithVehicleId(str: string): string {
        let newString = str;
        const vehicleIdRegex = /\$\{vehicleId\[(\d+)\]\}/g;
        const matchGroups = str.match(vehicleIdRegex);
        if (matchGroups !== null) {
            const vehicleIndex = Number((matchGroups[0].match(/\d+/g) as any)[0]);
            newString = str.replace(vehicleIdRegex, this.vehicleIds[vehicleIndex]);
        }
        return newString;
    }

    private replaceWithActiveObjectId(str: string, activeObjectStr: string, activeObjectId: string | undefined): string {
        return str.includes(activeObjectStr) && typeof activeObjectId === 'string' ? str.replace(activeObjectStr, activeObjectId) : str;
    }

    // Replace ${segmentId[n]} with the actual segment ID. The segment is supposed to be for the active trip (there is no activeSegment property)
    private replaceWithSegmentId(str: string): string {
        let newString = str;
        const segmentIdRegex = /\$\{segmentId\[(\d+)\]\}/g;
        const matchGroups = str.match(segmentIdRegex);
        if (matchGroups !== null && typeof this.activeTripId === 'string') {
            const segmentIndex = Number((matchGroups[0].match(/\d+/g) as any)[0]);
            newString = str.replace(segmentIdRegex, this.segments[this.activeTripId][segmentIndex]);
        }
        return newString;
    }

    private activeVehicleStr = '${activeVehicleId}';
    private activePersonStr = '${activePersonId}';
    private activeJourneyStr = '${activeJourneyId}';
    private activeVisitedPlaceStr = '${activeVisitedPlaceId}';
    private activeTripStr = '${activeTripId}';

    /**
     * Replace any survey object ID in ${surveyObjectId[n]} or ${surveyObjectPath} format with the
     * actual survey object ID
     *
     * @param str The string from which to replace the ids
     * @returns the replaced string
     */
    public replaceWithIds(str: string): string {
        let newString = this.replaceWithPersonId(str);
        newString = this.replaceWithVehicleId(newString);
        newString = this.replaceWithActiveObjectId(newString, this.activePersonStr, this.activePersonId);
        newString = this.replaceWithActiveObjectId(newString, this.activeVehicleStr, this.activeVehicleId);
        newString = this.replaceWithActiveObjectId(newString, this.activeJourneyStr, this.activeJourneyId);
        newString = this.replaceWithActiveObjectId(newString, this.activeVisitedPlaceStr, this.activeVisitedPlaceId);
        newString = this.replaceWithActiveObjectId(newString, this.activeTripStr, this.activeTripId);
        newString = this.replaceWithSegmentId(newString);
        return newString;
    }

    // Detect the person ids from the survey update data
    private detectPersonIds(data: any) {
        // Get the person objects and store the person ids
        const personObjects = Object.keys(data).filter((key) => key.match(personObjectKeyRegex) !== null);
        if (personObjects.length > 0) {
            // FIXME _sequence and _uuid may not be set, or they may come differently, for example when adding a person manually ?
            this.personIds = Array(personObjects.length);
            personObjects.forEach((key) => {
                const personData = data[key];
                this.personIds[personData['_sequence'] - 1] = personData['_uuid'];
            });
        }
    }

    // Detect the vehicle ids from the survey update data
    private detectVehicleIds(data: any) {
        // Get the vehicle objects and store the vehicle ids
        const vehicleObjects = Object.keys(data).filter((key) => key.match(vehicleObjectKeyRegex) !== null);
        if (vehicleObjects.length > 0) {
            // FIXME _sequence and _uuid may not be set, or they may come differently, for example when adding a vehicle manually ?
            this.vehicleIds = Array(vehicleObjects.length);
            vehicleObjects.forEach((key) => {
                const vehicleData = data[key];
                this.vehicleIds[vehicleData['_sequence'] - 1] = vehicleData['_uuid'];
            });
        }
    }

    private detectActiveObject(data: any, activeObjectKeyRegex: RegExp, setter: (str: string) => void) {
        // Get the person objects and store the person ids
        const activeObjectKey = Object.keys(data).find((key) => key.match(activeObjectKeyRegex) !== null);
        if (activeObjectKey !== undefined) {
            setter(data[activeObjectKey]);
        }
    }

    private detectJourneys(data: any) {
        // Get the journey objects and store the journey ids
        const journeyObjectsKeys = Object.keys(data).filter((key) => key.match(journeyObjectKeyRegex) !== null);
        if (journeyObjectsKeys.length > 0) {
            journeyObjectsKeys.map((key) => {
                const matchGroups = key.match(uuidRegex);
                if (matchGroups !== null && matchGroups.length === 2) {
                    return { personId: matchGroups[0], journeyId: matchGroups[1], data: data[key] };
                }
                throw `Invalid journey found: ${key}`;
            }).sort((a, b) => a.data['_sequence'] - b.data['_sequence']).forEach((personJourney) => {
                if (!this.journeys[personJourney.personId]) {
                    this.journeys[personJourney.personId] = [];
                }
                this.journeys[personJourney.personId].push(personJourney.journeyId);
            });
        }
    }

    private detectVisitedPlaces(data: any) {
        // Get the visited place objects and store the visited places ids
        const visitedPlaceObjectKeys = Object.keys(data).filter((key) => key.match(visitedPlaceObjectKeyRegex) !== null);
        if (visitedPlaceObjectKeys.length > 0) {
            visitedPlaceObjectKeys.map((key) => {
                const matchGroups = key.match(uuidRegex);
                if (matchGroups !== null && matchGroups.length === 3) {
                    return { journeyId: matchGroups[1], visitedPlaceId: matchGroups[2], data: data[key] };
                }
                throw `Invalid visited place found: ${key}`;
            }).sort((a, b) => a.data['_sequence'] - b.data['_sequence']).forEach((journeyVisitedPlace) => {
                if (!this.visitedPlaces[journeyVisitedPlace.journeyId]) {
                    this.visitedPlaces[journeyVisitedPlace.journeyId] = [];
                }
                this.visitedPlaces[journeyVisitedPlace.journeyId].push(journeyVisitedPlace.visitedPlaceId);
            });
        }
    }

    private detectTrips(data: any) {
        // Get the trip objects and store the trip ids
        const tripObjectKeys = Object.keys(data).filter((key) => key.match(tripObjectKeyRegex) !== null);
        if (tripObjectKeys.length > 0) {
            tripObjectKeys.map((key) => {
                const matchGroups = key.match(uuidRegex);
                if (matchGroups !== null && matchGroups.length === 3) {
                    return { journeyId: matchGroups[1], tripId: matchGroups[2], data: data[key] };
                }
                throw `Invalid trip found: ${key}`;
            }).sort((a, b) => a.data['_sequence'] - b.data['_sequence']).forEach((journeyTrip) => {
                if (!this.trips[journeyTrip.journeyId]) {
                    this.trips[journeyTrip.journeyId] = [];
                }
                this.trips[journeyTrip.journeyId].push(journeyTrip.tripId);
            });
        }
    }

    private detectSegments(data: any) {
        // Get the segment objects and store their ids
        const segmentObjectKeys = Object.keys(data).filter((key) => key.match(segmentObjectKeyRegex) !== null);
        if (segmentObjectKeys.length > 0) {
            segmentObjectKeys.map((key) => {
                const matchGroups = key.match(uuidRegex);
                if (matchGroups !== null && matchGroups.length === 4) {
                    return { tripId: matchGroups[2], segmentId: matchGroups[3], data: data[key] };
                }
                throw `Invalid segment found: ${key}`;
            }).sort((a, b) => a.data['_sequence'] - b.data['_sequence']).forEach((segmentTrip) => {
                if (!this.segments[segmentTrip.tripId]) {
                    this.segments[segmentTrip.tripId] = [];
                }
                this.segments[segmentTrip.tripId].push(segmentTrip.segmentId);
            });
        }
    }

    /**
     * Detect survey objects and active objects from the survey update data
     *
     * @param data The survey field update data, caught from the request
     */
    public detectSurveyObjects(data: any) {
        this.detectPersonIds(data);
        this.detectVehicleIds(data);
        this.detectJourneys(data);
        this.detectVisitedPlaces(data);
        this.detectTrips(data);
        this.detectSegments(data);
        this.detectActiveObject(data, activePersonKeyRegex, (activeId) => this.activePersonId = activeId);
        this.detectActiveObject(data, activeJourneyKeyRegex, (activeId) => this.activeJourneyId = activeId);
        this.detectActiveObject(data, activeVisitedPlaceKeyRegex, (activeId) => this.activeVisitedPlaceId = activeId);
        this.detectActiveObject(data, activeTripKeyRegex, (activeId) => this.activeTripId = activeId);
        this.detectActiveObject(data, activeVehicleKeyRegex, (activeId) => this.activeVehicleId = activeId);
    }
}
