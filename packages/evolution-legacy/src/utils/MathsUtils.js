/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _isFinite from 'lodash.isfinite';
import _padStart from 'lodash.padstart';

const strictOr = function(...values) {
  values = values.length === 1 && Array.isArray(values[0]) ? values[0] : [...values];
  for (let i = 0, count = values.length; i < count; i++)
  {
    if (values[i] !== null && values[i] !== undefined)
    {
      return values[i];
    }
  }
  return undefined;
};

const roundToNearestInArray = function(array, valueToRound) {
  if (!_isFinite(valueToRound))
  {
    return null;
  }

  array.sort(function(a,b) {
    return a - b;
  });

  let prevRoundedValue = null;
  let prevDifference   = null;
  for(let i = 0, count = array.length; i < count; i++)
  {
    const roundedValue = array[i];
    const difference = Math.abs(valueToRound - roundedValue);
    if (difference === 0)
    {
      return roundedValue;
    }
    if (prevDifference && difference > prevDifference)
    {
      return prevRoundedValue;
    }
    prevRoundedValue = roundedValue;
    prevDifference   = difference;
  }
  return prevRoundedValue;
};

const countsToRatios = function(countsByKey = {}) {
  if (!countsByKey)
  {
    return null;
  }
  let   totalCount = 0;
  const ratios     = {};
  for (const key in countsByKey)
  {
    totalCount += countsByKey[key];
  }
  if (totalCount === 0)
  {
    return null;
  }
  for (const key in countsByKey)
  {
    ratios[key] = countsByKey[key] / totalCount;
  }
  return ratios;
};

// multiply each element of each array by same index and return a new array. Array lengths must match
const multiplyArrays = function(arrays) {
  const newArray    = [];
  const arraysCount = arrays.length;
  for (let i = 0, count = arrays[0].length; i < count; i++)
  {
    newArray[i] = 1;
    for (let j = 0; j < arraysCount; j++)
    {
      newArray[i] *= arrays[j][i];
    }
  }
  return newArray;
};

// add each element of each array by same index and return a new array. Array lengths must match
const addArrays = function(arrays) {
  const newArray    = [];
  const arraysCount = arrays.length;
  for (let i = 0, count = arrays[0].length; i < count; i++)
  {
    newArray[i] = 0;
    for (let j = 0; j < arraysCount; j++)
    {
      newArray[i] += arrays[j][i];
    }
  }
  return newArray;
};

// multiply each element of each object by same key and return a new object. Keys must match
const multiplyObjects = function(objects) {
  const newObject    = {};
  const objectsCount = objects.length;
  for (const key in objects[0])
  {
    newObject[key] = 1;
    for (let j = 0; j < objectsCount; j++)
    {
      newObject[key] *= objects[j][key];
    }
  }
  return newObject;
};

// add each element of each object by same key and return a new object. Keys must match
const addObjects = function(objects) {
  const newObject    = {};
  const objectsCount = objects.length;
  for (const key in objects[0])
  {
    newObject[key] = 0;
    for (let j = 0; j < objectsCount; j++)
    {
      newObject[key] += objects[j][key];
    }
  }
  return newObject;
};

const toPaddedIntervalAttribute = function(value, prefix, suffix, intervals = 5, padSize = 2, max = 60, includeMax = false)
{

  if (value === null || value === undefined || value < 0)
  {
    return null;
  }

  const intervalMin       = value >= max ? max : intervals * Math.floor(value / intervals);
  const intervalMax       = intervalMin + intervals - (includeMax === true ? 0 : 1);
  const paddedIntervalMin = _padStart(intervalMin.toString(), padSize, '0');
  const paddedIntervalMax = intervalMin === max ? 'Plus' : _padStart(intervalMax.toString(), padSize, '0');
  return `${prefix === null || prefix === undefined ? '' : prefix}${paddedIntervalMin}${paddedIntervalMax}${suffix === null || suffix === undefined ? '' : suffix}`;
};

const fromPaddedIntervalAttribute = function(paddedIntervalAttribute, prefix, suffix, padSize = 2)
{

  if (paddedIntervalAttribute === null || paddedIntervalAttribute === undefined)
  {
    return null;
  }

  const startIndex = prefix !== null && prefix !== undefined && prefix.length > 0 ? prefix.length : 0;
  let   endIndex   = suffix !== null && suffix !== undefined && suffix.length > 0 ? paddedIntervalAttribute.indexOf(suffix) : paddedIntervalAttribute.length;
  if (endIndex === -1) // no suffix
  {
    endIndex = paddedIntervalAttribute.length;
  }
  const paddedIntervalMin = parseInt(paddedIntervalAttribute.slice(startIndex, startIndex + padSize));
  const paddedIntervalMax = paddedIntervalAttribute.indexOf('Plus') > 0 ? null : parseInt(paddedIntervalAttribute.slice(startIndex + padSize, endIndex));
  return [paddedIntervalMin, paddedIntervalMax];
};

export {
  strictOr,
  roundToNearestInArray,
  countsToRatios,
  toPaddedIntervalAttribute,
  fromPaddedIntervalAttribute,
  multiplyArrays,
  addArrays,
  multiplyObjects,
  addObjects
};