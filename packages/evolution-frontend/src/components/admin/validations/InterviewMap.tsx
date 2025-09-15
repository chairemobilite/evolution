/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import config from 'evolution-common/lib/config/project.config';
import { useTranslation } from 'react-i18next';
import Map, { MapRef, useControl, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { PathLayer } from '@deck.gl/layers';
import { hexToRgb } from 'evolution-common/lib/utils/ColorUtils';
import * as VPAttr from 'evolution-common/lib/services/baseObjects/attributeTypes/VisitedPlaceAttributes';
import { getActivityMarkerIcon } from 'evolution-common/lib/services/questionnaire/sections/visitedPlaces/activityIconMapping';
import AnimatedArrowPathExtension from './AnimatedArrowPathExtension';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpand } from '@fortawesome/free-solid-svg-icons/faExpand';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons/faLocationDot';

/**
 * DeckGL Overlay Control Component for Animated Trip Paths
 */
const DeckGLControl: React.FC<{
    layers: any[];
    activeTripUuid?: string;
}> = ({ layers, activeTripUuid }) => {
    const overlayRef = useRef<MapboxOverlay | null>(null);

    useControl(() => {
        overlayRef.current = new MapboxOverlay({
            interleaved: true,
            _animate: true,
            useDevicePixels: true,
            layers
        });
        return overlayRef.current;
    });

    useEffect(() => {
        if (overlayRef.current) {
            overlayRef.current.setProps({ layers });
        }
    }, [layers, activeTripUuid]);

    return null;
};

export type SurveyMapPointProperties = {
    activity: VPAttr.Activity;
    iconPath?: string;
    active: boolean;
    path?: string;
};

export type SurveyMapTripProperties = {
    active?: boolean;
    color?: string;
    personId?: string;
    personColor?: string;
    tripUuid?: string;
};

export type InterviewMapProps = {
    center?: [number, number];
    updateCount?: number;
    places: GeoJSON.FeatureCollection<GeoJSON.Point, SurveyMapPointProperties>;
    trips: GeoJSON.FeatureCollection<GeoJSON.LineString, SurveyMapTripProperties>;
    activeTripUuid?: string;
    activePlacePath?: string;
    onTripClick?: (tripUuid: string) => void;
    onPlaceClick?: (placePath: string) => void;
};

/**
 * Interview Map Component - Simplified without drag functionality
 */
