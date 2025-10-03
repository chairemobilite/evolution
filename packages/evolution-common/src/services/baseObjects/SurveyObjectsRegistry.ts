/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidv4 } from 'uuid';

import { Optional } from '../../types/Optional.type';
import { Journey } from './Journey';
import { Person } from './Person';
import { Household } from './Household';
import { Interview } from './interview/Interview';
import { VisitedPlace } from './VisitedPlace';
import { Segment } from './Segment';
import { TripChain } from './TripChain';
import { Vehicle } from './Vehicle';
import { Organization } from './Organization';
import { Trip } from './Trip';
import { Junction } from './Junction';
import { Place } from './Place';

/**
 * Registry pattern to resolve parent-child relationships without circular references.
 * This allows child objects to access their parents through UUID lookups.
 */
export class SurveyObjectsRegistry {
    private _uuid: string = uuidv4();

    private _interviews: Map<string, Interview> = new Map();
    private _places: Map<string, Place> = new Map();
    private _households: Map<string, Household> = new Map();
    private _persons: Map<string, Person> = new Map();
    private _vehicles: Map<string, Vehicle> = new Map();
    private _organizations: Map<string, Organization> = new Map();
    private _journeys: Map<string, Journey> = new Map();
    private _visitedPlaces: Map<string, VisitedPlace> = new Map();
    private _trips: Map<string, Trip> = new Map();
    private _tripChains: Map<string, TripChain> = new Map();
    private _segments: Map<string, Segment> = new Map();
    private _junctions: Map<string, Junction> = new Map();

    constructor() {
        this._uuid = uuidv4();
    }

    get uuid(): string {
        return this._uuid;
    }

    // Registration methods
    registerInterview(interview: Interview): void {
        if (interview.uuid) {
            this._interviews.set(interview.uuid, interview);
        }
    }

    registerPlace(place: Place): void {
        if (place.uuid) {
            this._places.set(place.uuid, place);
        }
    }

    registerHousehold(household: Household): void {
        if (household.uuid) {
            this._households.set(household.uuid, household);
        }
    }

    registerPerson(person: Person): void {
        if (person.uuid) {
            this._persons.set(person.uuid, person);
        }
    }

    registerVehicle(vehicle: Vehicle): void {
        if (vehicle.uuid) {
            this._vehicles.set(vehicle.uuid, vehicle);
        }
    }

    registerOrganization(organization: Organization): void {
        if (organization.uuid) {
            this._organizations.set(organization.uuid, organization);
        }
    }

    registerJourney(journey: Journey): void {
        if (journey.uuid) {
            this._journeys.set(journey.uuid, journey);
        }
    }

    registerVisitedPlace(visitedPlace: VisitedPlace): void {
        if (visitedPlace.uuid) {
            this._visitedPlaces.set(visitedPlace.uuid, visitedPlace);
        }
    }

    registerTrip(trip: Trip): void {
        if (trip.uuid) {
            this._trips.set(trip.uuid, trip);
        }
    }

    registerTripChain(tripChain: TripChain): void {
        if (tripChain.uuid) {
            this._tripChains.set(tripChain.uuid, tripChain);
        }
    }

    registerSegment(segment: Segment): void {
        if (segment.uuid) {
            this._segments.set(segment.uuid, segment);
        }
    }

    registerJunction(junction: Junction): void {
        if (junction.uuid) {
            this._junctions.set(junction.uuid, junction);
        }
    }

    // Lookup methods
    getInterview(uuid: string): Optional<Interview> {
        return this._interviews.get(uuid);
    }

    getPlace(uuid: string): Optional<Place> {
        return this._places.get(uuid);
    }

    getHousehold(uuid: string): Optional<Household> {
        return this._households.get(uuid);
    }

    getPerson(uuid: string): Optional<Person> {
        return this._persons.get(uuid);
    }

    getVehicle(uuid: string): Optional<Vehicle> {
        return this._vehicles.get(uuid);
    }

    getOrganization(uuid: string): Optional<Organization> {
        return this._organizations.get(uuid);
    }

    getJourney(uuid: string): Optional<Journey> {
        return this._journeys.get(uuid);
    }

    getVisitedPlace(uuid: string): Optional<VisitedPlace> {
        return this._visitedPlaces.get(uuid);
    }

    getTrip(uuid: string): Optional<Trip> {
        return this._trips.get(uuid);
    }

    getTripChain(uuid: string): Optional<TripChain> {
        return this._tripChains.get(uuid);
    }

    getSegment(uuid: string): Optional<Segment> {
        return this._segments.get(uuid);
    }

    getJunction(uuid: string): Optional<Junction> {
        return this._junctions.get(uuid);
    }

    // Cleanup methods
    clear(): void {
        this._interviews.clear();
        this._places.clear();
        this._households.clear();
        this._persons.clear();
        this._vehicles.clear();
        this._organizations.clear();
        this._journeys.clear();
        this._visitedPlaces.clear();
        this._trips.clear();
        this._tripChains.clear();
        this._segments.clear();
        this._junctions.clear();
    }

    unregisterInterview(uuid: string): void {
        this._interviews.delete(uuid);
    }

    unregisterPlace(uuid: string): void {
        this._places.delete(uuid);
    }

    unregisterHousehold(uuid: string): void {
        this._households.delete(uuid);
    }

    unregisterPerson(uuid: string): void {
        this._persons.delete(uuid);
    }

    unregisterVehicle(uuid: string): void {
        this._vehicles.delete(uuid);
    }

    unregisterOrganization(uuid: string): void {
        this._organizations.delete(uuid);
    }

    unregisterJourney(uuid: string): void {
        this._journeys.delete(uuid);
    }

    unregisterVisitedPlace(uuid: string): void {
        this._visitedPlaces.delete(uuid);
    }

    unregisterTrip(uuid: string): void {
        this._trips.delete(uuid);
    }

    unregisterTripChain(uuid: string): void {
        this._tripChains.delete(uuid);
    }

    unregisterSegment(uuid: string): void {
        this._segments.delete(uuid);
    }

    unregisterJunction(uuid: string): void {
        this._junctions.delete(uuid);
    }
}
