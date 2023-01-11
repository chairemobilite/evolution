/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import sharedHelper from '../../../helpers/shared/shared';


test('backward compatibility checks', () => {
  // Simply make a valid call to each function advertised by the helper, to make
  // sure they still work. These methods are individually unit tested somewhere
  // else
  const array = [1,2,3,4,5,6,7,8,9];
  expect(sharedHelper.chunkify(array, 2, true)).toEqual([[1,2,3,4,5],[6,7,8,9]]);
  sharedHelper.devLog('test');
  expect(sharedHelper.isBlank(3)).toEqual(false);
  expect(sharedHelper.getPath('foo.test', '../')).toEqual('foo');
  expect(sharedHelper.parseValue('3', 'integer')).toEqual(3);
  expect(sharedHelper.decimalHourToTimeStr(1.5)).toEqual('1:30');
  expect(sharedHelper.timeStrToDecimalHour('1:30')).toEqual(1.5);
  expect(sharedHelper.secondsSinceMidnightToTimeStr(3600)).toEqual('1:00');
  expect(sharedHelper.timeStrToSecondsSinceMidnight('1:00')).toEqual(3600);
  expect(sharedHelper.toIntegerOrNull('4')).toEqual(4);
  expect(sharedHelper.toFloatOrNull('4.4')).toEqual(4.4);
  expect(sharedHelper.emptyStringToNull('')).toEqual(null);
  
});
