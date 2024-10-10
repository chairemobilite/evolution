/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import workerpool, { WorkerPool } from 'workerpool';

let pool: WorkerPool | undefined = undefined;

export const startPool = () => {
    // TODO: Add a server preference for the maximum number of workers
    pool = workerpool.pool(__dirname + '/EvolutionWorkerPool.js', { maxWorkers: 1 });
};

export const execJob = async (
    ...parameters: Parameters<WorkerPool['exec']>
): Promise<ReturnType<WorkerPool['exec']>> => {
    if (pool === undefined) {
        startPool();
    }
    return pool.exec(...parameters);
};
