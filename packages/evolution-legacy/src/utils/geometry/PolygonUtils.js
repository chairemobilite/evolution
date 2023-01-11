/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { booleanPointInPolygon as turfPointInPolygon } from '@turf/turf';

import { smallestCircleCentroidAndRadiusMetersAround } from './GeneralUtils';

// pointGeojsonCollection must be a MapObjectGeojsonCollection and have the pointsInBirdRadiusMetersAround method
const pointsInPolygon = function(polygon, pointGeojsonCollection) {

  if (!pointGeojsonCollection || !pointGeojsonCollection.pointsInBirdRadiusMetersAround)
  {
    console.error('pointsInPolygon: pointGeojsonCollection is empty or does not have the pointsInBirdRadiusMetersAround method');
    return null;
  }

  const featuresInPolygon = [];

    // first find all features inside bounding box circle for the zone (this is for performances reasons, to reduce the amount of spatial intersections needed to calculate):
  const bboxCircleAroundPolygon = smallestCircleCentroidAndRadiusMetersAround(polygon);

  const featuresAround = pointGeojsonCollection.pointsInBirdRadiusMetersAround(bboxCircleAroundPolygon.centroid, bboxCircleAroundPolygon.radiusMeters + 10); // add 10 meters just to be safe;

  for (let i = 0, countI = featuresAround.length; i < countI; i++)
  {
    const featureAround = featuresAround[i];
    const inPolygon = turfPointInPolygon(featureAround, polygon);
    if (inPolygon)
    {
      featuresInPolygon.push(featureAround);
    }
  }

  return featuresInPolygon;

};

export {
  pointsInPolygon
}