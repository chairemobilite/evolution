/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    APIProvider,
    AdvancedMarker,
    Map,
    MapCameraChangedEvent,
    MapMouseEvent,
    useApiIsLoaded,
    useMap
} from '@vis.gl/react-google-maps';
import GeoJSON from 'geojson';
import bowser from 'bowser';

import { getCurrentGoogleMapConfig, getGoogleMapId } from '../../../../config/googleMaps.config';
import InputLoading from '../../InputLoading';
import { FeatureGeocodedProperties, MarkerData, InfoWindow as InfoWindowData } from '../types';
import { geojson } from './GoogleMapUtils';
import { logClientSideMessage } from '../../../../services/errorManagement/errorHandling';

export interface InputGoogleMapPointProps {
    defaultCenter: { lat: number; lon: number };
    maxGeocodingResultsBounds?: [{ lat: number; lng: number }, { lat: number; lng: number }];
    value?: GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties>;
    defaultZoom?: number;
    maxZoom?: number;
    /** Height of the map container, in any css unit (e.g. `28rem`, `550px`). */
    height?: string;
    markers: MarkerData[];
    onValueChange: (feature: GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties> | undefined) => void;
    onMapReady?: (bbox?: [number, number, number, number]) => void;
    onBoundsChanged?: (bbox?: [number, number, number, number]) => void;
    /** Increment to request the map to fit its bounds to the current markers. */
    shouldFitBounds?: number;
    infoWindow?: InfoWindowData;
    setGeocodingOptions?: (options: { [key: string]: unknown }) => void;
}

const callWithBounds = (
    bounds: google.maps.LatLngBounds | null | undefined,
    call?: (bbox?: [number, number, number, number]) => void
) => {
    if (!call) {
        return;
    }
    call(
        bounds
            ? [
                bounds.getSouthWest().lat(),
                bounds.getSouthWest().lng(),
                bounds.getNorthEast().lat(),
                bounds.getNorthEast().lng()
            ]
            : undefined
    );
};

/**
 * Renders a single `<AdvancedMarker>`. Advanced markers require a Google Map ID
 * to be configured (via `GOOGLE_MAP_ID`); see the README and `.env.example`.
 */
const MapMarker: React.FunctionComponent<{
    markerData: MarkerData;
    onDragEnd?: (e: google.maps.MapMouseEvent) => void;
}> = ({ markerData, onDragEnd }) => {
    const position = {
        lat: markerData.position.geometry.coordinates[1],
        lng: markerData.position.geometry.coordinates[0]
    };
    return (
        <AdvancedMarker
            position={position}
            draggable={markerData.draggable}
            onDragEnd={markerData.draggable ? onDragEnd : undefined}
            onClick={markerData.onClick}
        >
            <img src={markerData.icon.url} width={markerData.icon.size[0]} height={markerData.icon.size[1]} alt="" />
        </AdvancedMarker>
    );
};

