/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// TODO: move these to chaire-lib

export type GeocodingPrecisionCategory = string; // TODO: add normalized precision levels

export const lastActionValues = ['findPlace', 'mapClicked', 'markerDragged', 'preGeocoded'];

export type LastAction = (typeof lastActionValues)[number];
