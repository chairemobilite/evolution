/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import * as LE from '../../../utils/LodashExtensions';

test('should return null if blank', function() {
  expect(LE._blankToNull(1.3)).toBe(1.3);
  expect(LE._blankToNull('test')).toBe('test');
  expect(LE._blankToNull(['test'])).toEqual(['test']);
  expect(LE._blankToNull(Infinity)).toBe(Infinity);
  expect(LE._blankToNull(null)).toBe(null);
  expect(LE._blankToNull(undefined)).toBe(null);
  expect(LE._blankToNull([])).toBe(null);
  expect(LE._blankToNull({})).toBe(null);
  expect(LE._blankToNull([1,2,3])).toEqual([1,2,3]);
  expect(LE._blankToNull({a: 2})).toEqual({a: 2});
  expect(LE._blankToNull(true)).toBe(true);
  expect(LE._blankToNull(false)).toBe(false);
});

test('should convert null to -1', function() {
  expect(LE._nullToMinusOne(null)).toBe(-1);
  expect(LE._nullToMinusOne('23.23')).toBe('23.23');
  expect(LE._nullToMinusOne('a23.23')).toBe('a23.23');
  expect(LE._nullToMinusOne(23.345)).toBe(23.345);
  expect(LE._nullToMinusOne(-23.2)).toBe(-23.2);
  expect(LE._nullToMinusOne(46)).toBe(46);
  expect(LE._nullToMinusOne(-46)).toBe(-46);
  expect(LE._nullToMinusOne(undefined)).toBe(-1);
  expect(LE._nullToMinusOne(true)).toBe(true);
  expect(LE._nullToMinusOne(false)).toBe(false);
});

test('should convert -1 to null', function() {
  expect(LE._minusOneToNull(null)).toBe(null);
  expect(LE._minusOneToNull(-1)).toBe(null);
  expect(LE._minusOneToNull(23)).toBe(23);
  expect(LE._minusOneToNull(undefined)).toBe(undefined);
  expect(LE._minusOneToNull('test')).toBe('test');
});

test('should convert boolean to int8', function() {
  expect(LE._boolToInt8(null)).toBe(-1);
  expect(LE._boolToInt8('23.23')).toBe(-1);
  expect(LE._boolToInt8('a23.23')).toBe(-1);
  expect(LE._boolToInt8(23.345)).toBe(-1);
  expect(LE._boolToInt8(-23.2)).toBe(-1);
  expect(LE._boolToInt8(true)).toBe(1);
  expect(LE._boolToInt8(false)).toBe(0);
  expect(LE._boolToInt8(undefined)).toBe(-1);
});

test('should convert boolean to int8', function() {
  expect(LE._int8ToBool(null)).toBe(null);
  expect(LE._int8ToBool('23.23')).toBe(null);
  expect(LE._int8ToBool('a23.23')).toBe(null);
  expect(LE._int8ToBool(23.345)).toBe(null);
  expect(LE._int8ToBool(-23.2)).toBe(null);
  expect(LE._int8ToBool(1)).toBe(true);
  expect(LE._int8ToBool(0)).toBe(false);
  expect(LE._int8ToBool(undefined)).toBe(null);
});

test('should convert string: "none" to null', function() {
  expect(LE._noneStringToNull(null)).toBe(null);
  expect(LE._noneStringToNull(-1)).toBe(-1);
  expect(LE._noneStringToNull(23)).toBe(23);
  expect(LE._noneStringToNull('')).toBe('');
  expect(LE._noneStringToNull('none')).toBe(null);
});

test('should copy array', function() {
  const array = [{a: 32, b: 56}, {c: 2, d: 'test'}, 23, 'test'];
  expect(LE._copyArray(array)).toEqual(array);
  expect(LE._copyArray(null)).toBe(null);
});

test('should convert array to object', function() {
  const array = ['a', 'b', 'c'];
  expect(LE._arrayToObject(array, 'foo')).toEqual({
    a: 'foo',
    b: 'foo',
    c: 'foo'
  });

  const defaultValue = {
    foo: 'bar',
    foo2: 'bar2'
  };
  const object = LE._arrayToObject(array, defaultValue, false); // without default value cloning
  expect(object).toEqual({
    a: defaultValue,
    b: defaultValue,
    c: defaultValue
  });
  defaultValue.foo = 'noBar';
  expect(object.a.foo).toBe('noBar');

  const defaultValue2 = {
    foo: 'bar',
    foo2: 'bar2'
  };
  const object2 = LE._arrayToObject(array, defaultValue2, true); // with default value cloning
  expect(object2).toEqual({
    a: defaultValue2,
    b: defaultValue2,
    c: defaultValue2
  });
  defaultValue2.foo = 'noBar';
  expect(object2.a.foo).toBe('bar');

  // with except values in array
  const object3 = LE._arrayToObject(array, 0, false, ['b', 'c']); // with except values in array
  expect(object3).toEqual({
    a: 0
  });
  
});

test('should find one match in array (includesMulti)', function() {

  const inArray     = [1,2,3,4,5];
  const matchArray1 = [1,6,7,8,9];
  const matchArray2 = [6,7,8,9];
  expect(LE._includesMulti(inArray, matchArray1)).toBe(true);
  expect(LE._includesMulti(inArray, matchArray2)).toBe(false);

  const inArrayStr      = ['a','b','c'];
  const matchArray1Str  = ['b','c','d','e'];
  const matchArray2Str  = ['d','e','f'];
  expect(LE._includesMulti(inArrayStr, matchArray1Str)).toBe(true);
  expect(LE._includesMulti(inArrayStr, matchArray2Str)).toBe(false);
  expect(LE._includesMulti(inArrayStr, [])).toBe(false);

  expect(LE._includesMulti([], matchArray1Str)).toBe(false);
  expect(LE._includesMulti([], [])).toBe(false);

  expect(LE._includesMulti('foo', [])).toBe(null);
  expect(LE._includesMulti([], 'foo')).toBe(null);
  expect(LE._includesMulti('foo', 'bar')).toBe(null);
  expect(LE._includesMulti('foo')).toBe(null);
  expect(LE._includesMulti()).toBe(null);
  expect(LE._includesMulti(undefined, undefined)).toBe(null);
  expect(LE._includesMulti(null, undefined)).toBe(null);
  expect(LE._includesMulti(undefined, null)).toBe(null);
  expect(LE._includesMulti(null, null)).toBe(null);
  expect(LE._includesMulti(undefined)).toBe(null);
  expect(LE._includesMulti(null)).toBe(null);

});