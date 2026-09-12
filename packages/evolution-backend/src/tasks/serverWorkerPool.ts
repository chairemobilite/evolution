/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import workerpool, { WorkerPool } from 'workerpool';
import projectConfig from '../config/projectConfig';

let pool: WorkerPool | undefined = undefined;

export const startPool = () => {
    const { serverConfigFile, surveyObjectParsers } = projectConfig;
    if (serverConfigFile === undefined && surveyObjectParsers !== undefined) {
        console.warn(
            'Worker pool: the survey configures object parsers but no serverConfigFile, so the tasks running in a worker, like the batch audits, will not use the parsers. Add `serverConfigFile: __filename` to the setProjectConfig call.'
        );
    }
    // TODO: Add a server preference for the maximum number of workers
    pool = workerpool.pool(__dirname + '/EvolutionWorkerPool.js', {
        maxWorkers: 1,
        // A worker has its own instance of the project configuration, so it is
        // told which module of the survey to require to set it up. Threads are
        // what `auto` picks on the supported node versions anyway, and are named
        // here because `workerData` reaches them only.
        workerType: 'thread',
        workerThreadOpts: { workerData: { serverConfigFile } }
    });
};

export const execJob = async (
    ...parameters: Parameters<WorkerPool['exec']>
): Promise<ReturnType<WorkerPool['exec']>> => {
    if (pool === undefined) {
        startPool();
    }
    return pool.exec(...parameters);
};
