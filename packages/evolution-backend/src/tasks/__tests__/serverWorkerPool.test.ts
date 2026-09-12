/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import workerpool from 'workerpool';

import { setProjectConfig } from '../../config/projectConfig';
import { startPool } from '../serverWorkerPool';

jest.mock('workerpool', () => ({ pool: jest.fn().mockReturnValue({ exec: jest.fn() }) }));

const poolMock = workerpool.pool as jest.MockedFunction<typeof workerpool.pool>;

describe('startPool', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // A worker gets its own project configuration, so it is told which module
    // of the survey to require to configure itself the way the server did
    test.each([
        { description: 'a survey that configures the server', serverConfigFile: '/survey/lib/admin/serverConfig.js' },
        { description: 'a survey that does not', serverConfigFile: undefined }
    ])('passes the server configuration file of $description to the workers', ({ serverConfigFile }) => {
        setProjectConfig({ serverConfigFile });
        startPool();
        expect(poolMock).toHaveBeenCalledWith(
            expect.stringContaining('EvolutionWorkerPool.js'),
            expect.objectContaining({ workerThreadOpts: { workerData: { serverConfigFile } } })
        );
    });

    test('warns about the parsers the workers would run without', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation();
        setProjectConfig({ serverConfigFile: undefined, surveyObjectParsers: { person: (attributes) => attributes } });
        startPool();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('serverConfigFile'));
        warn.mockRestore();
    });
});
