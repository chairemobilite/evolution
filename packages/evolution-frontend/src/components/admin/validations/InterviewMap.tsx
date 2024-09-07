/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { withTranslation } from 'react-i18next';
import ReactMapboxGl, { Popup, Layer, Feature, GeoJSONLayer } from 'react-mapbox-gl';
import {
    bbox as turfBbox,
    length as turfLength,
    along as turfAlong,
    bearing as turfBearing,
    lineString as turfLineString
} from '@turf/turf';

const Map = ReactMapboxGl({
    accessToken: process.env.MAPBOX_ACCESS_TOKEN as string
});

class InterviewMap extends React.Component<any, any> {
    private defaultZoomArray: any;
    private defaultCenter: any;
    private map: any;
    private ref: any;
    private resizeObserver: ResizeObserver;

    constructor(props) {
        super(props);

        this.defaultZoomArray = [props.zoom || 13];
        this.defaultCenter = props.center || [-73.6, 45.5];

        this.state = {
            dragging: false
        };
        this.map = null;
        this.ref = React.createRef();
        //this.onZoomEnd        = this.onZoomEnd.bind(this);
        //this.onDragEnd        = this.onDragEnd.bind(this);
        this.handleMapResize = this.handleMapResize.bind(this);
        this.handleResize = this.handleResize.bind(this);
        //this.handleMapClick   = this.handleMapClick.bind(this);
        this.onFeatureDragEnd = this.onFeatureDragEnd.bind(this);
        this.onFeatureDragStart = this.onFeatureDragStart.bind(this);
        this.onFeatureClick = this.onFeatureClick.bind(this);
        this.onShapeClick = this.onShapeClick.bind(this);
        this.resizeObserver = new ResizeObserver((entries) => {
            this.handleResize();
        });
    }

    onShapeClick(e) {
        this.props.selectTrip(e.feature.properties.tripUuid);
    }

    onZoomEnd(map, event) {
        return null;
    }

    onDragEnd(map, event) {
        return null;
        //const centerLatLng = event.target.getCenter();
        //console.log(event.target.getCenter());
    }

    handleMapResize(map, bounds) {
        //console.log('handleMapREsize');
        if (!this.map) {
            this.map = map;
        }
        if (bounds) {
            map.fitBounds(bounds, { padding: 50, animate: false });
        } // else: it means we have only the home coordinates, so ignore bounds
        map.resize();
    }

    handleResize() {
        //console.log('handleResize');

        if (this.map) {
            this.map.resize();
        }
    }

    componentDidMount() {
        if (this.ref.current) {
            this.resizeObserver.observe(this.ref.current);
        }
    }

    componentWillUnmount() {
        if (this.ref.current) {
            this.ref.current.removeEventListener('resize', this.handleResize);
        }
    }

    onFeatureDragStart(e) {
        if (this.props.user.isAuthorized({ Interviews: ['confirm'] })) {
            this.setState({
                dragging: true
            });
        }
    }

    onFeatureDragEnd(e, place) {
        if (this.props.user.isAuthorized({ Interviews: ['confirm'] })) {
            this.props.startUpdateInterview(
                'validation',
                {
                    [place.path]: [e.lngLat.lng, e.lngLat.lat]
                },
                null,
                null,
                () => {
                    this.setState({
                        dragging: false
                    });
                    console.log('updated coordinates for path', place.path);
                }
            );
        }
    }

    onFeatureClick(e) {
        this.props.selectPlace(e.feature.properties.path);
    }

