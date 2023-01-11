/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import seedrandom from 'seedrandom';
import random     from 'random';

import * as RandomUtils    from '../../../utils/RandomUtils';

test('should get random from unormalized distribution', function() {

  const seed            = seedrandom('test'); // seed so we can get the same results each time
  const randomGenerator = random.clone(seed);
  const distribution    = new Map([
    [300, 231.23],
    [400, 12.4],
    [500, 51.56],
    [600, 0.34],
    [800, 0],
    [1000, 34.92],
    [1500, 132.74],
    [2000, 211.0],
    [3000, 12.3],
    [4000, 14],
    [10000, 18.45]
  ]);

  const emptyDistribution = new Map([
    [300, 0],
    [400, 0],
    [500, 0],
    [600, 0],
    [800, 0]
  ]);

  expect(RandomUtils.randomFromUnormalizedDistribution(distribution, randomGenerator.float(0.0, 1.0))).toBe(2000);
  expect(RandomUtils.randomFromUnormalizedDistribution(distribution, randomGenerator.float(0.0, 1.0))).toBe(500);
  expect(RandomUtils.randomFromUnormalizedDistribution(distribution, randomGenerator.float(0.0, 1.0))).toBe(4000);
  expect(RandomUtils.randomFromUnormalizedDistribution(distribution, randomGenerator.float(0.0, 1.0))).toBe(300);
  expect(RandomUtils.randomFromUnormalizedDistribution(distribution, randomGenerator.float(0.0, 1.0))).toBe(500);
  expect(RandomUtils.randomFromUnormalizedDistribution(distribution, randomGenerator.float(0.0, 1.0))).toBe(300);
  expect(RandomUtils.randomFromUnormalizedDistribution(distribution, randomGenerator.float(0.0, 1.0))).toBe(1500);
  expect(RandomUtils.randomFromUnormalizedDistribution(distribution, randomGenerator.float(0.0, 1.0))).toBe(300);
  expect(RandomUtils.randomFromUnormalizedDistribution(distribution, randomGenerator.float(0.0, 1.0))).toBe(2000);

  expect(() => RandomUtils.randomFromUnormalizedDistribution(emptyDistribution, randomGenerator.float(0.0, 1.0))).toThrow('Distribution sum is invalid');

});

test('should normalize distribution', function() {
  const unormalizedDistribution = {
    a: 23,
    b: 43.5,
    c: 76.5,
    d: 0
  };

  expect(RandomUtils.normalizeDistribution(unormalizedDistribution)).toEqual({
    a: 0.16083916083916083,
    b: 0.3041958041958042,
    c: 0.534965034965035,
    d: 0
  });

  const unormalizedDistribution2 = [
    23,
    43.5,
    76.5,
    0
  ];

  expect(RandomUtils.normalizeDistribution(unormalizedDistribution2)).toEqual([
    0.16083916083916083,
    0.3041958041958042,
    0.534965034965035,
    0
  ]);

  expect(RandomUtils.normalizeDistribution({a: 0, b: 0, c: 0})).toBe(null);

  // Should work also with nested distributions
  const unormalizedNestedDistribution = {
    a: { aa: 23, bb: 43.5, cc: 76.5, dd: 0 },
    b: { aa: 23, bb: 43.5, cc: 76.5, dd: 10 },
    c: { aa: 23, bb: 43.5, cc: 76.5, dd: 20 },
    d: { aa: 23, bb: 43.5, cc: 76.5, dd: 30 },
  };

  expect(RandomUtils.normalizeDistribution(unormalizedNestedDistribution)).toEqual({
    a: { aa: 0.16083916083916083, bb: 0.3041958041958042, cc: 0.534965034965035,   dd: 0 },
    b: { aa: 0.1503267973856209,  bb: 0.28431372549019607,cc: 0.5,                 dd: 0.06535947712418301 },
    c: { aa: 0.1411042944785276,  bb: 0.2668711656441718, cc: 0.46932515337423314, dd: 0.12269938650306748 },
    d: { aa: 0.1329479768786127,  bb: 0.2514450867052023, cc: 0.4421965317919075,  dd:  0.17341040462427745 },
  });

  expect(RandomUtils.normalizeDistribution({a: { aa: 0, bb: 0, cc: 0}, b: { aa: 0, bb: 0, cc: 0}})).toEqual({a: null, b: null});

  const unormalizedNestedDistribution2 = {
    a: [23, 43.5, 76.5, 0],
    b: { aa: 23, bb: 43.5, cc: 76.5, dd: 10 },
  };

  expect(RandomUtils.normalizeDistribution(unormalizedNestedDistribution2)).toEqual({
    a: [0.16083916083916083, 0.3041958041958042, 0.534965034965035, 0],
    b: { aa: 0.1503267973856209,  bb: 0.28431372549019607, cc: 0.5, dd: 0.06535947712418301 }
  });

});
