/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Lightweight React wrappers around `google.maps.Polyline` and
 * `google.maps.Polygon`, mounted onto the current `<Map>` via `useMap()`.
 *
 * `@vis.gl/react-google-maps` does not ship Polyline/Polygon components, so we
 * recreate the small subset used by the survey widgets imperatively. The
 * underlying overlay is created once per map instance and disposed on unmount;
 * options are pushed via `setOptions` whenever the prop changes.
 */

import React from 'react';
import { useMap } from '@vis.gl/react-google-maps';

/**
 * Renders a `google.maps.Polyline` on the enclosing `<Map>`.
 *
 * @param props.options Polyline options forwarded to `setOptions`.
 */
export const MapPolyline: React.FC<{ options: google.maps.PolylineOptions }> = ({ options }) => {
    const map = useMap();
    const polylineRef = React.useRef<google.maps.Polyline | null>(null);

    // Use a ref so the create-effect can read the latest options on mount
    // without depending on `options` (which would re-create the overlay on
    // every option change instead of just calling setOptions).
    const optionsRef = React.useRef(options);
    optionsRef.current = options;

    React.useEffect(() => {
        if (!map) return;
        const polyline = new google.maps.Polyline({ ...optionsRef.current, map });
        polylineRef.current = polyline;
        return () => {
            polyline.setMap(null);
            polylineRef.current = null;
        };
    }, [map]);

    React.useEffect(() => {
        polylineRef.current?.setOptions(options);
    }, [options]);

    return null;
};

/**
 * Renders a `google.maps.Polygon` on the enclosing `<Map>`.
 *
 * @param props.options Polygon options forwarded to `setOptions` (including
 * `paths`).
 */
export const MapPolygon: React.FC<{ options: google.maps.PolygonOptions }> = ({ options }) => {
    const map = useMap();
    const polygonRef = React.useRef<google.maps.Polygon | null>(null);

    const optionsRef = React.useRef(options);
    optionsRef.current = options;

    React.useEffect(() => {
        if (!map) return;
        const polygon = new google.maps.Polygon({ ...optionsRef.current, map });
        polygonRef.current = polygon;
        return () => {
            polygon.setMap(null);
            polygonRef.current = null;
        };
    }, [map]);

    React.useEffect(() => {
        polygonRef.current?.setOptions(options);
    }, [options]);

    return null;
};
