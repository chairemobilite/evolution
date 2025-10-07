/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import config from 'evolution-common/lib/config/project.config';
import { useTranslation } from 'react-i18next';
import MapLibreMap, {
    MapRef,
    useControl,
    Marker,
    SourceSpecification,
    LayerSpecification
} from 'react-map-gl/maplibre';
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
import { faRotateLeft } from '@fortawesome/free-solid-svg-icons/faRotateLeft';
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons/faLayerGroup';
import { Position } from '@deck.gl/core/dist/types/layer-props';
import { PickingInfo } from '@deck.gl/core/dist/lib/picking/pick-info';
import { LayersList } from '@deck.gl/core/dist/lib/layer-manager';

/*
    TODO: implement clustering for visited places at same location, but with distinct activities
    TODO: when all interview data will be separated in distinct classes/survey objects, we will allow multiple
    usual places, so we will have to update how they are used when selected/click on. Right now,
    the usual place path for study and work is unique, but they will not be in the future.
*/

/**
 * DeckGL Overlay Control Component for Animated Trip Paths
 */
const DeckGLControl: React.FC<{
    layers: LayersList;
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
    /** Set to true when place is selected without a click event */
    shouldZoomToPlace?: boolean;
    onTripClick?: (tripUuid: string) => void;
    onPlaceClick?: (placePath: string) => void;
    onPlaceDrag?: (placePath: string, newCoordinates: [number, number]) => void;
};

/**
 * Interview Map Component with marker drag + undo and DeckGL trip overlay
 */
