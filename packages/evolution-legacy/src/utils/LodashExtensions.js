/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

const _blankToNull = function(value) {
  return _isBlank(value) ? null : value;
};

const _nullToMinusOne = function(value) {
  if (_isBlank(value))
  {
    return -1;
  }
  return value;
};

const _minusOneToNull = function(value) {
  if (value === -1)
  {
    return null;
  }
  return value;
};

const _boolToInt8 = function(value) {
  if (value === true)
  {
    return 1;
  }
  else if (value === false)
  {
    return 0;
  }
  return -1;
};

const _int8ToBool = function(value) {
  if (value === 1)
  {
    return true;
  }
  else if (value === 0)
  {
    return false;
  }
  return null;
};

const _noneStringToNull = function(str) {
  if (str === 'none')
  {
    return null;
  }
  return str;
}

const _copyArray = function(source, array) { // from internal lodash copyArray
  if (!Array.isArray(source))
  {
    return null;
  }
  let index = -1;
  const length = source.length;
  array || (array = new Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
};

const _arrayToObject = function(array, defaultValue = 0, cloneDefaultValue = false, except = [])
{
  if (!Array.isArray(array))
  {
    return null;
  }
  const object = {};
  for (let i = 0; i < array.length; i++)
  {
    const key = array[i];
    if (!except.includes(key))
    {
      object[key] = cloneDefaultValue ? _cloneDeep(defaultValue) : defaultValue;
    }
  }
  return object;
};

const _includesMulti = function(findInArray, findWhatArray) {
  if (!Array.isArray(findInArray) || !Array.isArray(findWhatArray))
  {
    return null;
  }
  for (let i = 0, countI = findWhatArray.length; i < countI; i++)
  {
    if (findInArray.includes(findWhatArray[i]))
    {
      return true;
    }
  }
  return false;
};

export {

  _blankToNull,
  _nullToMinusOne,
  _boolToInt8,
  _int8ToBool,
  _minusOneToNull,
  _noneStringToNull,
  _copyArray,
  _arrayToObject,
  _includesMulti,
    
};
