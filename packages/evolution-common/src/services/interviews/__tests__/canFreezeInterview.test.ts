/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { setProjectConfiguration } from 'chaire-lib-common/lib/config/shared/project.config';
import projectConfig from '../../../config/project.config';
import {
    canFreezeInterview,
    getRespondentOpenedAtMilliseconds,
    isParticipantBlockedByFreeze
} from '../canFreezeInterview';

const nowMilliseconds = Date.parse('2026-09-08T16:00:00.000Z');
const nowSeconds = nowMilliseconds / 1000;
const delaySeconds = projectConfig.minimumDelayBeforeFreezeSeconds;

describe('getRespondentOpenedAtMilliseconds', () => {
    test.each([
        {
            title: '_startedAt unix seconds',
            interview: { response: { _startedAt: 1_700_000_000 } },
            expected: 1_700_000_000_000
        },
        {
            title: 'created_at when _startedAt is missing',
            interview: { created_at: '2026-09-01T12:00:00.000Z' },
            expected: Date.parse('2026-09-01T12:00:00.000Z')
        },
        {
            title: 'no usable timestamp',
            interview: { response: {} },
            expected: undefined
        }
    ])('reads $title', ({ interview, expected }) => {
        expect(getRespondentOpenedAtMilliseconds(interview)).toEqual(expected);
    });
});

describe('canFreezeInterview', () => {
    const originalDelay = projectConfig.minimumDelayBeforeFreezeSeconds;

    afterEach(() => {
        setProjectConfiguration({ minimumDelayBeforeFreezeSeconds: originalDelay });
    });

    test.each([
        {
            title: 'the delay since _startedAt has passed',
            interview: { response: { _startedAt: nowSeconds - delaySeconds } },
            expected: true
        },
        {
            title: 'the delay since _startedAt has not passed',
            interview: { response: { _startedAt: nowSeconds - (delaySeconds - 60) } },
            expected: false
        },
        {
            title: 'the delay since created_at has passed',
            interview: { created_at: new Date(nowMilliseconds - delaySeconds * 1000).toISOString() },
            expected: true
        },
        {
            title: 'the opening time is unknown',
            interview: { response: {} },
            expected: false
        }
    ])('is $expected when $title', ({ interview, expected }) => {
        expect(canFreezeInterview(interview, nowMilliseconds)).toEqual(expected);
    });

    test('uses the configured delay', () => {
        setProjectConfiguration({ minimumDelayBeforeFreezeSeconds: 60 });
        expect(
            canFreezeInterview({ response: { _startedAt: nowSeconds - 61 } }, nowMilliseconds)
        ).toEqual(true);
        expect(
            canFreezeInterview({ response: { _startedAt: nowSeconds - 30 } }, nowMilliseconds)
        ).toEqual(false);
    });
});

describe('isParticipantBlockedByFreeze', () => {
    test.each([
        {
            title: 'frozen after the delay',
            interview: {
                is_frozen: true,
                response: { _startedAt: nowSeconds - delaySeconds }
            },
            expected: true
        },
        {
            title: 'frozen before the delay',
            interview: {
                is_frozen: true,
                response: { _startedAt: nowSeconds - 60 }
            },
            expected: false
        },
        {
            title: 'not frozen after the delay',
            interview: {
                is_frozen: false,
                response: { _startedAt: nowSeconds - delaySeconds }
            },
            expected: false
        }
    ])('is $expected when $title', ({ interview, expected }) => {
        expect(isParticipantBlockedByFreeze(interview, nowMilliseconds)).toEqual(expected);
    });
});