    render() {
        const markers: any[] = [];
        const markerIcons: any[] = [];
        const modeMarkers: any[] = [];
        const modeIcons: any[] = [];
        const tripShapes: any[] = [];
        const arrowMarkers: any[] = [];
        const arrowIcons: any[] = [];
        const boundsCoordinates: any[] = [];
        const popups: JSX.Element[] = [];
        for (let i = 0, count = this.props.places.length; i < count; i++) {
            const place = this.props.places[i];
            if (place.activity) {
                const icon = new Image(40, 40);
                icon.src = `/dist/images/activities_icons/${place.activity}_marker.svg`;
                markerIcons.push([place.path, icon]);

                const marker = (
                    <Feature
                        key={place.path}
                        coordinates={place.coordinates}
                        properties={{ ...place }}
                        draggable={this.props.user.isAuthorized({ Interviews: ['confirm'] })}
                        onClick={this.onFeatureClick}
                        onDragEnd={(e) => this.onFeatureDragEnd(e, place)}
                        onDragStart={this.onFeatureDragStart}
                    />
                );
                if (place.name && this.state.dragging === false) {
                    const popup = (
                        <Popup key={place.path} coordinates={place.coordinates} anchor="bottom" offset={[0, -22]}>
                            <p>
                                {place.name} ({place.lastAction || '?'})
                            </p>
                        </Popup>
                    );
                    popups.push(popup);
                }
                boundsCoordinates.push(place.coordinates);
                markers.push(marker);
            }
        }
        const arrowIcon = new Image(10, 10);
        arrowIcon.src = '/dist/images/interface_icons/arrow-up-solid.svg';
        arrowIcons.push(['arrow', arrowIcon]);
        for (let i = 0, count = this.props.tripShapes.length; i < count; i++) {
            const trip = this.props.tripShapes[i];
            const tripShapeLength = turfLength(trip.geometry, { units: 'meters' });
            const tripShapeMiddlePoint = turfAlong(trip.geometry, tripShapeLength / 2, { units: 'meters' });
            const arrowBearing = turfBearing(
                turfAlong(trip.geometry, 0, { units: 'meters' }),
                turfAlong(trip.geometry, tripShapeLength, { units: 'meters' })
            );
            const tripShape = (
                <Feature
                    key={trip.properties.tripUuid}
                    coordinates={trip.geometry.coordinates}
                    properties={{ ...trip.properties }}
                    onClick={this.onShapeClick}
                />
            );
            tripShapes.push(tripShape);
            const arrowMarker = (
                <Feature
                    key={trip.properties.tripUuid}
                    coordinates={tripShapeMiddlePoint.geometry.coordinates}
                    properties={{ bearing: arrowBearing }}
                />
            );
            arrowMarkers.push(arrowMarker);

            for (let j = 0, countJ = trip.properties.modes.length; j < countJ; j++) {
                const mode = trip.properties.modes[j];

                if (mode) {
                    const modeIcon = new Image(25, 25);
                    modeIcon.src = `/dist/images/modes_icons/${mode}.png`;
                    modeIcons.push([trip.properties.segmentUuids[j], modeIcon]);
                    const offsetStart = -(25 * countJ) / 2;
                    const modeMarker = (
                        <Feature
                            key={trip.properties.tripUuid}
                            coordinates={tripShapeMiddlePoint.geometry.coordinates}
                            properties={{
                                uuid: trip.properties.segmentUuids[j],
                                bearing: arrowBearing,
                                offset: [25, offsetStart + 25 * j]
                            }}
                        />
                    );
                    modeMarkers.push(modeMarker);
                }
            }
        }
        let bounds: any = null;
        try {
            bounds = turfBbox(turfLineString(boundsCoordinates));
        } catch {
            bounds = null;
        }
        return (
            <div className="admin__interview-map" ref={this.ref}>
                <Map
                    style={'mapbox://styles/mapbox/streets-v9'}
                    center={
                        this.props.places && this.props.places[0] && this.props.places[0].coordinates
                            ? this.props.places[0].coordinates
                            : this.defaultCenter
                    } // use constant otherwise the center will get back to default after state changes
                    zoom={this.defaultZoomArray}
                    onDragEnd={this.onDragEnd}
                    onStyleLoad={(e) => {
                        if (bounds) {
                            this.handleMapResize(e, [
                                [bounds[0], bounds[1]],
                                [bounds[2], bounds[3]]
                            ]);
                        }
                    }}
                    // onClick          = {this.handleMapClick} // handleMapClick does not exist
                    containerStyle={{
                        height: '100%',
                        width: '100%'
                    }}
                >
                    {...popups as any}
                    {tripShapes.length > 0 && (
                        <Layer
                            id="tripShapes"
                            key="tripShapes"
                            type="line"
                            paint={{
                                'line-color': ['get', 'color'],
                                'line-width': ['match', ['get', 'active'], 'true', 10, 'false', 5, 5]
                            }}
                        >
                            {tripShapes}
                        </Layer>
                    )}
                    {arrowMarkers.length > 0 && (
                        <Layer
                            id="arrows"
                            key="arrows"
                            type="symbol"
                            layout={{
                                'icon-image': 'arrow',
                                'icon-rotate': ['get', 'bearing'],
                                'icon-allow-overlap': true,
                                'icon-offset': [0, 0],
                                'icon-size': 1.0
                            }}
                            images={arrowIcons}
                        >
                            {arrowMarkers}
                        </Layer>
                    )}
                    {modeMarkers.length > 0 && (
                        <Layer
                            id="modes"
                            key="modes"
                            type="symbol"
                            layout={{
                                'icon-image': ['get', 'uuid'],
                                'icon-allow-overlap': true,
                                'icon-offset': ['get', 'offset'],
                                'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.35, 15, 1.0]
                            }}
                            images={modeIcons}
                        >
                            {modeMarkers}
                        </Layer>
                    )}
                    {markers.length > 0 && (
                        <Layer
                            id="places"
                            key="places"
                            type="symbol"
                            layout={{
                                'icon-image': ['get', 'path'],
                                'icon-allow-overlap': true,
                                'icon-offset': [0, -20],
                                'icon-size': ['match', ['get', 'active'], 'true', 1.0, 'false', 0.7, 0.7]
                            }}
                            images={markerIcons}
                        >
                            {markers}
                        </Layer>
                    )}
                </Map>
            </div>
        );
    }
}

export default withTranslation()(InterviewMap);
