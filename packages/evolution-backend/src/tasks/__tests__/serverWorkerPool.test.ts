/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import workerpool from 'workerpool';

jest.mock('workerpool', () => ({ pool: jest.fn().mockReturnValue({ exec: jest.fn() }) }));

const poolMock = workerpool.pool as jest.MockedFunction<typeof workerpool.pool>;
const parsersModule = '/survey/lib/server/surveyObjectParsers.js';

/**
 * The pool and the registry both keep state for the whole life of a server, so
 * each test gets its own instance of them
 */
const freshModules = () => {
    let modules: {
        serverWorkerPool: typeof import('../serverWorkerPool');
        registry: typeof import('../../config/serverConfigRegistry');
    };
    jest.isolateModules(() => {
        modules = {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            serverWorkerPool: require('../serverWorkerPool'),
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            registry: require('../../config/serverConfigRegistry')
        };
    });
    return modules!;
};

describe('startPool', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // A worker cannot receive the functions of the configuration, only the path
    // of the modules holding them, which it loads itself
    test('sends the registered modules to the workers it starts', () => {
        const { serverWorkerPool, registry } = freshModules();
        registry.registerSurveyObjectParsersModule(parsersModule);

        serverWorkerPool.startPool();

        expect(poolMock).toHaveBeenCalledWith(
            expect.stringContaining('EvolutionWorkerPool.js'),
            expect.objectContaining({
                workerThreadOpts: { workerData: { serverConfigs: { surveyObjectParsers: parsersModule } } }
            })
        );
    });

    test('starts workers with an empty configuration when the survey registers nothing', () => {
        const { serverWorkerPool } = freshModules();

        serverWorkerPool.startPool();

        expect(poolMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ workerThreadOpts: { workerData: { serverConfigs: {} } } })
        );
    });
});
