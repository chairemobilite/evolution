/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import * as MathsUtils from '../../../utils/MathsUtils';

test('should round to nearest in array', function() {
  const array = [200,-234.45,340,560.34,5000,12000];
  expect(MathsUtils.roundToNearestInArray(array, 0)).toBe(200);
  expect(MathsUtils.roundToNearestInArray(array, 15000)).toBe(12000);
  expect(MathsUtils.roundToNearestInArray(array, 200)).toBe(200);
  expect(MathsUtils.roundToNearestInArray(array, 300)).toBe(340);
  expect(MathsUtils.roundToNearestInArray(array, 500)).toBe(560.34);
  expect(MathsUtils.roundToNearestInArray(array, -500)).toBe(-234.45);
  expect(MathsUtils.roundToNearestInArray(array, NaN)).toBe(null);
  expect(MathsUtils.roundToNearestInArray(array, Infinity)).toBe(null);
  expect(MathsUtils.roundToNearestInArray(array, 'test')).toBe(null);
});

test('should get toPaddedIntervalAttribute', function() {
  expect(MathsUtils.toPaddedIntervalAttribute()).toBe(null);
  expect(MathsUtils.toPaddedIntervalAttribute(null)).toBe(null);
  expect(MathsUtils.toPaddedIntervalAttribute(-2, 'foo', 'bar', 3, 2, 15)).toBe(null);
  expect(MathsUtils.toPaddedIntervalAttribute(-23.4, 'foo', 'bar', 3, 2, 15)).toBe(null);
  expect(MathsUtils.toPaddedIntervalAttribute(Infinity, 'foo', 'bar', 3, 2, 15)).toBe('foo15Plusbar');
  expect(MathsUtils.toPaddedIntervalAttribute(18, 'foo', 'bar', 3, 2, 15)).toBe('foo15Plusbar');
  expect(MathsUtils.toPaddedIntervalAttribute(18, null, null, 3, 2, 15)).toBe('15Plus');
  expect(MathsUtils.toPaddedIntervalAttribute(18, null, null, 5, 2, 20, true)).toBe('1520');
  expect(MathsUtils.toPaddedIntervalAttribute(15, 'foo', 'bar', 3, 2, 15)).toBe('foo15Plusbar');
  expect(MathsUtils.toPaddedIntervalAttribute(0, 'foo', 'bar', 3, 2, 15)).toBe('foo0002bar');
  expect(MathsUtils.toPaddedIntervalAttribute(2, 'foo', 'bar', 5, 3, 30, true)).toBe('foo000005bar');
  expect(MathsUtils.toPaddedIntervalAttribute(30, 'foo', 'bar', 5, 3, 30)).toBe('foo030Plusbar');
  expect(MathsUtils.toPaddedIntervalAttribute(30, 'foo', 'bar', 5, 3, 30, true)).toBe('foo030Plusbar');
  expect(MathsUtils.toPaddedIntervalAttribute(30.000001, 'foo', 'bar', 5, 3, 30, true)).toBe('foo030Plusbar');
});

test('should get fromPaddedIntervalAttribute', function() {
  expect(MathsUtils.fromPaddedIntervalAttribute('foo15Plusbar', 'foo', 'bar', 2)).toEqual([15,null]);
  expect(MathsUtils.fromPaddedIntervalAttribute('foo15Plus', 'foo', null, 2)).toEqual([15,null]);
  expect(MathsUtils.fromPaddedIntervalAttribute('15Plus', null, null, 2)).toEqual([15,null]);
  expect(MathsUtils.fromPaddedIntervalAttribute(null, 'foo', 'bar', 2)).toBe(null);
  expect(MathsUtils.fromPaddedIntervalAttribute('foo0002bar', 'foo', 'bar', 2)).toEqual([0,2]);
  expect(MathsUtils.fromPaddedIntervalAttribute('foo004024bar', 'foo', 'bar', 3)).toEqual([4,24]);
  expect(MathsUtils.fromPaddedIntervalAttribute('foo000005bar', 'foo', 'bar', 3)).toEqual([0,5]);
});

test('should multiply arrays elements', function() {
  const array1 = [1,2,3,4,5];
  const array2 = [0,2,4,6,8];
  const array3 = [1,2,3,4,5];

  expect(MathsUtils.multiplyArrays([array1, array2])).toEqual([0,4,12,24,40]);
  expect(MathsUtils.multiplyArrays([array1, array2, array3])).toEqual([0,8,36,96,200]);
  
});


test('should add arrays elements', function() {
  const array1 = [1,2,3,4,5];
  const array2 = [0,2,4,6,8];
  const array3 = [1,2,3,4,5];

  expect(MathsUtils.addArrays([array1, array2])).toEqual([1,4,7,10,13]);
  expect(MathsUtils.addArrays([array1, array2, array3])).toEqual([2,6,10,14,18]);
  
});

test('should multiply objects elements', function() {
  const object1 = {'a': 1, 'b': 2, 'c' : 3};
  const object2 = {'a': 0, 'b': 2, 'c' : 4};
  const object3 = {'a': 1, 'b': 2, 'c' : 3};

  expect(MathsUtils.multiplyObjects([object1, object2])).toEqual({'a': 0, 'b': 4, 'c' : 12});
  expect(MathsUtils.multiplyObjects([object1, object2, object3])).toEqual({'a': 0, 'b': 8, 'c' : 36});
  
});


test('should add objects elements', function() {
  const object1 = {'a': 1, 'b': 2, 'c' : 3};
  const object2 = {'a': 0, 'b': 2, 'c' : 4};
  const object3 = {'a': 1, 'b': 2, 'c' : 3};

  expect(MathsUtils.addObjects([object1, object2])).toEqual({'a': 1, 'b': 4, 'c' : 7});
  expect(MathsUtils.addObjects([object1, object2, object3])).toEqual({'a': 2, 'b': 6, 'c' : 10});
  
});
