/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useRef, useState } from 'react';
import config from 'evolution-common/lib/config/project.config';
import { withTranslation } from 'react-i18next';
import DeckGL, { DeckGLRef } from '@deck.gl/react';
import { WebMercatorViewport, MapViewState } from '@deck.gl/core';
import { TileLayer } from '@deck.gl/geo-layers';
import { IconLayer, BitmapLayer, PathLayer } from '@deck.gl/layers';
import AnimatedArrowPathExtension from './AnimatedArrowPathLayerExtension';
import * as VPAttr from 'evolution-common/lib/services/baseObjects/attributeTypes/VisitedPlaceAttributes';

export type SurveyMapPointProperties = {
    activity: VPAttr.Activity;
    active?: string;
};

export type SurveyMapTripProperties = {
    active?: string;
    color?: string;
};

export type InterviewMapProps = {
    center?: [number, number];
    updateCount?: number;
    places: GeoJSON.FeatureCollection<GeoJSON.Point, SurveyMapPointProperties>;
    trips: GeoJSON.FeatureCollection<GeoJSON.LineString, SurveyMapTripProperties>;
};

const InterviewMap: React.FunctionComponent<InterviewMapProps> = (props: InterviewMapProps) => {
    const mapContainerRef = useRef<DeckGLRef>(null);

    const [viewState, setViewState] = useState<MapViewState>({
        longitude: props.center ? props.center[0] : config.mapDefaultCenter.lon,
        latitude: props.center ? props.center[1] : config.mapDefaultCenter.lat,
        zoom: 13
    });

    const [zoom, setZoom] = useState<number>(13);

    const [hasLoaded, setHasLoaded] = useState<boolean>(false);

    const tileLayer = new TileLayer({
        id: 'TileLayer',
        data: 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
        maxZoom: 20,
        minZoom: 0,
        tileSize: 256,
        opacity: 0.5,
        renderSubLayers: (subLayerProps) => {
            const { boundingBox } = subLayerProps.tile;

            return new BitmapLayer(
                subLayerProps as any,
                {
                    data: null,
                    image: subLayerProps.data,
                    bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]]
                } as any
            );
        },
        pickable: true
    });

    const placesLayer = new IconLayer({
        id: 'places',
        data: props.places.features,
        getIcon: (d) => ({
            url: `/dist/images/activities_icons/${d.properties.activity || 'default'}_marker.svg`,
            width: 256,
            height: 256,
            anchorY: 256
        }),
        loadOptions: {
            imagebitmap: {
                resizeWidth: 256,
                resizeHeight: 256,
                resizeQuality: 'high'
            }
        },
        getPosition: (d) => d.geometry.coordinates,
        getSize: (d) => (d.active === 'true' ? 80 : 40),
        pickable: true
        //onClick: (info) => props.selectPlace(info.object.path)
    });

    const animatedArrowPathLayer = new PathLayer({
        id: 'tripCurves',
        data: props.trips.features,
        getPath: (d) => d.geometry.coordinates,
        updateTriggers: {
            getPath: props.updateCount || 1,
            getColor: props.updateCount || 1
        },
        widthMaxPixels: 20,
        pickable: true,
        filled: false,
        lineWidthScale: 1.0,
        widthUnits: 'pixels',
        capRounded: false,
        jointRounded: true,
        zoom,
        getWidth: (d) => (d.properties.active ? 16 : 12),
        getColor: (d) => {
            const hex = (d.properties.color || '#000000').replace('#', '').toLowerCase();
            // convert to RGB:
            return hex.match(/[0-9a-f]{2}/g).map((x) => parseInt(x, 16));
        },
        extensions: [new AnimatedArrowPathExtension()]
    });

    const onAfterRender = () => {
        if (!hasLoaded && placesLayer.isLoaded && props.places.features.length > 1) {
            setHasLoaded(true);

            const viewport = placesLayer.context.viewport as WebMercatorViewport;
            const { longitude, latitude, zoom } = viewport.fitBounds(
                placesLayer.getBounds() as [[number, number], [number, number]],
                { padding: { top: 50, bottom: 50, left: 50, right: 50 } }
            );
            setViewState({ longitude, latitude, zoom });
            setZoom(zoom);
        }
    };

    const layers = [tileLayer, animatedArrowPathLayer, placesLayer];

    return (
        <div className="admin__interview-map">
            <DeckGL
                ref={mapContainerRef}
                initialViewState={viewState}
                controller={true}
                _animate={true}
                layers={layers}
                onAfterRender={onAfterRender}
                onViewStateChange={(params) => {
                    setZoom((params.viewState as any).zoom);
                }}
            ></DeckGL>
        </div>
    );
};

export default withTranslation()(InterviewMap);