const InterviewMap: React.FunctionComponent<InterviewMapProps> = (props: InterviewMapProps) => {
    const { t } = useTranslation(['admin']);
    const mapRef = useRef<MapRef>(null);
    const layerSelectRef = useRef<HTMLDivElement>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [showAerialTiles, setShowAerialTiles] = useState(false);
    const [showLayerSelect, setShowLayerSelect] = useState(false);
    const [viewState, setViewState] = useState({
        longitude: props.center ? props.center[0] : config.mapDefaultCenter.lon,
        latitude: props.center ? props.center[1] : config.mapDefaultCenter.lat,
        zoom: 13
    });

    // Drag state
    const [draggedMarker, setDraggedMarker] = useState<{
        placePath: string;
        originalCoordinates: [number, number];
        currentCoordinates: [number, number];
    } | null>(null);

    // Drag history for undo functionality
    const [dragHistory, setDragHistory] = useState<
        Array<{
            placePath: string;
            originalCoordinates: [number, number];
            newCoordinates: [number, number];
            timestamp: number;
        }>
    >([]);

    /**
     * Calculate icon size based on zoom level and active state
     * Range: 5px to 120px between zoom 10 and 20
     */
    const getIconSize = (active: boolean, zoom: number): number => {
        let baseSize: number;

        const minSize = 20;
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
     * Clear drag history when interview changes
     */
    useEffect(() => {
        setDragHistory([]);
    }, [props.updateCount]);

    /**
     * Handle clicks outside layer select to close it
     */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (layerSelectRef.current && !layerSelectRef.current.contains(event.target as Node)) {
                setShowLayerSelect(false);
            }
        };

        if (showLayerSelect) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showLayerSelect]);

    /**
     * Handle marker drag start
     */
    const onMarkerDragStart = (placePath: string, coordinates: [number, number]) => {
        // Note: We don't clear drag history here - it persists across multiple drags
        // History is only cleared when interview changes or component unmounts
        setDraggedMarker({
            placePath,
            originalCoordinates: coordinates,
            currentCoordinates: coordinates
        });
    };

    /**
     * Handle marker drag
     */
    const onMarkerDrag = (placePath: string, coordinates: [number, number]) => {
        if (draggedMarker && draggedMarker.placePath === placePath) {
            setDraggedMarker({
                ...draggedMarker,
                currentCoordinates: coordinates
            });
        }
    };

    /**
     * Handle marker drag end
     */
    const onMarkerDragEnd = (placePath: string, coordinates: [number, number]) => {
        if (draggedMarker) {
            const moved =
                draggedMarker.originalCoordinates[0] !== coordinates[0] ||
                draggedMarker.originalCoordinates[1] !== coordinates[1];

            if (moved) {
                // Add to drag history
                setDragHistory((prev) => [
                    ...prev,
                    {
                        placePath: draggedMarker.placePath,
                        originalCoordinates: draggedMarker.originalCoordinates,
                        newCoordinates: coordinates,
                        timestamp: Date.now()
                    }
                ]);
                // Call the parent's onPlaceDrag callback to update coordinates
                if (props.onPlaceDrag) {
                    props.onPlaceDrag(placePath, coordinates);
                }
            }
        }
        setDraggedMarker(null);
    };

    /**
     * Handle undo last drag operation
     */
    const onUndoLastDrag = () => {
        if (dragHistory.length > 0 && props.onPlaceDrag) {
            // Get the last drag operation
            const lastDrag = dragHistory[dragHistory.length - 1];

            // Revert to original coordinates
            props.onPlaceDrag(lastDrag.placePath, lastDrag.originalCoordinates);

            // Remove the last operation from history
            setDragHistory((prev) => prev.slice(0, -1));
        }
    };

    /**
     * Get trip color for deck.gl PathLayer
     */
    const getTripColor = (
        feature: GeoJSON.Feature<GeoJSON.LineString, SurveyMapTripProperties>
    ): [number, number, number, number] => {
        const personColor = feature.properties?.personColor;
        const tripColor = feature.properties?.color;
        const colorHex = tripColor || personColor || '#000000';
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
     * Auto-fit bounds when trip is selected
     */
    useEffect(() => {
        if (mapLoaded && props.activeTripUuid) {
            fitBoundsToActiveTrip();
        }
    }, [mapLoaded, props.activeTripUuid]);

    /**
     * Auto-zoom to place when a visited place is selected from InterviewStats
     */
    useEffect(() => {
        if (mapLoaded && props.activePlacePath && props.shouldZoomToPlace) {
            zoomToActivePlace();
        }
    }, [mapLoaded, props.activePlacePath, props.shouldZoomToPlace]);

    /**
     * Auto-fit bounds when map and places are loaded
     */
    useEffect(() => {
        if (mapLoaded && placesLayerReady && props.places.features.length > 0) {
            fitBounds();
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
                highPrecision: true,
                getPath: (feature: GeoJSON.Feature<GeoJSON.LineString, SurveyMapTripProperties>) => {
                    return feature.geometry.coordinates as Position[];
                },
                getColor: (feature: GeoJSON.Feature<GeoJSON.LineString, SurveyMapTripProperties>) => {
                    return getTripColor(feature);
                },
                getWidth: (feature: GeoJSON.Feature<GeoJSON.LineString, SurveyMapTripProperties>) => {
                    return feature.properties.active === true ? 12 : 4;
                },
                widthUnits: 'pixels',
                widthMinPixels: 4,
                widthMaxPixels: 12,
                capRounded: true,
                jointRounded: true,
                pickable: true,
                onClick: (info: PickingInfo) => {
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
     * Toggle layer select menu visibility
     */
    const toggleLayerSelect = () => {
        setShowLayerSelect((prev) => !prev);
    };

    /**
     * Handle map layer selection change
     */
    const handleLayerChange = (layerType: 'osm' | 'aerial') => {
        setShowAerialTiles(layerType === 'aerial');
        setShowLayerSelect(false);
    };

    /**
     * Generate map style with tile sources
     */
    const getMapStyle = () => {
        const sources: Record<string, SourceSpecification> = {
            osm: {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors'
            }
        };

        const layers: LayerSpecification[] = [];

        // Add aerial source if configured
        if (config.mapAerialTilesUrl) {
            sources.aerial = {
                type: 'raster',
                tiles: [config.mapAerialTilesUrl],
                tileSize: 256,
                attribution: 'Aerial imagery'
            };
        }

        // Add the appropriate base layer
        if (showAerialTiles && config.mapAerialTilesUrl) {
            layers.push({
                id: 'aerial',
                type: 'raster',
                source: 'aerial'
            });
        } else {
            layers.push({
                id: 'osm',
                type: 'raster',
                source: 'osm'
            });
        }

        return {
            version: 8 as const, // must be 8, see https://maplibre.org/maplibre-style-spec/root/#version
            sources,
            layers
        };
    };

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

            map.fitBounds(bounds, { padding: 50, animate: false, maxZoom: 17 });
        }
    };

    /**
     * Fit map bounds to show the active trip's origin and destination
     */
    const fitBoundsToActiveTrip = () => {
        const map = mapRef.current?.getMap();
        if (!map || !props.activeTripUuid) return;

        // Find the active trip
        const activeTrip = props.trips.features.find(
            (feature) => feature.properties?.tripUuid === props.activeTripUuid
        );

        if (!activeTrip || !activeTrip.geometry.coordinates.length) return;

        const coordinates = activeTrip.geometry.coordinates;

        // Get origin (first coordinate) and destination (last coordinate)
        const origin = coordinates[0] as [number, number];
        const destination = coordinates[coordinates.length - 1] as [number, number];

        // Create bounds from origin and destination
        const lngs = [origin[0], destination[0]];
        const lats = [origin[1], destination[1]];

        const bounds: [[number, number], [number, number]] = [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)]
        ];

        // Add some padding and animate to the bounds
        map.fitBounds(bounds, {
            padding: 100, // More padding for better view of origin/destination
            animate: true,
            duration: 1000, // Smooth animation
            maxZoom: 17 // Limit zoom to prevent blurry tiles
        });
    };

    /**
     * Zoom to active visited place at zoom level 16
     */
    const zoomToActivePlace = () => {
        const map = mapRef.current?.getMap();
        if (!map || !props.activePlacePath) return;

        // Find the active place
        const activePlace = props.places.features.find((feature) => feature.properties?.path === props.activePlacePath);

        if (!activePlace || !activePlace.geometry.coordinates) return;

        const coordinates = activePlace.geometry.coordinates as [number, number];

        // Smoothly animate to the place with zoom level 14
        map.flyTo({
            center: coordinates,
            zoom: 14,
            duration: 500 // 0.5 second animation
        });
    };

    const mapStyle = useMemo(getMapStyle, [showAerialTiles, config.mapAerialTilesUrl]);

    return (
        <div className="admin__interview-map" style={{ height: 'calc(100vh - 120px)', width: '100%' }}>
            <MapLibreMap
                canvasContextAttributes={{
                    antialias: true
                }}
                ref={mapRef}
                {...viewState}
                onMove={(evt) => setViewState(evt.viewState)}
                onLoad={onMapLoad}
                style={{ width: '100%', height: '100%' }}
                maxZoom={20} // Anything more than 20 is not really useful, since most aerial imageries are maxed out at zoom 20.
                mapStyle={mapStyle}
            >
                {/* Place markers - re-render when zoom changes */}
                {props.places.features.map((feature, index) => {
                    const coordinates = feature.geometry.coordinates as [number, number];
                    const activity = feature.properties?.activity;
                    const active = feature.properties?.active;
                    const placePath = feature.properties?.path;
                    const iconPath = getActivityMarkerIcon(activity as VPAttr.Activity);

                    if (!iconPath) return null;

                    const iconSize = getIconSize(active || false, viewState.zoom);

                    // Use dragged coordinates if this marker is being dragged
                    const displayCoordinates =
                        draggedMarker && draggedMarker.placePath === placePath
                            ? draggedMarker.currentCoordinates
                            : coordinates;

                    return (
                        <Marker
                            key={`place-marker-${index}-${placePath}-${viewState.zoom}`}
                            longitude={displayCoordinates[0]}
                            latitude={displayCoordinates[1]}
                            anchor="bottom"
                            offset={[0, 4]}
                            draggable={true}
                            onDragStart={() => placePath && onMarkerDragStart(placePath, coordinates)}
                            onDrag={(e) => placePath && onMarkerDrag(placePath, [e.lngLat.lng, e.lngLat.lat])}
                            onDragEnd={(e) => placePath && onMarkerDragEnd(placePath, [e.lngLat.lng, e.lngLat.lat])}
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
                                className={`admin__map-marker ${draggedMarker && draggedMarker.placePath === placePath ? 'dragging' : ''}`}
                                style={{
                                    width: `${iconSize}px`,
                                    height: `${iconSize}px`,
                                    opacity: draggedMarker && draggedMarker.placePath === placePath ? 0.7 : 1
                                }}
                            />
                        </Marker>
                    );
                })}

                {/* DeckGL overlay for animated trip paths */}
                <DeckGLControl layers={deckLayers} activeTripUuid={props.activeTripUuid} />
            </MapLibreMap>
            <div className="admin__interview-map-controls">
                {/* Custom style switcher - only show if aerial tiles are configured */}
                {config.mapAerialTilesUrl && (
                    <div ref={layerSelectRef} className="admin__map-layer-switcher">
                        {/* Layer icon button */}
                        <button
                            type="button" // disable defaut form submission (default is type=submit)
                            onClick={toggleLayerSelect}
                            className="admin__map-layer-button"
                            title={t('admin:MapLayerSelect')}
                        >
                            <FontAwesomeIcon icon={faLayerGroup} />
                        </button>

                        {/* Professional layer options - shown when button is clicked */}
                        {showLayerSelect && (
                            <div className="admin__map-layer-dropdown">
                                {/* OSM Option */}
                                <div
                                    onClick={() => handleLayerChange('osm')}
                                    className={`admin__map-layer-option ${!showAerialTiles ? 'active' : ''}`}
                                >
                                    <img
                                        src="https://raw.githubusercontent.com/muimsd/map-gl-style-switcher/refs/heads/main/public/osm.png"
                                        alt="OSM"
                                        className={`admin__map-layer-thumbnail ${!showAerialTiles ? 'active' : ''}`}
                                    />
                                    <span className={`admin__map-layer-label ${!showAerialTiles ? 'active' : ''}`}>
                                        {t('admin:MapLayerOSM')}
                                    </span>
                                </div>

                                {/* Aerial Option */}
                                <div
                                    onClick={() => handleLayerChange('aerial')}
                                    className={`admin__map-layer-option ${showAerialTiles ? 'active' : ''}`}
                                >
                                    <div
                                        className={`admin__map-layer-thumbnail admin__map-layer-aerial-thumbnail ${showAerialTiles ? 'active' : ''}`}
                                    ></div>
                                    <span className={`admin__map-layer-label ${showAerialTiles ? 'active' : ''}`}>
                                        {t('admin:MapLayerAerial')}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Undo button - visible when there are drag operations to undo */}
                {dragHistory.length > 0 && (
                    <button
                        type="button" // disable defaut form submission (default is type=submit)
                        onClick={onUndoLastDrag}
                        className="admin__map-undo-button"
                        title={t(
                            'admin:UndoDrag',
                            `Undo last drag operation (${dragHistory.length} operation${dragHistory.length !== 1 ? 's' : ''} to undo)`
                        )}
                    >
                        <FontAwesomeIcon icon={faRotateLeft} />
                        {dragHistory.length > 1 && <span className="admin__map-undo-count">{dragHistory.length}</span>}
                    </button>
                )}

                {/* Fit bounds button */}
                <button
                    type="button" // disable defaut form submission (default is type=submit)
                    onClick={fitBounds}
                    className="admin__map-fitbounds-button"
                    title={t('FitBounds')}
                >
                    <div className="admin__map-fitbounds-icon">
                        <FontAwesomeIcon icon={faExpand} className="fa-expand" />
                        <FontAwesomeIcon icon={faLocationDot} className="fa-location-dot" />
                    </div>
                </button>
            </div>
        </div>
    );
};

export default InterviewMap;
