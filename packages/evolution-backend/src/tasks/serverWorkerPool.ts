/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import workerpool, { WorkerPool } from 'workerpool';
import { getRegisteredServerConfigs } from '../config/serverConfigRegistry';

let pool: WorkerPool | undefined = undefined;

export const startPool = () => {
    // TODO: Add a server preference for the maximum number of workers
    pool = workerpool.pool(__dirname + '/EvolutionWorkerPool.js', {
        maxWorkers: 1,
        // Threads are what `auto` picks on the supported node versions anyway,
        // and are named here because `workerData` reaches them only
        workerType: 'thread',
        // A worker has its own instance of the project configuration and cannot
        // receive the functions it holds, so it is given the modules to load
        workerThreadOpts: { workerData: { serverConfigs: getRegisteredServerConfigs() } }
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
