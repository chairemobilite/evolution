/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import random     from 'random';
import _cloneDeep from 'lodash/cloneDeep';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { randomFromDistribution } from 'chaire-lib-common/lib/utils/RandomUtils';


const randomFromUnormalizedDistribution = function(unormalizedDistribution, randomNumber = random.float(0.0, 1.0), minSampleSize = 0, except = []) {
  
  let distributionSum = 0;
  if (Array.isArray(unormalizedDistribution)) // Array
  {
    for (let i = 0, count = unormalizedDistribution.length; i < count; i++)
    {
      if (!except.includes(i))
      {
        distributionSum += unormalizedDistribution[i];
      }
    }
  }
  else if (typeof unormalizedDistribution.entries === 'function') // Map
  {
    for (const [key, value] of unormalizedDistribution.entries())
    {
      if (!except.includes(key))
      {
        distributionSum += value;
      }
    }
  }
  else // Object
  {
    for (const key in unormalizedDistribution)
    {
      if (!except.includes(key))
      {
        distributionSum += unormalizedDistribution[key];
      }
    }
  }

  if (distributionSum < minSampleSize)
  {
    return null;
  }
  
  return randomFromDistribution(unormalizedDistribution, randomNumber, distributionSum, except);
}

const normalizeDistribution = function(unormalizedDistribution) {
  let distributionSum = 0;
  let isNested        = false;
  if (Array.isArray(unormalizedDistribution)) // Array
  {
    const normalizedDistribution = [];
    for (let i = 0, count = unormalizedDistribution.length; i < count; i++)
    {
      if (typeof unormalizedDistribution[i] === 'object')
      {
        isNested = true;
        normalizedDistribution[i] = normalizeDistribution(_cloneDeep(unormalizedDistribution[i]));
      }
    }
    if (isNested) {
      return normalizedDistribution;
    }
    for (let i = 0, count = unormalizedDistribution.length; i < count; i++)
    {
      distributionSum += unormalizedDistribution[i];
    }
    if (distributionSum <= 0)
    {
      return null;
    }
    for (let i = 0, count = unormalizedDistribution.length; i < count; i++)
    {
      normalizedDistribution[i] = unormalizedDistribution[i] / distributionSum;
    }
    return normalizedDistribution;
  }
  else if (typeof unormalizedDistribution.entries === 'function') // Map
  {
    const normalizedDistribution = new Map();
    for (const [key, value] of unormalizedDistribution.entries())
    {
      if (typeof value === 'object')
      {
        isNested = true;
        normalizedDistribution.set(key, normalizeDistribution(_cloneDeep(value)));
      }
    }
    if (isNested) {
      return normalizedDistribution;
    }
    for (const [key, value] of unormalizedDistribution.entries())
    {
      distributionSum += value;
    }
    if (distributionSum <= 0)
    {
      return null;
    }
    for (const [key, value] of unormalizedDistribution.entries())
    {
      normalizedDistribution.set(key, value / distributionSum);
    }
    return normalizedDistribution;
  }
  else // Object
  {
    const normalizedDistribution = {};
    for (const key in unormalizedDistribution)
    {
      if (typeof unormalizedDistribution[key] === 'object')
      {
        isNested = true;
        normalizedDistribution[key] = normalizeDistribution(_cloneDeep(unormalizedDistribution[key]));
      }
    }
    if (isNested) {
      return normalizedDistribution;
    }
    for (const key in unormalizedDistribution)
    {
      distributionSum += unormalizedDistribution[key];
    }
    if (distributionSum <= 0)
    {
      return null;
    }
    for (const key in unormalizedDistribution)
    {
      normalizedDistribution[key] = unormalizedDistribution[key] / distributionSum;
    }
    return normalizedDistribution;
  }
};

const randomFloatInRange = function(range, randomGenerator = random, seed = null) {
  if (!range || !Array.isArray(range) || range.length !== 2 || isNaN(range[0]) || isNaN(range[1]) || range[1] < range[0])
  {
    return null;
  }
  if (seed)
  {
    randomGenerator = random.clone(seed);
  }
  return randomGenerator.float(range[0], range[1]);
};

export {
  randomFromUnormalizedDistribution,
  randomFloatInRange,
  normalizeDistribution
};