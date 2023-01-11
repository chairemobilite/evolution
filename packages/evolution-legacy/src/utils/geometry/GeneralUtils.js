/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import {
    centerOfMass as turfCenterOfMass,
    bbox as turfBbox,
    bboxPolygon as turfBboxPolygon,
    length as turfLength,
    lineString as turfLineString
} from '@turf/turf';

// get the smallest circle that includes the bounding box of a line or polygon:
const smallestCircleCentroidAndRadiusMetersAround = function(polygonOrLineString) {

  const bboxPolygon          = turfBboxPolygon(turfBbox(polygonOrLineString));
  const bboxCentroid         = turfCenterOfMass(bboxPolygon);
  const bboxCoordinates      = bboxPolygon.geometry.coordinates[0];
  const bboxFirstSideLength  = turfLength(turfLineString([bboxCoordinates[0], bboxCoordinates[1]]), {units: 'meters'});
  const bboxSecondSideLength = turfLength(turfLineString([bboxCoordinates[1], bboxCoordinates[2]]), {units: 'meters'});
  const circleRadius         = Math.ceil(Math.max(bboxFirstSideLength, bboxSecondSideLength));

  return {
    centroid    : bboxCentroid,
    radiusMeters: circleRadius,
    bboxPolygon : bboxPolygon
  };

};

export {
  smallestCircleCentroidAndRadiusMetersAround
}