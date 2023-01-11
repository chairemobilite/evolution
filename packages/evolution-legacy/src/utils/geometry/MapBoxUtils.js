/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// for client only! don't use in node, mapbox gl is not node compatible

import { LngLatBounds } from 'mapbox-gl';

const getBoundsForCoordinates = function(coordinates) {
  return coordinates.reduce(function(bounds, coordinate) {
    return bounds.extend(coordinate);
  }, new LngLatBounds(coordinates[0], coordinates[0]));
};

export {
  getBoundsForCoordinates
}