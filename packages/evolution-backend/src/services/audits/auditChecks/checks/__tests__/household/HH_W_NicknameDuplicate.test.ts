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
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

type NicknameDuplicateCase = {
    title: string;
    nicknames?: (string | undefined)[];
    shouldWarn: boolean;
};

describe('HH_W_NicknameDuplicate', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();
    const surveyObjectsRegistry = new SurveyObjectsRegistry();

    const expectedWarning = {
        objectType: 'household',
        objectUuid: validHouseholdUuid,
        errorCode: 'HH_W_NicknameDuplicate',
        version: 1,
        level: 'warning',
        message: 'At least two household members share the same nickname',
        ignore: false
    };

    const makeContext = (nicknames: (string | undefined)[] | undefined) =>
        createContextWithHouseholdAndHome(
            {
                members: nicknames?.map(
                    (nickname) => new Person({ _uuid: uuidV4(), nickname }, surveyObjectsRegistry)
                )
            },
            undefined,
            validHouseholdUuid,
            validHomeUuid
        );

    it.each<NicknameDuplicateCase>([
        {
            title: 'no members',
            nicknames: undefined,
            shouldWarn: false
        },
        {
            title: 'empty members',
            nicknames: [],
            shouldWarn: false
        },
        {
            title: 'single person',
            nicknames: ['Paul'],
            shouldWarn: false
        },
        {
            title: 'distinct nicknames',
            nicknames: ['Paul', 'Marie', 'Jean'],
            shouldWarn: false
        },
        {
            title: 'undefined nicknames are ignored',
            nicknames: [undefined, undefined],
            shouldWarn: false
        },
        {
            title: 'blank nicknames are ignored',
            nicknames: ['', '   '],
            shouldWarn: false
        },
        {
            title: 'one blank and one real nickname',
            nicknames: [undefined, 'Paul'],
            shouldWarn: false
        },
        {
            title: 'exact duplicate',
            nicknames: ['Paul', 'Paul'],
            shouldWarn: true
        },
        {
            title: 'duplicate with different case',
            nicknames: ['Paul', 'paul'],
            shouldWarn: true
        },
        {
            title: 'duplicate with surrounding whitespace',
            nicknames: ['Paul', ' Paul '],
            shouldWarn: true
        },
        {
            title: 'duplicate with accents folded',
            nicknames: ['Léa', 'Lea'],
            shouldWarn: true
        },
        {
            // Rarer accent mark, still stripped since accent-folding matches
            // any Unicode combining mark instead of just the common accent range.
            title: 'duplicate with a rare accent mark',
            nicknames: ['A᪰', 'A'],
            shouldWarn: true
        },
        {
            title: 'duplicate among three, one distinct',
            nicknames: ['Paul', 'Marie', 'paul'],
            shouldWarn: true
        },
        {
            title: 'duplicate does not count blank as a match',
            nicknames: ['', 'Paul', 'Marie'],
            shouldWarn: false
        }
    ])('$title', ({ nicknames, shouldWarn }) => {
        const result = householdAuditChecks.HH_W_NicknameDuplicate(makeContext(nicknames));

        if (shouldWarn) {
            expect(result).toMatchObject(expectedWarning);
        } else {
            expect(result).toBeUndefined();
        }
    });
});
