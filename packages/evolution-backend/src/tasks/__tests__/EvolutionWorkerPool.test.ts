/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import workerpool from 'workerpool';
import { ExtendedPersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';

// Prefixed with `mock` so that the factory below may use it
const mockParsersModule = require.resolve('../../config/__tests__/fixtures/registeredServerConfig');

jest.mock('workerpool', () => ({ worker: jest.fn() }));
jest.mock('worker_threads', () => ({ workerData: { serverConfigs: { surveyObjectParsers: mockParsersModule } } }));
// The tasks themselves only need to exist here, they are not run
jest.mock('../../services/adminExport/exportAllToCsvBySurveyObject', () => ({
    exportAllToCsvBySurveyObjectTask: jest.fn()
}));
jest.mock('../../services/adminExport/exportInterviewLogs', () => ({ exportInterviewLogTask: jest.fn() }));
jest.mock('../../services/audits/BatchAuditService', () => ({ runBatchAuditsTask: jest.fn() }));

/**
 * A worker has its own instance of the project configuration, so unless it loads
 * the modules its server registered, the batch audits it runs would audit
 * responses the parsers of the survey never saw. See issue #1997.
 */
test('a worker configures itself from the modules its server sent it', async () => {
    // The worker registers its tasks only once its configuration is loaded, so
    // this resolves when it is done configuring itself
    const workerConfigured = new Promise<void>((resolve) =>
        (workerpool.worker as jest.Mock).mockImplementation(() => resolve())
    );

    let projectConfig: typeof import('../../config/projectConfig');
    jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        projectConfig = require('../../config/projectConfig');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../EvolutionWorkerPool');
    });
    await workerConfigured;

    // The parser of the fixture marks the person it receives
    const person = projectConfig!.default.surveyObjectParsers!.person!({} as ExtendedPersonAttributes, {});
    expect(person).toEqual({ _parsed: true });
});
