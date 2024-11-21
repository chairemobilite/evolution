/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useEffect, useState } from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { GoogleMap, useJsApiLoader, Marker, Polyline, Polygon, MarkerProps } from '@react-google-maps/api';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import projectConfig from 'chaire-lib-common/lib/config/shared/project.config';
import { getCurrentGoogleMapConfig } from '../../config/googleMaps.config';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import InputLoading from '../inputs/InputLoading';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { WidgetStatus } from 'evolution-common/lib/services/questionnaire/types';
import { InfoMapWidgetConfig } from 'evolution-common/lib/services/questionnaire/types';

// TODO This is a google info map. Either it remains google and we should see if
// we can extract common code with the InputMapGoogle widget, or transform to
// use other map engine with OpenStreetMap instead.

type InfoMapProps = {
    widgetConfig: InfoMapWidgetConfig;
    widgetStatus: WidgetStatus;
    interview: UserInterviewAttributes;
    user?: CliUser;
    path: string;
};

const InfoMap: React.FC<InfoMapProps & WithTranslation> = (props: InfoMapProps & WithTranslation) => {
    // Set the google map config once, as it cannot be changed after it is
    // loaded (for language change for example). see
    // https://stackoverflow.com/questions/7065420/how-can-i-change-the-language-of-google-maps-on-the-run
    const googleMapConfig = React.useMemo(() => getCurrentGoogleMapConfig(props.i18n.language), []);
    const { isLoaded } = useJsApiLoader(googleMapConfig);

    const [map, setMap] = React.useState<google.maps.Map | null>(null);
    const [center, setCenter] = React.useState<{ lat: number; lng: number } | google.maps.LatLng>({
        lat: projectConfig.mapDefaultCenter.lat,
        lng: projectConfig.mapDefaultCenter.lon
    });

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
    }, [props.widgetConfig.defaultCenter]);

    const onMapReady = React.useCallback((map: google.maps.Map) => {
        map.panTo(center);
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

    if (!props.widgetStatus.isVisible) {
        return null;
    }

    if (!isLoaded) {
        return <InputLoading />;
    }

    const title =
        surveyHelper.translateString(props.widgetConfig.title, props.i18n, props.interview, props.path, props.user) ||
        '';
    const geojsons = props.widgetConfig.geojsons(props.interview, props.path, undefined);
    const gMarkers: JSX.Element[] = [];
    const gPolylines: JSX.Element[] = [];
    const gPolygons: JSX.Element[] = [];
    const points = geojsons.points?.features || [];
    const linestrings = geojsons.linestrings?.features || [];
    const polygons = geojsons.polygons?.features || [];

    const linestringColor = props.widgetConfig.linestringColor || '#0000ff';
    const linestringActiveColor = props.widgetConfig.linestringActiveColor || '#00ff00';

    const bounds = new google.maps.LatLngBounds();

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
        if (bounds) {
            bounds.extend({ lat: gLatLng.lat(), lng: gLatLng.lng() });
        }
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
                    zIndex: 300 || Math.ceil((1000.0 / i) * 1000.0)
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
                    zIndex: 400 || Math.ceil((1000.0 / i) * 1000.0)
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
                    zIndex: 500 || Math.ceil((1000.0 / i) * 1000.0)
                }}
            />
        );
    }

    for (let i = 0, countI = polygons.length; i < countI; i++) {
        const polygon = polygons[i];
        const polygonCoordinates = polygon.geometry.coordinates[0].map((coordinates: number[]) => ({
            lat: coordinates[1],
            lng: coordinates[0]
        }));

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
        if (
            bounds &&
            polygon.properties.minLat &&
            polygon.properties.maxLat &&
            polygon.properties.minLong &&
            polygon.properties.maxLong
        ) {
            bounds.extend({ lat: polygon.properties.minLat, lng: polygon.properties.minLong });
            bounds.extend({ lat: polygon.properties.maxLat, lng: polygon.properties.maxLong });
            bounds.extend({ lat: polygon.properties.minLat, lng: polygon.properties.maxLong });
            bounds.extend({ lat: polygon.properties.maxLat, lng: polygon.properties.minLong });
        }
    }

    if (map && bounds) {
        map.fitBounds(bounds);
    }

    return (
        <div className="survey-info-map__map-container">
            <Markdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]} className="infoMap-title">
                {title}
            </Markdown>
            <GoogleMap
                id="info-map"
                mapContainerStyle={{
                    boxSizing: 'border-box',
                    position: 'relative',
                    width: '100%',
                    height: '400px',
                    border: '1px solid rgba(0,0,0,0.2'
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

export default withTranslation()(InfoMap);
