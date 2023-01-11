/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const metersToMapboxPixelsAtMaxZoom = function(meters, latitude) {
  return meters / 0.075 / Math.cos(latitude * Math.PI / 180);
};

// coordinates is a point, linestring, polygon or multipolygon
// need to add tests:
const geojsonCoordinatesToXY = function(coordinates, scale = 1000000) {
  let   newCoordinates   = coordinates;
  const coordinatesCount = coordinates.length;
  for (let i = 0; i < coordinatesCount; i++)
  {
    if (Array.isArray(newCoordinates[i]) && newCoordinates[i].length === 2 && typeof newCoordinates[i][0] === 'number' && typeof newCoordinates[i][1] === 'number')
    {
      newCoordinates[i] = {X: Math.round(newCoordinates[i][0] * scale), Y: Math.round(newCoordinates[i][1] * scale)};
    }
    else
    {
      newCoordinates[i] = geojsonCoordinatesToXY(newCoordinates[i], scale);
    }
  }
  return newCoordinates;
};

const xYCoordinatesToGeojson = function(coordinates, scale = 1000000) {
  let   newCoordinates   = coordinates;
  const coordinatesCount = coordinates.length;
  for (let i = 0; i < coordinatesCount; i++)
  {
    if (!Array.isArray(newCoordinates[i]) && newCoordinates[i] && typeof newCoordinates[i].X === 'number' && typeof newCoordinates[i].Y === 'number')
    {
      newCoordinates[i] = [newCoordinates[i].X / scale, newCoordinates[i].Y / scale];
    }
    else
    {
      newCoordinates[i] = xYCoordinatesToGeojson(newCoordinates[i], scale);
    }
  }
  return newCoordinates;
}

export {
  metersToMapboxPixelsAtMaxZoom,
  geojsonCoordinatesToXY,
  xYCoordinatesToGeojson
};