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
import { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { Mode } from 'evolution-common/lib/services/baseObjects/attributeTypes/SegmentAttributes';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

type ArrayState = 'undefined' | 'empty' | 'present';

describe('HH_F_AtLeastOneTransitSegmentInHousehold audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();
    const surveyObjectsRegistry = new SurveyObjectsRegistry();

    /**
     * Maps a parametric test state to the value assigned on a survey object array field.
     * `undefined` and `[]` are both "empty" at runtime but represent different persisted
     * shapes; the empty-chain tests exercise each link (members → journeys → trips → …)
     * with both so the audit does not false-positive when data is missing vs explicitly empty.
     */
    const resolveArray = <T>(state: ArrayState, items: T[]): T[] | undefined => {
        if (state === 'undefined') {
            return undefined;
        }
        if (state === 'empty') {
            return [];
        }
        return items;
    };

    const makePersonWithChain = ({
        journeys = 'present',
        trips = 'present',
        segments = 'present',
        visitedPlaces = 'present'
    }: {
        journeys?: ArrayState;
        trips?: ArrayState;
        segments?: ArrayState;
        visitedPlaces?: ArrayState;
    }): Person => {
        const trip = new Trip({ _uuid: uuidV4() }, surveyObjectsRegistry);
        trip.segments = resolveArray(
            segments,
            [new Segment({ _uuid: uuidV4(), mode: 'walk' }, surveyObjectsRegistry)]
        );

        const journey = new Journey({ _uuid: uuidV4() }, surveyObjectsRegistry);
        journey.trips = resolveArray(trips, [trip]);
        journey.visitedPlaces = resolveArray(visitedPlaces, [
            new VisitedPlace({ _uuid: uuidV4() }, surveyObjectsRegistry)
        ]);

        const person = new Person({ _uuid: uuidV4() }, surveyObjectsRegistry);
        person.journeys = resolveArray(journeys, [journey]);
        return person;
    };

    const makeMembers = (members: ArrayState): Person[] | undefined =>
        resolveArray(members, [makePersonWithChain({})]);

    const makePersonWithSegmentModes = (modes: Mode[]) => {
        const trip = new Trip({ _uuid: uuidV4() }, surveyObjectsRegistry);
        trip.segments = modes.map((mode) => new Segment({ _uuid: uuidV4(), mode }, surveyObjectsRegistry));
        const journey = new Journey({ _uuid: uuidV4() }, surveyObjectsRegistry);
        journey.trips = [trip];
        const person = new Person({ _uuid: uuidV4() }, surveyObjectsRegistry);
        person.journeys = [journey];
        return person;
    };

    const expectedInfoAudit = {
        objectType: 'household',
        objectUuid: validHouseholdUuid,
        errorCode: 'HH_F_AtLeastOneTransitSegmentInHousehold',
        version: 1,
        level: 'info',
        message: 'At least one transit trip in household',
        ignore: false
    };

    // [title, segmentModes, shouldFlag]
    const transitCases: [string, Mode[], boolean][] = [
        ['household with a transit segment', ['walk', 'transitBus'], true],
        ['household with only non-transit segments', ['walk', 'carDriver'], false]
    ];

    it.each(transitCases)('%s', (_title, segmentModes, shouldFlag) => {
        const context = createContextWithHouseholdAndHome(
            { members: [makePersonWithSegmentModes(segmentModes)] },
            undefined,
            validHouseholdUuid,
            validHomeUuid
        );

        const result = householdAuditChecks.HH_F_AtLeastOneTransitSegmentInHousehold(context);

        if (shouldFlag) {
            expect(result).toMatchObject(expectedInfoAudit);
        } else {
            expect(result).toBeUndefined();
        }
    });

    // [title, members, journeys, trips, segments, visitedPlaces]
    const emptyChainCases: [string, ArrayState, ArrayState, ArrayState, ArrayState, ArrayState][] = [
        ['members undefined', 'undefined', 'present', 'present', 'present', 'present'],
        ['members empty', 'empty', 'present', 'present', 'present', 'present'],
        ['journeys undefined', 'present', 'undefined', 'present', 'present', 'present'],
        ['journeys empty', 'present', 'empty', 'present', 'present', 'present'],
        ['trips undefined', 'present', 'present', 'undefined', 'present', 'present'],
        ['trips empty', 'present', 'present', 'empty', 'present', 'present'],
        ['segments undefined', 'present', 'present', 'present', 'undefined', 'present'],
        ['segments empty', 'present', 'present', 'present', 'empty', 'present'],
        ['visitedPlaces undefined', 'present', 'present', 'present', 'present', 'undefined'],
        ['visitedPlaces empty', 'present', 'present', 'present', 'present', 'empty']
    ];

    it.each(emptyChainCases)(
        'should not flag when %s',
        (_title, members, journeys, trips, segments, visitedPlaces) => {
            const context = createContextWithHouseholdAndHome(
                {
                    members:
                        members === 'undefined' || members === 'empty'
                            ? makeMembers(members)
                            : [makePersonWithChain({ journeys, trips, segments, visitedPlaces })]
                },
                undefined,
                validHouseholdUuid,
                validHomeUuid
            );

            expect(householdAuditChecks.HH_F_AtLeastOneTransitSegmentInHousehold(context)).toBeUndefined();
        }
    );
});