const InterviewMap: React.FunctionComponent<InterviewMapProps> = (props: InterviewMapProps) => {
    const { t } = useTranslation(['admin']);
    const mapRef = useRef<MapRef>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [viewState, setViewState] = useState({
        longitude: props.center ? props.center[0] : config.mapDefaultCenter.lon,
        latitude: props.center ? props.center[1] : config.mapDefaultCenter.lat,
        zoom: 13
    });

    /**
     * Calculate icon size based on zoom level and active state
     * Range: 5px to 80px between zoom 10 and 20
     */
    const getIconSize = (active: boolean, zoom: number): number => {
        let baseSize: number;

        const minSize = 5;
        const maxSize = 120;

        const factor = (zoom - 10) / (20 - 10);

        baseSize = Math.max(Math.min(minSize + (maxSize - minSize) * factor, maxSize), minSize);

        // Active icons are 1.5x larger than inactive ones
        if (active) {
            baseSize = baseSize * 1.5;
        }

        return Math.round(baseSize);
    };

    /**
     * Track whether places layer has been created to trigger deck layer updates
     */
    const [placesLayerReady, setPlacesLayerReady] = useState(false);

    /**
     * Get trip color for deck.gl PathLayer
     */
    const getTripColor = (
        feature: GeoJSON.Feature<GeoJSON.LineString, SurveyMapTripProperties>
    ): [number, number, number, number] => {
        const personColor = feature.properties?.personColor;
        const tripColor = feature.properties?.color;
        const colorHex = personColor || tripColor || '#ff0000';
        const rgbColor = hexToRgb(colorHex);
        return rgbColor ? [rgbColor[0], rgbColor[1], rgbColor[2], 255] : [255, 0, 0, 255];
    };

    /**
     * Handle map load event
     */
    const onMapLoad = () => {
        setMapLoaded(true);
    };

    /**
     * Signal that markers are ready for deck layers and trigger fitBounds
     */
    useEffect(() => {
        if (!mapLoaded) return;

        if (!placesLayerReady) {
            setPlacesLayerReady(true);
        }
    }, [mapLoaded, placesLayerReady]);

    /**
     * Auto-fit bounds when map and places are loaded
     */
    useEffect(() => {
        if (mapLoaded && placesLayerReady && props.places.features.length > 0) {
            // Small delay to ensure markers are rendered
            setTimeout(() => {
                fitBounds();
            }, 100);
        }
    }, [mapLoaded, placesLayerReady, props.places.features.length]);

    /**
     * Create deck.gl layers for animated trip paths
     */
    const deckLayers = useMemo(() => {
        if (!props.trips.features.length || !mapLoaded || !placesLayerReady) return [];

        return [
            new PathLayer({
                id: 'trips-animated',
                data: props.trips.features,
                antialias: true,
                getPath: (feature: any) => {
                    return feature.geometry.coordinates;
                },
                getColor: (feature: GeoJSON.Feature<GeoJSON.LineString, SurveyMapTripProperties>) => {
                    return getTripColor(feature);
                },
                getWidth: (feature: GeoJSON.Feature<GeoJSON.LineString, SurveyMapTripProperties>) => {
                    return feature.properties.active === true ? 100 : 50;
                },
                widthMinPixels: 2,
                widthMaxPixels: 30,
                capRounded: true,
                jointRounded: true,
                pickable: true,
                onClick: (info: any) => {
                    if (info.object && props.onTripClick) {
                        const tripUuid = info.object.properties?.tripUuid;
                        if (tripUuid) {
                            props.onTripClick(tripUuid);
                        }
                    }
                },
                extensions: [new AnimatedArrowPathExtension()],
                updateTriggers: {
                    getPath: [props.activeTripUuid],
                    getColor: [props.activeTripUuid],
                    getWidth: [props.activeTripUuid]
                }
            })
        ];
    }, [props.trips.features, mapLoaded, placesLayerReady]);

    /**
     * Fit map bounds to show all places and trips
     */
    const fitBounds = () => {
        const map = mapRef.current?.getMap();
        if (!map) return;

        const allCoordinates: [number, number][] = [];

        // Add place coordinates
        props.places.features.forEach((feature) => {
            if (feature.geometry.coordinates) {
                allCoordinates.push(feature.geometry.coordinates as [number, number]);
            }
        });

        // Add trip coordinates
        props.trips.features.forEach((feature) => {
            feature.geometry.coordinates.forEach((coord) => {
                allCoordinates.push(coord as [number, number]);
            });
        });

        if (allCoordinates.length > 0) {
            const lngs = allCoordinates.map((coord) => coord[0]);
            const lats = allCoordinates.map((coord) => coord[1]);

            const bounds: [[number, number], [number, number]] = [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)]
            ];

            (map as any).fitBounds(bounds, { padding: 50 });
        }
    };

    return (
        <div className="admin__interview-map" style={{ height: 'calc(100vh - 120px)', width: '100%' }}>
            <Map
                canvasContextAttributes={{
                    antialias: true
                }}
                ref={mapRef}
                {...viewState}
                onMove={(evt) => setViewState(evt.viewState)}
                onLoad={onMapLoad}
                style={{ width: '100%', height: '100%' }}
                mapStyle={{
                    version: 8,
                    sources: {
                        osm: {
                            type: 'raster',
                            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                            tileSize: 256,
                            attribution: '© OpenStreetMap contributors'
                        }
                    },
                    layers: [
                        {
                            id: 'osm',
                            type: 'raster',
                            source: 'osm'
                        },
                        {
                            id: 'overlay',
                            type: 'background',
                            paint: {
                                'background-color': 'rgba(0, 0, 0, 0.3)'
                            }
                        }
                    ],
                    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf'
                }}
            >
                {/* Place markers - re-render when zoom changes */}
                {props.places.features.map((feature, index) => {
                    const coordinates = feature.geometry.coordinates as [number, number];
                    const activity = feature.properties?.activity;
                    const active = feature.properties?.active;
                    const placePath = feature.properties?.path;
                    const iconPath = getActivityMarkerIcon(activity as any);

                    if (!iconPath) return null;

                    const iconSize = getIconSize(active || false, viewState.zoom);

                    return (
                        <Marker
                            key={`place-marker-${index}-${placePath}-${viewState.zoom}`}
                            longitude={coordinates[0]}
                            latitude={coordinates[1]}
                            anchor="bottom"
                            offset={[0, 4]}
                            onClick={(e) => {
                                e.originalEvent.stopPropagation();
                                if (placePath && props.onPlaceClick) {
                                    props.onPlaceClick(placePath);
                                }
                            }}
                        >
                            <img
                                src={iconPath}
                                alt={activity}
                                style={{
                                    width: `${iconSize}px`,
                                    height: `${iconSize}px`,
                                    cursor: 'pointer',
                                    transition: 'width 0.1s ease, height 0.1s ease',
                                    filter: 'drop-shadow(1px 0px 0px white) drop-shadow(-1px 0px 0px white) drop-shadow(0px 1px 0px white) drop-shadow(0px -1px 0px white)',
                                    pointerEvents: 'none'
                                }}
                            />
                        </Marker>
                    );
                })}

                {/* DeckGL overlay for animated trip paths */}
                <DeckGLControl layers={deckLayers} activeTripUuid={props.activeTripUuid} />
            </Map>
            <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000 }}>
                <button
                    onClick={fitBounds}
                    style={{
                        padding: '10px',
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        fontSize: '30px',
                        color: '#333'
                    }}
                    title={t('FitBounds')}
                >
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <FontAwesomeIcon icon={faExpand} style={{ fontSize: '30px' }} />
                        <FontAwesomeIcon
                            icon={faLocationDot}
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                fontSize: '15px',
                                color: '#333'
                            }}
                        />
                    </div>
                </button>
            </div>
        </div>
    );
};

export default InterviewMap;
