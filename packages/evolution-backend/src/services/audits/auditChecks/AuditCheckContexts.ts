/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { Segment } from 'evolution-common/lib/services/baseObjects/Segment';
import { Optional } from 'evolution-common/lib/types/Optional.type';
import { AuditForObject } from 'evolution-common/lib/services/audits/types';

/**
 * Context for interview audit checks
 */
export type InterviewAuditCheckContext = {
    interview: Interview;
};

/**
 * Context for household audit checks (includes parent objects)
 */
export type HouseholdAuditCheckContext = {
    household: Household;
    interview: Interview;
};

/**
 * Context for home audit checks (includes parent objects)
 */
export type HomeAuditCheckContext = {
    home: Home;
    household: Optional<Household>;
    interview: Interview;
};

/**
 * Context for person audit checks (includes parent objects)
 */
export type PersonAuditCheckContext = {
    person: Person;
    household: Optional<Household>;
    home: Optional<Home>;
    interview: Interview;
};

/**
 * Context for journey audit checks (includes parent objects)
 */
export type JourneyAuditCheckContext = {
    journey: Journey;
    person: Person;
    household: Optional<Household>;
    home: Optional<Home>;
    interview: Interview;
};

/**
 * Context for visited place audit checks (includes all parent objects up to interview)
 */
export type VisitedPlaceAuditCheckContext = {
    visitedPlace: VisitedPlace;
    person: Person;
    journey: Journey;
    household: Optional<Household>;
    home: Optional<Home>;
    interview: Interview;
};

/**
 * Context for trip audit checks (includes all parent objects up to interview)
 */
export type TripAuditCheckContext = {
    trip: Trip;
    person: Person;
    journey: Journey;
    household: Optional<Household>;
    home: Optional<Home>;
    interview: Interview;
};

/**
 * Context for segment audit checks (includes all parent objects up to interview)
 */
export type SegmentAuditCheckContext = {
    segment: Segment;
    trip: Trip;
    person: Person;
    journey: Journey;
    household: Optional<Household>;
    home: Optional<Home>;
    interview: Interview;
};

/**
 * Generic audit check function signatures
 */
export type InterviewAuditCheckFunction = (context: InterviewAuditCheckContext) => Partial<AuditForObject> | undefined;
export type HouseholdAuditCheckFunction = (context: HouseholdAuditCheckContext) => Partial<AuditForObject> | undefined;
export type HomeAuditCheckFunction = (context: HomeAuditCheckContext) => Partial<AuditForObject> | undefined;
export type PersonAuditCheckFunction = (context: PersonAuditCheckContext) => Partial<AuditForObject> | undefined;
export type JourneyAuditCheckFunction = (context: JourneyAuditCheckContext) => Partial<AuditForObject> | undefined;
export type VisitedPlaceAuditCheckFunction = (
    context: VisitedPlaceAuditCheckContext
) => Partial<AuditForObject> | undefined;
export type TripAuditCheckFunction = (context: TripAuditCheckContext) => Partial<AuditForObject> | undefined;
export type SegmentAuditCheckFunction = (context: SegmentAuditCheckContext) => Partial<AuditForObject> | undefined;
