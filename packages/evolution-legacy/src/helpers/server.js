/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// NOTE: no legacy import, can be moved to evolution-backend or deleted if unused
const isObject   = require('lodash/isObject');
const isEmpty    = require('lodash/isEmpty');
import _cloneDeep from 'lodash/cloneDeep';
const fs         = require('fs');
const path       = require('path');
const padStart   = require('lodash/padStart');
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

const isBlank = function(value) {
  return (value === undefined || value === null || value.toString().length === 0 || (isObject(value) && isEmpty(value) && typeof value !== 'function'));
};

const setupFile = function(filePathRelativeToProjectDirectory) {
  const absoluteFilePath = `${directoryManager.projectDirectory}/${filePathRelativeToProjectDirectory}`;
  createDirectoryIfNotExists(absoluteFilePath.substring(0, absoluteFilePath.lastIndexOf("/")));
  return absoluteFilePath;
};

const deleteFile = function(filePathRelativeToProjectDirectory) {
  const absoluteFilePath = `${directoryManager.projectDirectory}/${filePathRelativeToProjectDirectory}`;
  if (fs.existsSync(absoluteFilePath))
  {
    fs.unlinkSync(absoluteFilePath);
  }
};

const setupCacheFile = function(cacheName) {
  const cacheDirectoryPath = `${directoryManager.cacheDirectory}/`;
  createDirectoryIfNotExists(cacheDirectoryPath + cacheName.substring(0, cacheName.lastIndexOf("/")));
  return cacheDirectoryPath + `/${cacheName}`;
};

const deleteCacheFile = function(cacheName) {
  const cacheFilePath = `${directoryManager.directoryManager.cacheDirectory}/${cacheName}`;
  if (fs.existsSync(cacheFilePath))
  {
    fs.unlinkSync(cacheFilePath);
  }
};

const createDirectoryIfNotExists = function(absoluteDirectoryPath) {
  if (!fs.existsSync(absoluteDirectoryPath))
  {
    mkDirByPathSync(absoluteDirectoryPath);
  }
};

module.exports = {
  isBlank,
  createDirectoryIfNotExists,
  setupCacheFile,
  deleteCacheFile,
  setupFile,
  deleteFile,

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
  },

  nullToMinusOne: function(value) {
    if (isBlank(value))
    {
      return -1;
    }
    return value;
  },

  boolToInt8: function(value) {
    if (value === true)
    {
      return 1;
    }
    else if (value === false)
    {
      return 0;
    }
    return -1;
  },
  
  int8ToBool: function(value) {
    if (value === 1)
    {
      return true;
    }
    else if (value === 0)
    {
      return false;
    }
    return null;
  },

  minusOneToNull: function(value) {
    if (value === -1)
    {
      return null;
    }
    return value;
  },

  emptyStringToNull: function(str) {
    if (str === '')
    {
      return null;
    }
    return str;
  },

  secondsSinceMidnightToTimeStr: function(secondsSinceMidnight, has24hours = true, withSeconds = false) {
    let   hour   = Math.floor(secondsSinceMidnight / 3600);
    const minute = Math.floor(secondsSinceMidnight % 3600 / 60);
    if (!has24hours && hour > 12)
    {
      hour = hour - 12;
    }
    else if (!has24hours && hour === 0)
    {
      hour = 12;
    }
    if (withSeconds)
    {
      const second = secondsSinceMidnight - hour * 3600 - minute * 60;
      return `${hour}:${padStart(minute, 2, "0")}:${padStart(second, 2, "0")}`;
    }
    else
    {
      return `${hour}:${padStart(minute, 2, "0")}`;
    }
  },

  timeStrToSecondsSinceMidnight: function(timeStr) {
    const splittedTime = timeStr.split(':');
    if (splittedTime.length === 3) // with seconds
    {
      return Number(splittedTime[0]) * 3600 + Number(splittedTime[1]) * 60 + Number(splittedTime[2]);
    }
    return splittedTime.length == 2 ? Number(splittedTime[0]) * 3600 + Number(splittedTime[1]) * 60 : null;
  }

};

