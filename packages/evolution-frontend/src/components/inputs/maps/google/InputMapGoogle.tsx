/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import GeoJSON from 'geojson';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { googleMapConfigNew as googleConfig } from '../../../../config/googleMaps.config';
import InputLoading from '../../InputLoading';
import { FeatureGeocodedProperties, MarkerData, InfoWindow } from '../InputMapTypes';
import { geojson, toLatLng } from './GoogleMapUtils';

const containerStyle = {
    boxSizing: 'border-box' as const,
    position: 'relative' as const,
    width: '100%',
    height: '400px',
    border: '1px solid rgba(0,0,0,0.2)'
};

export interface InputGoogleMapPointProps {
    defaultCenter: { lat: number; lon: number };
    value?: GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties>;
    defaultZoom?: number;
    maxZoom?: number;
    markers: MarkerData[];
    onValueChange: (feature: GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties> | undefined) => void;
    onMapReady?: (bbox?: [number, number, number, number]) => void;
    onBoundsChanged?: (bbox?: [number, number, number, number]) => void;
    // Change this value when map bounds should be increased to fit markers
    shouldFitBounds?: number;
    infoWindow?: InfoWindow;
    setGeocodingOptions?: (options: { [key: string]: unknown }) => void;
}

const callWithBounds = (
    bounds?: google.maps.LatLngBounds,
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

const InputMapGoogle: React.FunctionComponent<InputGoogleMapPointProps> = (props: InputGoogleMapPointProps) => {
    const { isLoaded } = useJsApiLoader({
        ...googleConfig
    });

    const [map, setMap] = React.useState<google.maps.Map | null>(null);
    const [center, setCenter] = React.useState<{ lat: number; lng: number } | google.maps.LatLng>({
        lat: props.defaultCenter.lat,
        lng: props.defaultCenter.lon
    });
    const [placesInfoWindow, setPlacesInfoWindow] = React.useState<google.maps.InfoWindow | undefined>(undefined);

    const changeValueAndPan = React.useCallback(
        (feature: GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties> | undefined) => {
            props.onValueChange(feature);
            if (feature) {
                setCenter({ lat: feature.geometry.coordinates[1], lng: feature.geometry.coordinates[0] });
                (map as google.maps.Map).panTo({
                    lat: feature.geometry.coordinates[1],
                    lng: feature.geometry.coordinates[0]
                });
            }
        },
        [map]
    );

    const onLoad = React.useCallback((map: google.maps.Map) => {
        setMap(map);
        if (props.setGeocodingOptions) props.setGeocodingOptions({ map });
        callWithBounds(map.getBounds(), props.onMapReady);
        setPlacesInfoWindow(
            new google.maps.InfoWindow({
                pixelOffset: new google.maps.Size(0, -40)
            })
        );
    }, []);

    const onUnmount = React.useCallback(() => {
        setMap(null);
        if (props.setGeocodingOptions) props.setGeocodingOptions({ map: undefined });
    }, []);

    const onPositionChange = React.useCallback(
        (e: google.maps.MapMouseEvent, triggerEvent: string) => {
            const geojsonValue = geojson(e.latLng);
            if (geojsonValue) {
                geojsonValue.properties.lastAction = triggerEvent;
                geojsonValue.properties.zoom = (map as google.maps.Map).getZoom();
            }
            changeValueAndPan(geojsonValue);
        },
        [map]
    );

    const onZoomChange = () => {
        if (!map) return;
        const currentZoom = (map as google.maps.Map).getZoom();
        if (currentZoom && props.maxZoom && props.maxZoom < currentZoom) {
            (map as google.maps.Map).setZoom(props.maxZoom);
        }
    };

    const onBoundsChanged = () => {
        if (!map) return;
        callWithBounds((map as google.maps.Map).getBounds(), props.onBoundsChanged);
    };

    React.useEffect(() => {
        if (map) {
            (map as google.maps.Map).panTo({
                lat: props.defaultCenter.lat,
                lng: props.defaultCenter.lon
            });
        }
    }, [props.defaultCenter]);

    React.useEffect(() => {
        if (map && props.markers.length >= 1) {
            const mapBounds = new google.maps.LatLngBounds();
            props.markers.forEach((marker) =>
                mapBounds.extend({
                    lat: marker.position.geometry.coordinates[1],
                    lng: marker.position.geometry.coordinates[0]
                })
            );
            // hack for single markers: see https://stackoverflow.com/questions/3334729/google-maps-v3-fitbounds-zoom-too-close-for-single-marker
            if (mapBounds.getNorthEast().equals(mapBounds.getSouthWest())) {
                const extendPoint1 = new google.maps.LatLng(
                    mapBounds.getNorthEast().lat() + 0.001,
                    mapBounds.getNorthEast().lng() + 0.001
                );
                const extendPoint2 = new google.maps.LatLng(
                    mapBounds.getNorthEast().lat() - 0.001,
                    mapBounds.getNorthEast().lng() - 0.001
                );
                mapBounds.extend(extendPoint1);
                mapBounds.extend(extendPoint2);
            }
            map.fitBounds(mapBounds);
        }
    }, [props.shouldFitBounds]);

    React.useEffect(() => {
        if (!placesInfoWindow) {
            return;
        }
        placesInfoWindow.close();
        if (props.infoWindow) {
            placesInfoWindow.setContent(props.infoWindow.content);
            placesInfoWindow.setPosition({
                lat: props.infoWindow.position.geometry.coordinates[1],
                lng: props.infoWindow.position.geometry.coordinates[0]
            });
            placesInfoWindow.open(map);
        }
    }, [props.infoWindow]);

    return isLoaded ? (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={props.defaultZoom || 10}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onClick={(e) => onPositionChange(e, 'mapClicked')}
            onZoomChanged={onZoomChange}
            onBoundsChanged={onBoundsChanged}
        >
            {props.markers.map((markerData, index) => (
                <Marker
                    key={`marker${index}${markerData.position.geometry.coordinates[0]}_${markerData.position.geometry.coordinates[1]}`}
                    position={toLatLng(markerData.position)}
                    onDragEnd={markerData.draggable ? (e) => onPositionChange(e, 'markerDragged') : undefined}
                    draggable={markerData.draggable}
                    icon={{
                        url: markerData.icon.url,
                        size: new google.maps.Size(markerData.icon.size[0], markerData.icon.size[1]),
                        scaledSize: new google.maps.Size(markerData.icon.size[0], markerData.icon.size[1])
                    }}
                    onClick={markerData.onClick}
                />
            ))}
        </GoogleMap>
    ) : (
        <InputLoading />
    );
};

export default InputMapGoogle;
