/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import * as OpenStreetMapUtils from '../../../utils/OpenStreetMapUtils';

test('should convert id with geometry type to integer id', function() {
  expect(OpenStreetMapUtils.getIdFromIdWithGeometryType(null)).toBe(null);
  expect(OpenStreetMapUtils.getIdFromIdWithGeometryType(undefined)).toBe(null);
  expect(OpenStreetMapUtils.getIdFromIdWithGeometryType(23)).toBe(23);
  expect(OpenStreetMapUtils.getIdFromIdWithGeometryType('way/12345')).toBe(12345);
  expect(OpenStreetMapUtils.getIdFromIdWithGeometryType('node/123456789')).toBe(123456789);
  expect(OpenStreetMapUtils.getIdFromIdWithGeometryType('relation/1')).toBe(1);
  expect(OpenStreetMapUtils.getIdFromIdWithGeometryType('relation/')).toBe(null);
});
