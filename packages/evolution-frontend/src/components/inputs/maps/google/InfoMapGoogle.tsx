/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useEffect, JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleMap, useJsApiLoader, Marker, Polyline, Polygon, MarkerProps } from '@react-google-maps/api';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import projectConfig from 'chaire-lib-common/lib/config/shared/project.config';
import { getCurrentGoogleMapConfig } from '../../../../config/googleMaps.config';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import InputLoading from '../../InputLoading';
import { InfoMapProps } from '../types';

const coordinatesToLatLng = (coordinates: number[]) => ({
    lat: coordinates[1],
    lng: coordinates[0]
});

const InfoMap: React.FC<InfoMapProps> = (props: InfoMapProps) => {
    const { i18n } = useTranslation();
    // Set the google map config once, as it cannot be changed after it is
    // loaded (for language change for example). see
    // https://stackoverflow.com/questions/7065420/how-can-i-change-the-language-of-google-maps-on-the-run
    const googleMapConfig = React.useMemo(() => getCurrentGoogleMapConfig(i18n.language), []);
    const { isLoaded } = useJsApiLoader(googleMapConfig);

    const [map, setMap] = React.useState<google.maps.Map | null>(null);
    const [center, setCenter] = React.useState<{ lat: number; lng: number } | google.maps.LatLng>({
        lat: projectConfig.mapDefaultCenter.lat,
        lng: projectConfig.mapDefaultCenter.lon
    });
    // Keep latest center accessible from onMapReady without re-creating the
    // callback every render (GoogleMap's onLoad fires once on mount).
    const latestCenterRef = React.useRef(center);
    React.useEffect(() => {
        latestCenterRef.current = center;
    }, [center]);

    useEffect(() => {
        const configDefaultCenter = surveyHelper.parse(
            props.widgetConfig.defaultCenter,
            props.interview,
            props.path,
            props.user
        );
        const defaultCenter = configDefaultCenter
            ? { lat: configDefaultCenter.lat, lng: configDefaultCenter.lon }
            : { lat: projectConfig.mapDefaultCenter.lat, lng: projectConfig.mapDefaultCenter.lon };
        setCenter(defaultCenter);
        // `defaultCenter` may be a ParsingFunction whose result depends on the
        // current interview/path/user, so we must re-run the effect when
        // those change too.
    }, [props.widgetConfig.defaultCenter, props.interview, props.path, props.user]);

    const onMapReady = React.useCallback((map: google.maps.Map) => {
        map.panTo(latestCenterRef.current);
        setMap(map);
    }, []);

    const onUnmount = React.useCallback(() => {
        setMap(null);
    }, []);

    const onZoomChange = () => {
        if (!map) return;
        const currentZoom = (map as google.maps.Map).getZoom();
        if (currentZoom && props.widgetConfig.maxZoom && props.widgetConfig.maxZoom < currentZoom) {
            (map as google.maps.Map).setZoom(props.widgetConfig.maxZoom);
        }
    };

    // Memoize geojsons and the coordinates that define the map bounds so the
    // bounds-fitting effect below only runs when the underlying data changes.
    const geojsons = React.useMemo(
        () => surveyHelper.parse(props.widgetConfig.geojsons, props.interview, props.path, props.user) || {},
        [props.widgetConfig.geojsons, props.interview, props.path, props.user]
    );

    const boundCoords = React.useMemo<{ lat: number; lng: number }[]>(() => {
        const coords: { lat: number; lng: number }[] = [];
        for (const point of geojsons.points?.features || []) {
            coords.push({ lat: point.geometry.coordinates[1], lng: point.geometry.coordinates[0] });
        }
        for (const polygon of geojsons.polygons?.features || []) {
            const { minLat, maxLat, minLong, maxLong } = polygon.properties;
            if (minLat !== undefined && maxLat !== undefined && minLong !== undefined && maxLong !== undefined) {
                coords.push({ lat: minLat, lng: minLong });
                coords.push({ lat: maxLat, lng: maxLong });
                coords.push({ lat: minLat, lng: maxLong });
                coords.push({ lat: maxLat, lng: minLong });
            }
        }
        return coords;
    }, [geojsons]);

    // Fit the map to the data bounds only when the map instance or the
    // underlying coordinates change, instead of on every render.
    useEffect(() => {
        if (!map || boundCoords.length === 0) return;
        const bounds = new google.maps.LatLngBounds();
        for (const coord of boundCoords) {
            bounds.extend(coord);
        }
        map.fitBounds(bounds);
    }, [map, boundCoords]);

    if (!props.widgetStatus.isVisible) {
        return null;
    }

    if (!isLoaded) {
        return <InputLoading />;
    }

    const title =
        surveyHelper.translateString(props.widgetConfig.title, i18n, props.interview, props.path, props.user) || '';
    const gMarkers: JSX.Element[] = [];
    const gPolylines: JSX.Element[] = [];
    const gPolygons: JSX.Element[] = [];
    const points = geojsons.points?.features || [];
    const linestrings = geojsons.linestrings?.features || [];
    const polygons = geojsons.polygons?.features || [];

    const linestringColor = props.widgetConfig.linestringColor || '#0000ff';
    const linestringActiveColor = props.widgetConfig.linestringActiveColor || '#00ff00';

    for (let i = 0, countI = points.length; i < countI; i++) {
        const point = points[i];
        const gLatLng = new google.maps.LatLng(point.geometry.coordinates[1], point.geometry.coordinates[0]);
        const markerParams: MarkerProps = {
            position: gLatLng,
            draggable: false
        };
        if (point.properties.icon) {
            markerParams.icon = {
                url: point.properties.icon.url,
                size: new google.maps.Size(point.properties.icon.size[0], point.properties.icon.size[1]),
                scaledSize: new google.maps.Size(point.properties.icon.size[0], point.properties.icon.size[1])
            };
        }
        gMarkers.push(<Marker key={`gMarker_infoMap_${props.path}__${i}`} {...markerParams} />);
    }

    for (let i = 0, countI = linestrings.length; i < countI; i++) {
        const linestring = linestrings[i];
        const polylineCoordinates = linestring.geometry.coordinates.map((coordinates: number[]) => ({
            lat: coordinates[1],
            lng: coordinates[0]
        }));

        const gArrowWhite = {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            strokeColor: '#ffffff',
            strokeOpacity: 0.8,
            strokeWeight: 5,
            scale: 2,
            fillColor: '#ffffff',
            fillOpacity: 0.8
        };

        const gArrowBlack = {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            strokeColor: '#000000',
            strokeOpacity: 0.4,
            strokeWeight: 7,
            scale: 2,
            fillColor: '#000000',
            fillOpacity: 0.4
        };

        const gArrow = {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            strokeColor:
                linestring.properties && linestring.properties.active ? linestringActiveColor : linestringColor,
            strokeOpacity: 0.6,
            strokeWeight: 3,
            scale: 2,
            fillColor: linestring.properties && linestring.properties.active ? linestringActiveColor : linestringColor,
            fillOpacity: 0.6
        };

        gPolylines.push(
            <Polyline
                key={`gPolyline_infoMap_black_${props.path}__${i}`}
                path={polylineCoordinates}
                options={{
                    strokeColor: '#000000',
                    strokeWeight: 7,
                    strokeOpacity: 0.4,
                    icons: [
                        {
                            icon: gArrowBlack,
                            offset: '50%'
                        }
                    ],
                    zIndex: Math.ceil((1000.0 / Math.max(1, i)) * 1000.0) || 300
                }}
            />
        );

        gPolylines.push(
            <Polyline
                key={`gPolyline_infoMap_white_${props.path}__${i}`}
                path={polylineCoordinates}
                options={{
                    strokeColor: '#ffffff',
                    strokeWeight: 5,
                    strokeOpacity: 0.8,
                    icons: [
                        {
                            icon: gArrowWhite,
                            offset: '50%'
                        }
                    ],
                    zIndex: Math.ceil((1000.0 / Math.max(1, i)) * 1000.0) || 400
                }}
            />
        );

        gPolylines.push(
            <Polyline
                key={`gPolyline_infoMap_${props.path}__${i}`}
                path={polylineCoordinates}
                options={{
                    strokeColor:
                        linestring.properties && linestring.properties.active ? linestringActiveColor : linestringColor,
                    strokeWeight: 3,
                    strokeOpacity: 0.4,
                    icons: [
                        {
                            icon: gArrow,
                            offset: '50%'
                        }
                    ],
                    zIndex: Math.ceil((1000.0 / Math.max(1, i)) * 1000.0) || 500
                }}
            />
        );
    }

    for (let i = 0, countI = polygons.length; i < countI; i++) {
        const polygon = polygons[i];
        if (polygon.geometry.type === 'Polygon') {
            // For Polygon: coordinates is an array of rings (outer ring + holes)
            // Map all rings: coordinates[0] is outer boundary, coordinates[1+] are holes
            const polygonCoordinates = polygon.geometry.coordinates.map((ring: number[][]) =>
                ring.map(coordinatesToLatLng)
            );

            gPolygons.push(
                <Polygon
                    key={`gPolygon_infoMap_${props.path}__${i}`}
                    paths={polygonCoordinates}
                    options={{
                        strokeColor: polygon.properties.strokeColor || '#0000FF',
                        strokeOpacity: polygon.properties.strokeOpacity || 0.8,
                        strokeWeight: polygon.properties.strokeWeight || 2,
                        fillColor: polygon.properties.fillColor || '#0000FF',
                        fillOpacity: polygon.properties.fillOpacity || 0.35
                    }}
                />
            );
        } else if (polygon.geometry.type === 'MultiPolygon') {
            // For MultiPolygon: coordinates is an array of polygons, each with their rings
            // We need to create a separate Polygon component for each polygon in the MultiPolygon
            polygon.geometry.coordinates.forEach((polyCoords: number[][][], polyIndex: number) => {
                const polygonCoordinates = polyCoords.map((ring: number[][]) => ring.map(coordinatesToLatLng));

                gPolygons.push(
                    <Polygon
                        key={`gPolygon_infoMap_${props.path}__${i}_${polyIndex}`}
                        paths={polygonCoordinates}
                        options={{
                            strokeColor: polygon.properties.strokeColor || '#0000FF',
                            strokeOpacity: polygon.properties.strokeOpacity || 0.8,
                            strokeWeight: polygon.properties.strokeWeight || 2,
                            fillColor: polygon.properties.fillColor || '#0000FF',
                            fillOpacity: polygon.properties.fillOpacity || 0.35
                        }}
                    />
                );
            });
        }
    }

    return (
        <div className="survey-info-map__map-container">
            <div className="infoMap-title">
                <Markdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]}>{title}</Markdown>
            </div>
            <GoogleMap
                id="info-map"
                mapContainerStyle={{
                    boxSizing: 'border-box',
                    position: 'relative',
                    width: '100%',
                    height: props.widgetConfig.height || '400px',
                    border: '1px solid rgba(0,0,0,0.2)'
                }}
                center={center}
                onLoad={onMapReady}
                onUnmount={onUnmount}
                onZoomChanged={onZoomChange}
                clickableIcons={false}
                zoom={props.widgetConfig.defaultZoom || 10}
            >
                {gMarkers}
                {gPolylines}
                {gPolygons}
            </GoogleMap>
        </div>
    );
};

export default InfoMap;
