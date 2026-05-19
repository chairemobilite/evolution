/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';

import type { InfoMapProps } from '../inputs/maps/types';
// TODO Once a second provider exists, replace this hardcoded import with a
// dispatcher that picks the adapter from the widget config.
import mapProviderAdapter from '../inputs/maps/google/GoogleMapAdapter';

/**
 * Renders a non-interactive map showing the points, linestrings and polygons
 * declared in an `infoMap` widget (e.g. the participant's trips map). The
 * actual rendering is delegated to a `MapProviderAdapter` so this widget
 * stays provider-agnostic; the data it consumes (`widgetConfig.geojsons`) is
 * already standard GeoJSON, ready for any provider.
 */
const InfoMap: React.FC<InfoMapProps> = (props) => <mapProviderAdapter.InfoMap {...props} />;

export default InfoMap;
