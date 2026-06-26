/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { householdAuditChecks } from '../../HouseholdAuditChecks';
import { createContextWithHouseholdAndHome } from './testHelper';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { Segment } from 'evolution-common/lib/services/baseObjects/Segment';
import { Mode } from 'evolution-common/lib/services/baseObjects/attributeTypes/SegmentAttributes';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

describe('HH_F_AtLeastOneTransitSegmentInHousehold audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();
    const surveyObjectsRegistry = new SurveyObjectsRegistry();

    const expectedInfoAudit = {
        objectType: 'household',
        objectUuid: validHouseholdUuid,
        errorCode: 'HH_F_AtLeastOneTransitSegmentInHousehold',
        version: 1,
        level: 'info',
        message: 'At least one transit trip in household',
        ignore: false
    };

    /**
     * A household member with one journey, one trip and one segment using
     * the given mode. Used as the fully-populated starting point; individual
     * tests then remove one link of the chain to check it is handled.
     */
    const makePersonWithSegmentMode = (mode: Mode): Person => {
        const trip = new Trip({ _uuid: uuidV4() }, surveyObjectsRegistry);
        trip.segments = [new Segment({ _uuid: uuidV4(), mode }, surveyObjectsRegistry)];

        const journey = new Journey({ _uuid: uuidV4() }, surveyObjectsRegistry);
        journey.trips = [trip];

        const person = new Person({ _uuid: uuidV4() }, surveyObjectsRegistry);
        person.journeys = [journey];
        return person;
    };

    const runCheck = (members: Person[] | undefined) => {
        const context = createContextWithHouseholdAndHome({ members }, undefined, validHouseholdUuid, validHomeUuid);
        return householdAuditChecks.HH_F_AtLeastOneTransitSegmentInHousehold(context);
    };

    it('flags a household with a transit segment', () => {
        const result = runCheck([makePersonWithSegmentMode('transitBus')]);
        expect(result).toMatchObject(expectedInfoAudit);
    });

    it('does not flag a household with only non-transit segments', () => {
        const result = runCheck([makePersonWithSegmentMode('walk'), makePersonWithSegmentMode('carDriver')]);
        expect(result).toBeUndefined();
    });

    it.each([
        ['members is undefined', undefined],
        ['members is empty', []]
    ] as [string, Person[] | undefined][])('does not flag when %s', (_title, members) => {
        expect(runCheck(members)).toBeUndefined();
    });

    it('does not flag when a member has no journeys', () => {
        const person = makePersonWithSegmentMode('transitBus');
        person.journeys = undefined;
        expect(runCheck([person])).toBeUndefined();
    });

    it('does not flag when a journey has no trips', () => {
        const person = makePersonWithSegmentMode('transitBus');
        (person.journeys as Journey[])[0].trips = undefined;
        expect(runCheck([person])).toBeUndefined();
    });

    it('does not flag when a trip has no segments', () => {
        const person = makePersonWithSegmentMode('transitBus');
        (person.journeys as Journey[])[0].trips![0].segments = undefined;
        expect(runCheck([person])).toBeUndefined();
    });
});
