/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// NOTE: no legacy import, can be moved to evolution-backend or deleted if unused
import _cloneDeep from 'lodash/cloneDeep';
const fs         = require('fs');
const path       = require('path');
const { directoryManager } = require('chaire-lib-backend/lib/utils/filesystem/directoryManager');

const mkDirByPathSync = function(targetDir, { isRelativeToScript = false } = {}) {
  const sep = path.sep;
  const initDir = path.isAbsolute(targetDir) ? sep : '';
  const baseDir = isRelativeToScript ? __dirname : '.';

  return targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(baseDir, parentDir, childDir);
    try {
      fs.mkdirSync(curDir);
    } catch (err) {
      if (err.code === 'EEXIST') { // curDir already exists!
        return curDir;
      }

      // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
      if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
        throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
      }

      const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
      if (!caughtErr || caughtErr && curDir === path.resolve(targetDir)) {
        throw err; // Throw if it's just the last created dir.
      }
    }

    return curDir;
  }, initDir);
};

const setupCacheFile = function(cacheName) {
  const cacheDirectoryPath = `${directoryManager.cacheDirectory}/`;
  createDirectoryIfNotExists(cacheDirectoryPath + cacheName.substring(0, cacheName.lastIndexOf("/")));
  return cacheDirectoryPath + `/${cacheName}`;
};

const createDirectoryIfNotExists = function(absoluteDirectoryPath) {
  if (!fs.existsSync(absoluteDirectoryPath))
  {
    mkDirByPathSync(absoluteDirectoryPath);
  }
};

module.exports = {
  setupCacheFile,
  getCache: function(cacheName, defaultContent = {updatedAt: 0}) {
    
    const cacheFilePath = setupCacheFile(cacheName);
    let   cacheContent  = null;
    if (fs.existsSync(cacheFilePath))
    {
      cacheContent = JSON.parse(fs.readFileSync(cacheFilePath, {encoding: 'utf8'}));
    }
    else
    {
      cacheContent = _cloneDeep(defaultContent);
    }
    return cacheContent;
  },
  
  setCache: function(cacheName, cacheContent) {
    const cacheFilePath = setupCacheFile(cacheName);
    fs.writeFileSync(cacheFilePath, JSON.stringify(cacheContent, {encoding: 'utf8', flag: 'w'}));
    return {status: 'success'};
  }

};

