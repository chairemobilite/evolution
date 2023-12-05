/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import {
    lineString as turflineString,
    buffer as turfBuffer,
    bearing, destination, lineIntersect, lineSlice
} from '@turf/turf';
import _cloneDeep from 'lodash/cloneDeep';

const offset = function(lineString, offsetMeters) {
  const coordinatesCount                      = lineString.geometry.coordinates.length;
  const lineStringBuffer                      = bufferTurfFix(lineString, offsetMeters, {units: 'meters'});
  const bearingStart                          = bearing(lineString.geometry.coordinates[0], lineString.geometry.coordinates[1]);
  const bearingEnd                            = bearing(lineString.geometry.coordinates[coordinatesCount - 2], lineString.geometry.coordinates[coordinatesCount - 1]);
  const perpendicularPointStart               = destination(lineString.geometry.coordinates[0]                   , offsetMeters + 1, bearingStart + 90, {units: 'meters'});
  const perpendicularPointEnd                 = destination(lineString.geometry.coordinates[coordinatesCount - 1], offsetMeters + 1, bearingEnd   + 90, {units: 'meters'});
  const perpendicularAtStart                  = turflineString([lineString.geometry.coordinates[0]                   , perpendicularPointStart.geometry.coordinates]);
  const perpendicularAtEnd                    = turflineString([lineString.geometry.coordinates[coordinatesCount - 1], perpendicularPointEnd.geometry.coordinates  ]);
  const intersectionAtStart                   = lineIntersect(perpendicularAtStart, lineStringBuffer);
  const intersectionAtEnd                     = lineIntersect(perpendicularAtEnd  , lineStringBuffer);
  const bufferLineString                      = _cloneDeep(lineStringBuffer);
        bufferLineString.geometry.type        = 'LineString';
        bufferLineString.geometry.coordinates = bufferLineString.geometry.coordinates[0];
  const offsetLineString                      = lineSlice(intersectionAtStart.features[0], intersectionAtEnd.features[0], bufferLineString);
  return offsetLineString;
};

// for now, turf buffer version has a wrong radius, so we multiply offset by 1.36 to correct this (it is not exact, as it changes by latitude...)
const bufferTurfFix = function(geojson, radius, options = {units: 'meters'}) {
  return turfBuffer(geojson, radius * 1.36, options);
};

const merge = function(linestrings, properties = {}) {
  const mergedLineString = turflineString([], properties);
  for (let i = 0, count = linestrings.length; i < count; i++)
  {
    const linestring            = linestrings[i];
    const firstCoordinates      = linestring.geometry.coordinates[0];
    const lastMergedCoordinates = mergedLineString.geometry.coordinates[mergedLineString.geometry.coordinates.length - 1];
    const startAtIndex          = firstCoordinates[0] === lastMergedCoordinates[0] && firstCoordinates[1] === lastMergedCoordinates[1] ? 1 : 0;
    for(let j = startAtIndex, count = linestring.geometry.coordinates.length; i < count; i++)
    {
      mergedLineString.geometry.coordinates.push(linestring.geometry.coordinates[j]);
    }
  }
  return mergedLineString;
}

export default {

  bufferTurfFix,
  offset,
  merge

};