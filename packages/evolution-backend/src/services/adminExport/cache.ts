/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import fs from 'fs';
import path from 'path';
import _cloneDeep from 'lodash/cloneDeep';
import { directoryManager } from 'chaire-lib-backend/lib/utils/filesystem/directoryManager';

// TODO Unit test the public functions or see if we even still need these. They
// were simply converted from the original javascript code in legacy. We may now
// have other mechanisms than a cache.

const mkDirByPathSync = (targetDir: string, { isRelativeToScript = false } = {}): string => {
    const sep = path.sep;
    const initDir = path.isAbsolute(targetDir) ? sep : '';
    const baseDir = isRelativeToScript ? __dirname : '.';

    return targetDir.split(sep).reduce((parentDir, childDir) => {
        const curDir = path.resolve(baseDir, parentDir, childDir);
        try {
            fs.mkdirSync(curDir);
        } catch (err: Error | any) {
            if (err.code === 'EEXIST') {
                // curDir already exists!
                return curDir;
            }

            // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
            if (err.code === 'ENOENT') {
                // Throw the original parentDir error on curDir `ENOENT` failure.
                throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
            }

            const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
            if (!caughtErr || (caughtErr && curDir === path.resolve(targetDir))) {
                throw err; // Throw if it's just the last created dir.
            }
        }

        return curDir;
    }, initDir);
};

export const setupCacheFile = (cacheName: string): string => {
    const cacheDirectoryPath = `${directoryManager.cacheDirectory}/`;
    createDirectoryIfNotExists(cacheDirectoryPath + cacheName.substring(0, cacheName.lastIndexOf('/')));
    return cacheDirectoryPath + `/${cacheName}`;
};

const createDirectoryIfNotExists = (absoluteDirectoryPath: string): void => {
    if (!fs.existsSync(absoluteDirectoryPath)) {
        mkDirByPathSync(absoluteDirectoryPath);
    }
};

export const getCache = (cacheName: string, defaultContent: object = { updatedAt: 0 }): any => {
    const cacheFilePath = setupCacheFile(cacheName);
    let cacheContent: object | null = null;
    if (fs.existsSync(cacheFilePath)) {
        cacheContent = JSON.parse(fs.readFileSync(cacheFilePath, { encoding: 'utf8' }));
    } else {
        cacheContent = _cloneDeep(defaultContent);
    }
    return cacheContent;
};

export const setCache = (cacheName: string, cacheContent: any): { status: string } => {
    const cacheFilePath = setupCacheFile(cacheName);
    fs.writeFileSync(cacheFilePath, JSON.stringify(cacheContent), { encoding: 'utf8', flag: 'w' });
    return { status: 'success' };
};