const InputMapGoogleInner: React.FunctionComponent<InputGoogleMapPointProps> = (props) => {
    const isLoaded = useApiIsLoaded();
    const map = useMap();

    // Captured once. `<Map>` is rendered uncontrolled (defaultCenter), and we
    // pan programmatically via `map.panTo()` afterwards. Passing a controlled
    // `center` prop would re-snap the camera every render and freeze user pan.
    const initialCenter = React.useRef<google.maps.LatLngLiteral>({
        lat: props.defaultCenter.lat,
        lng: props.defaultCenter.lon
    }).current;
    const [placesInfoWindow, setPlacesInfoWindow] = React.useState<google.maps.InfoWindow | undefined>(undefined);

    const changeValueAndPan = React.useCallback(
        (feature: GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties> | undefined) => {
            props.onValueChange(feature);
            if (feature && map) {
                map.panTo({
                    lat: feature.geometry.coordinates[1],
                    lng: feature.geometry.coordinates[0]
                });
            }
        },
        [map, props.onValueChange]
    );

    const recordPositionChange = React.useCallback(
        (latLng: google.maps.LatLng | null | undefined, triggerEvent: string) => {
            if (!map) return;
            const geojsonValue = geojson(latLng);
            if (geojsonValue) {
                geojsonValue.properties.lastAction = triggerEvent;
                geojsonValue.properties.zoom = map.getZoom();
                geojsonValue.properties.platform = bowser.getParser(window.navigator.userAgent).getPlatformType();
            }
            changeValueAndPan(geojsonValue);
        },
        [map, changeValueAndPan]
    );

    // <Map> click: vis.gl wraps the event with `.detail.latLng` as a literal.
    const onMapClick = React.useCallback(
        (e: MapMouseEvent) => {
            const latLng = e.detail.latLng ? new google.maps.LatLng(e.detail.latLng) : null;
            recordPositionChange(latLng, 'mapClicked');
        },
        [recordPositionChange]
    );

    // <Marker>/<AdvancedMarker> drag: native google.maps.MapMouseEvent with `.latLng`.
    const onMarkerDragEnd = React.useCallback(
        (e: google.maps.MapMouseEvent) => {
            recordPositionChange(e.latLng, 'markerDragged');
        },
        [recordPositionChange]
    );

    const onZoomChange = React.useCallback(
        (e: MapCameraChangedEvent) => {
            if (props.maxZoom && e.detail.zoom > props.maxZoom && map) {
                map.setZoom(props.maxZoom);
            }
        },
        [map, props.maxZoom]
    );

    const onBoundsChanged = React.useCallback(
        (e: MapCameraChangedEvent) => {
            const sw = { lat: e.detail.bounds.south, lng: e.detail.bounds.west };
            const ne = { lat: e.detail.bounds.north, lng: e.detail.bounds.east };
            const bounds = new google.maps.LatLngBounds(sw, ne);
            callWithBounds(bounds, props.onBoundsChanged);
        },
        [props.onBoundsChanged]
    );

    // Wire up the map instance (geocoding context, infoWindow handle, onMapReady).
    React.useEffect(() => {
        if (!map) return;
        if (props.setGeocodingOptions) {
            props.setGeocodingOptions({ map });
        }
        callWithBounds(map.getBounds(), props.onMapReady);
        setPlacesInfoWindow(
            new google.maps.InfoWindow({
                pixelOffset: new google.maps.Size(0, -40)
            })
        );
        return () => {
            if (props.setGeocodingOptions) props.setGeocodingOptions({ map: undefined });
        };
    }, [map]);

    React.useEffect(() => {
        if (map) {
            map.panTo({ lat: props.defaultCenter.lat, lng: props.defaultCenter.lon });
        }
    }, [props.defaultCenter, map]);

    React.useEffect(() => {
        if (!map || !props.defaultZoom) return;
        if (map.getZoom() !== props.defaultZoom) {
            map.setZoom(props.defaultZoom);
        }
    }, [props.defaultZoom, map]);

    React.useEffect(() => {
        if (map && props.markers.length >= 1) {
            const maxMapBounds = new google.maps.LatLngBounds();
            if (props.maxGeocodingResultsBounds !== undefined) {
                maxMapBounds.extend(props.maxGeocodingResultsBounds[0]); // lower left
                maxMapBounds.extend(props.maxGeocodingResultsBounds[1]); // upper right
            }
            let atLeastOneMarkerInMaxBounds = false;
            const markerBounds = new google.maps.LatLngBounds();
            const boundsForMarkersInMaxBounds = new google.maps.LatLngBounds();
            props.markers.forEach((marker) => {
                const position = {
                    lat: marker.position.geometry.coordinates[1],
                    lng: marker.position.geometry.coordinates[0]
                };
                markerBounds.extend(position);
                if (!maxMapBounds.isEmpty() && maxMapBounds.contains(position)) {
                    atLeastOneMarkerInMaxBounds = true;
                    boundsForMarkersInMaxBounds.extend(position);
                }
            });

            const bounds = atLeastOneMarkerInMaxBounds ? boundsForMarkersInMaxBounds : markerBounds;

            // hack for single markers: see https://stackoverflow.com/questions/3334729/google-maps-v3-fitbounds-zoom-too-close-for-single-marker
            if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
                const extendPoint1 = new google.maps.LatLng(
                    bounds.getNorthEast().lat() + 0.001,
                    bounds.getNorthEast().lng() + 0.001
                );
                const extendPoint2 = new google.maps.LatLng(
                    bounds.getNorthEast().lat() - 0.001,
                    bounds.getNorthEast().lng() - 0.001
                );
                bounds.extend(extendPoint1);
                bounds.extend(extendPoint2);
            }
            map.fitBounds(bounds);
        }
    }, [props.shouldFitBounds]);

    React.useEffect(() => {
        if (!placesInfoWindow) return;
        placesInfoWindow.close();
        if (props.infoWindow && map) {
            placesInfoWindow.setContent(props.infoWindow.content);
            placesInfoWindow.setPosition({
                lat: props.infoWindow.position.geometry.coordinates[1],
                lng: props.infoWindow.position.geometry.coordinates[0]
            });
            placesInfoWindow.open(map);
        }
    }, [props.infoWindow, placesInfoWindow, map]);

    if (!isLoaded) {
        return <InputLoading />;
    }

    const mapId = getGoogleMapId();
    return (
        <Map
            style={{
                boxSizing: 'border-box' as const,
                position: 'relative' as const,
                width: '100%',
                height: props.height || '40rem',
                border: '1px solid rgba(0,0,0,0.2)'
            }}
            defaultCenter={initialCenter}
            defaultZoom={props.defaultZoom || 10}
            mapId={mapId}
            zoomControl={true}
            cameraControl={false}
            zoomControlOptions={{
                position: google.maps.ControlPosition.RIGHT_BOTTOM
            }}
            clickableIcons={false}
            onClick={onMapClick}
            onZoomChanged={onZoomChange}
            onBoundsChanged={onBoundsChanged}
        >
            {props.markers.map((markerData, index) => (
                <MapMarker
                    key={`marker${index}${markerData.position.geometry.coordinates[0]}_${markerData.position.geometry.coordinates[1]}`}
                    markerData={markerData}
                    onDragEnd={onMarkerDragEnd}
                />
            ))}
        </Map>
    );
};

const InputMapGoogle: React.FunctionComponent<InputGoogleMapPointProps> = (props) => {
    const { i18n } = useTranslation();
    // Set the google map config once, as it cannot be changed after it is
    // loaded (for language change for example). see
    // https://stackoverflow.com/questions/7065420/how-can-i-change-the-language-of-google-maps-on-the-run
    const config = React.useMemo(() => getCurrentGoogleMapConfig(i18n.language), []);

    const onLoadError = React.useCallback((error: unknown) => {
        const browserTechData = bowser.getParser(window.navigator.userAgent).parse();
        const message =
            error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
        logClientSideMessage(
            `Google Maps API could not be loaded. Browser: ${JSON.stringify(browserTechData)}, error: ${message}`
        );
    }, []);

    return (
        <APIProvider
            apiKey={config.apiKey}
            libraries={config.libraries}
            language={config.language}
            region={config.region}
            onError={onLoadError}
        >
            <InputMapGoogleInner {...props} />
        </APIProvider>
    );
};

export default InputMapGoogle;
