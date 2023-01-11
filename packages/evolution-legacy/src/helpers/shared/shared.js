/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const isObject  = require('lodash.isobject');
const isEqual   = require('lodash.isequal');
const transform = require('lodash.transform');
import * as Helpers from 'evolution-common/lib/utils/helpers';
import * as LE from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as DateTimeUtils from 'chaire-lib-common/lib/utils/DateTimeUtils';

// TODO Is this used? It is only in commented code. Leaving this here.
const differences = function(object, base) {
  Helpers.devLog('YES!! The differences shared helper function is used, it should be migrated to typescript');
  return transform(object, function(result, value, key) {
    if (!isEqual(value, base[key])) {
      result[key] = (isObject(value) && isObject(base[key])) ? differences(value, base[key]) : value;
    }
  });
};

export default {
  /**
   * @deprecated Use the LodashExtension function directly
   */
  isBlank: LE._isBlank,
  /**
   * @deprecated Use the LodashExtension function directly
   */
  chunkify: LE._chunkify,
  differences,
  /**
   * @deprecated Use the evolution-common/lib/utils/helpers function directly
   */
  getPath: Helpers.getPath,
  /**
   * @deprecated Use the evolution-common/lib/utils/helpers function directly
   */
  devLog: Helpers.devLog,
  /**
   * @deprecated Use the evolution-common/lib/utils/helpers function directly
   */
  parseValue: Helpers.parseValue,

  /**
   * @deprecated Use the DateTimeUtils function directly
   */
  decimalHourToTimeStr: DateTimeUtils.decimalHourToTimeStr,

  /**
   * @deprecated Use the DateTimeUtils function directly
   */
  timeStrToDecimalHour: DateTimeUtils.timeStrToDecimalHour,

  /**
   * @deprecated Use the DateTimeUtils function directly
   */
  secondsSinceMidnightToTimeStr: DateTimeUtils.secondsSinceMidnightToTimeStr,

  /**
   * @deprecated Use the DateTimeUtils function directly
   */
  timeStrToSecondsSinceMidnight: DateTimeUtils.timeStrToSecondsSinceMidnight,

  /**
   * @deprecated Use the LodashExtension function directly
   */
  toIntegerOrNull: LE._toInteger,

  /**
   * @deprecated Use the LodashExtension function directly
   */
  toFloatOrNull: LE._toFloat,

  /**
   * @deprecated Use the LodashExtension function directly
   */
  emptyStringToNull: LE._emptyStringToNull

};