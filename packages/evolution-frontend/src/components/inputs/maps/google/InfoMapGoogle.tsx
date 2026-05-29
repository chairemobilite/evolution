/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useEffect, JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
    APIProvider,
    AdvancedMarker,
    Map,
    MapCameraChangedEvent,
    useApiIsLoaded,
    useMap
} from '@vis.gl/react-google-maps';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import projectConfig from 'chaire-lib-common/lib/config/shared/project.config';
import { getCurrentGoogleMapConfig, getGoogleMapId } from '../../../../config/googleMaps.config';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import InputLoading from '../../InputLoading';
import { InfoMapProps } from '../types';
import { MapPolygon, MapPolyline } from './GoogleMapOverlays';

const coordinatesToLatLng = (coordinates: number[]) => ({
    lat: coordinates[1],
    lng: coordinates[0]
});

/**
 * Render a non-draggable `<AdvancedMarker>`. Advanced markers require a Google
 * Map ID to be configured (via `GOOGLE_MAP_ID`); see the README and
 * `.env.example`.
 */
const InfoMarker: React.FC<{
    position: google.maps.LatLngLiteral;
    icon?: { url: string; size: [number, number] };
}> = ({ position, icon }) => (
    <AdvancedMarker position={position}>
        {icon && <img src={icon.url} width={icon.size[0]} height={icon.size[1]} alt="" />}
    </AdvancedMarker>
);

const InfoMapInner: React.FC<InfoMapProps> = (props) => {
    const { i18n } = useTranslation();
    const isLoaded = useApiIsLoaded();
    const map = useMap();

    // Captured once on mount. `<Map>` is rendered uncontrolled
    // (`defaultCenter`) and recentered programmatically via `map.panTo()`
    // when the parsed config center changes. Passing a controlled `center`
    // prop would re-snap the camera every render and freeze user pan.
    const initialCenter = React.useRef<{ lat: number; lng: number }>({
        lat: projectConfig.mapDefaultCenter.lat,
        lng: projectConfig.mapDefaultCenter.lon
    }).current;

    useEffect(() => {
        if (!map) return;
        const widgetDefaultCenter = surveyHelper.parse(
            props.widgetConfig.defaultCenter,
            props.interview,
            props.path,
            props.user
        );
        const defaultCenter = widgetDefaultCenter
            ? { lat: widgetDefaultCenter.lat, lng: widgetDefaultCenter.lon }
            : { lat: projectConfig.mapDefaultCenter.lat, lng: projectConfig.mapDefaultCenter.lon };
        map.panTo(defaultCenter);
    }, [map, props.widgetConfig.defaultCenter, props.interview, props.path, props.user]);

    const onZoomChange = React.useCallback(
        (e: MapCameraChangedEvent) => {
            const max = props.widgetConfig.maxZoom;
            if (max && e.detail.zoom > max && map) {
                map.setZoom(max);
            }
        },
        [map, props.widgetConfig.maxZoom]
    );

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

    // Fit bounds only when the map instance or the underlying coordinates
    // change, instead of on every render.
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
        gMarkers.push(
            <InfoMarker
                key={`gMarker_infoMap_${props.path}__${i}`}
                position={{ lat: point.geometry.coordinates[1], lng: point.geometry.coordinates[0] }}
                icon={point.properties.icon}
            />
        );
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
            <MapPolyline
                key={`gPolyline_infoMap_black_${props.path}__${i}`}
                options={{
                    path: polylineCoordinates,
                    strokeColor: '#000000',
                    strokeWeight: 7,
                    strokeOpacity: 0.4,
                    icons: [{ icon: gArrowBlack, offset: '50%' }],
                    zIndex: Math.ceil((1000.0 / Math.max(1, i)) * 1000.0) || 300
                }}
            />
        );

        gPolylines.push(
            <MapPolyline
                key={`gPolyline_infoMap_white_${props.path}__${i}`}
                options={{
                    path: polylineCoordinates,
                    strokeColor: '#ffffff',
                    strokeWeight: 5,
                    strokeOpacity: 0.8,
                    icons: [{ icon: gArrowWhite, offset: '50%' }],
                    zIndex: Math.ceil((1000.0 / Math.max(1, i)) * 1000.0) || 400
                }}
            />
        );

        gPolylines.push(
            <MapPolyline
                key={`gPolyline_infoMap_${props.path}__${i}`}
                options={{
                    path: polylineCoordinates,
                    strokeColor:
                        linestring.properties && linestring.properties.active ? linestringActiveColor : linestringColor,
                    strokeWeight: 3,
                    strokeOpacity: 0.4,
                    icons: [{ icon: gArrow, offset: '50%' }],
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
                <MapPolygon
                    key={`gPolygon_infoMap_${props.path}__${i}`}
                    options={{
                        paths: polygonCoordinates,
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
                    <MapPolygon
                        key={`gPolygon_infoMap_${props.path}__${i}_${polyIndex}`}
                        options={{
                            paths: polygonCoordinates,
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

    const mapId = getGoogleMapId();

    return (
        <div className="survey-info-map__map-container">
            <div className="infoMap-title">
                <Markdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]}>{title}</Markdown>
            </div>
            <Map
                style={{
                    boxSizing: 'border-box' as const,
                    position: 'relative' as const,
                    width: '100%',
                    height: props.widgetConfig.height || '400px',
                    border: '1px solid rgba(0,0,0,0.2)'
                }}
                defaultCenter={initialCenter}
                defaultZoom={props.widgetConfig.defaultZoom || 10}
                mapId={mapId}
                clickableIcons={false}
                onZoomChanged={onZoomChange}
            >
                {gMarkers}
                {gPolylines}
                {gPolygons}
            </Map>
        </div>
    );
};

const InfoMap: React.FC<InfoMapProps> = (props) => {
    const { i18n } = useTranslation();
    // Set the google map config once, as it cannot be changed after it is
    // loaded (for language change for example). see
    // https://stackoverflow.com/questions/7065420/how-can-i-change-the-language-of-google-maps-on-the-run
    const config = React.useMemo(() => getCurrentGoogleMapConfig(i18n.language), []);

    return (
        <APIProvider
            apiKey={config.apiKey}
            libraries={config.libraries}
            language={config.language}
            region={config.region}
        >
            <InfoMapInner {...props} />
        </APIProvider>
    );
};

export default InfoMap;
