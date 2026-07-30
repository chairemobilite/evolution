/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { appendBuildIdIfChanged } from '../appendBuildIdIfChanged';

describe('appendBuildIdIfChanged', () => {
    it('should append a new build id with timestamp', () => {
        expect(appendBuildIdIfChanged([], 'abc123', 1632929461)).toEqual([
            { buildId: 'abc123', startTimestamp: 1632929461 }
        ]);
    });

    it('should return undefined when the build id did not change', () => {
        expect(
            appendBuildIdIfChanged([{ buildId: 'abc123', startTimestamp: 1632929461 }], 'abc123', 1632930461)
        ).toBeUndefined();
    });

    it('should append when the build id changed and close the previous entry', () => {
        expect(
            appendBuildIdIfChanged([{ buildId: 'abc123', startTimestamp: 1632929461 }], 'def456', 1632930461)
        ).toEqual([
            { buildId: 'abc123', startTimestamp: 1632929461, endTimestamp: 1632930461 },
            { buildId: 'def456', startTimestamp: 1632930461 }
        ]);
    });
});
