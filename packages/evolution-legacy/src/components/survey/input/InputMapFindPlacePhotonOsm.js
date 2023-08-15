/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
/* eslint no-undef: 0 */ // --> OFF

import React from 'react';
import {
    fitBounds,
    Map,
    Marker,
    GoogleApiWrapper,
    Polygon
} from 'google-maps-react';
import { point as turfPoint } from '@turf/turf';
import {
    withTranslation
} from 'react-i18next';
import {
    FontAwesomeIcon
} from '@fortawesome/react-fontawesome';
import {
    faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons/faMapMarkerAlt';
import _get from 'lodash.get';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons/faCheckCircle';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import InputMultiSelect from 'evolution-frontend/lib/components/inputs/InputMultiselect';
import googleConfig from 'evolution-frontend/lib/config/googleMaps.config';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import InputLoading from 'evolution-frontend/lib/components/inputs/InputLoading';

const photonOsmSearchApiUrl = process.env.PHOTON_OSM_SEARCH_API_URL;

const formatPhotonAddress = function(properties) {
    console.log('properties', properties);
    return `${properties.housenumber ? properties.housenumber + ' ' : ''}${properties.street ? properties.street + ' ' : ''}${properties.city ? properties.city + ' ' : ''}`;
}

// TODO: replace Google by Leaflet
export class InputMapFindPlacePhotonOsm extends React.Component {
    constructor(props) {
        super(props);

        // get initial map center from widget config (can be a function)
        this.defaultCenter = null;
        if (props.value) {
            const coordinates = _get(props.value, 'geometry.coordinates', null);
            if (coordinates) {
                this.defaultCenter = new props.google.maps.LatLng(coordinates[1], coordinates[0]);
            }
        } else {
            const configDefaultCenter = surveyHelper.parseString(props.widgetConfig.defaultCenter, props.interview, props.path, props.user);
            this.defaultCenter = new props.google.maps.LatLng(configDefaultCenter.lat, configDefaultCenter.lon);
        }
        this.state = {
            places: [],
            confirmedPlace: props.value ? true : false,
            selectedPlace: null,
            geocoding: false,
            geocodingFailed: false,
            geocodingQueryString: _get(props.interview.responses, `${props.path}.properties.geocodingQueryString`, null),
            //center: defaultCenter,
            //markerPosition: (props.value ? new props.google.maps.LatLng(props.value.geometry.coordinates[1], props.value.geometry.coordinates[0]) : null),
        }

        this.geocodeButtonRef = React.createRef();
        this.map = null;
        this.placesFinder = null;
        this.findPlaceFromQueryString = this.findPlaceFromQueryString.bind(this);
        this.onButtonFindPlaceClick = this.onButtonFindPlaceClick.bind(this);
        this.onConfirmPlace = this.onConfirmPlace.bind(this);
        this.onMarkerMove = this.onMarkerMove.bind(this);
        this.onMapClick = this.onMapClick.bind(this);
        this.onMapDragEnd = this.onMapDragEnd.bind(this);
        this.onMapReady = this.onMapReady.bind(this);
        this.getPlaceById = this.getPlaceById.bind(this);
        this.convertToLatLng = this.convertToLatLng.bind(this);
        this.onMenuSelect = this.onMenuSelect.bind(this);
        this.placesInfoWindow = new props.google.maps.InfoWindow({
            pixelOffset: new props.google.maps.Size(0, -40)
        });
        this.mapBounds = new props.google.maps.LatLngBounds;

    }

    getPlaceById(placeId) {
        for (let i = 0, count = this.state.places.length; i < count; i++) {
            if (placeId === this.state.places[i].id) {
                return this.state.places[i];
            }
        }
        return null;
    }

    onButtonFindPlaceClick(e) {
        if (e) {
            e.preventDefault();
        }
        this.setState({
            selectedPlace: null,
        });
        this.findPlaceFromQueryString(true);
    }

    getInfoWindowString(place) {
        const placeOsmTag = place.properties && place.properties.osm_key && place.properties.osm_value ? place.properties.osm_key + ':' + place.properties.osm_value : '';
        return `
            <div>
              <div>
                ${place && place.properties ? place.properties.name : ''}
              </div>
              <div class="_pale">${place && place.properties ? formatPhotonAddress(place.properties) : ''}${placeOsmTag ? ' [' + placeOsmTag + ']' : ''}</div>
            </div>`;
    }

    getPlaceLabel(place) {
        if (place && place.properties && place.properties.name) {
            return place.properties.name;
        } else {
            return `${place.id}`;
        }
    }

    convertToLatLng(value) {
        return value ? new this.props.google.maps.LatLng(value.geometry.coordinates[1], value.geometry.coordinates[0]) : null;
    }

    onMarkerMove(props, marker, e, geocodingQueryString = null) {
        if (this.state.confirmedPlace) {
            const geojsonValue = this.geojson(e.latLng);
            geojsonValue.properties.lastAction = "markerDragged";
            geojsonValue.properties.geocodingQueryString = geocodingQueryString;
            geojsonValue.properties.zoom = props.map.getZoom();
            this.props.onValueChange({
                target: {
                    value: geojsonValue
                }
            });
            props.map.panTo(e.latLng);
        }
    }

    onMenuSelect(e) {
        const placeId = e && e.target ? e.target.value : null;
        if (placeId) {
            const selectedPlace = this.getPlaceById(placeId);
            this.setState(function () {
                this.placesInfoWindow.close();
                this.placesInfoWindow.setContent(this.getInfoWindowString(selectedPlace));
                this.placesInfoWindow.setPosition(selectedPlace.geometry.location)
                this.placesInfoWindow.open(this.map);
                return {
                    selectedPlace
                }
            }.bind(this));
        }
    }

    onMapClick(props, map, e, geocodingQueryString = null) {
        const geojsonValue = this.geojson(e.latLng);
        geojsonValue.properties.lastAction = "mapClicked";
        geojsonValue.properties.geocodingQueryString = null;
        geojsonValue.properties.zoom = map.getZoom();
        this.setState((prevState, props) => ({
            confirmedPlace: true,
            places: []
        }));
        this.props.onValueChange({
            target: {
                value: geojsonValue
            }
        });
        map.panTo(e.latLng);

    }

    onFoundPlaces(features, geocodingQueryString = null, fitBoundsOnRefresh = true) {

        if (fitBoundsOnRefresh && this.map && features && features.length > 0) {
            this.mapBounds = new this.props.google.maps.LatLngBounds;
            for (let i = 0; i < features.length; i++) {
                const place = features[i];
                const googleLatLng = new this.props.google.maps.LatLng(place.geometry.coordinates[1], place.geometry.coordinates[0]);
                this.mapBounds.extend(googleLatLng);
                if (features.length === 1) { // auto select single result // TODO: not sure this is a good idea!
                    this.setState({
                        selectedPlace: place
                    });
                }
            }
            this.map.fitBounds(this.mapBounds);
        }

        this.setState(() => ({
            //center: latLng,
            geocodingQueryString,
            geocoding: false,
            places: features,
            confirmedPlace: false
        }));
    }

    onConfirmPlace(e) {
        if (e) {
            e.preventDefault();
        }
        if (this.state.selectedPlace) {
            if (this.placesInfoWindow) {
                this.placesInfoWindow.close();
            }
            const geojsonValue = this.state.selectedPlace;
            geojsonValue.properties.lastAction = "findPlace";
            geojsonValue.properties.geocodingQueryString = this.state.geocodingQueryString;
            this.props.onValueChange({ target: { value: geojsonValue } });
            this.setState({
                confirmedPlace: true,
                places: []
            });
            const googleLatLng = new this.props.google.maps.LatLng(this.state.selectedPlace.geometry.coordinates[1], this.state.selectedPlace.geometry.coordinates[0]);
            this.map.panTo(googleLatLng);
        }
    }

    findPlaceFromQueryString(fitBoundsOnRefresh = true) {
        if (this.map && typeof this.props.widgetConfig.geocodingQueryString === 'function') {
            const newGeocodingQueryString = this.props.widgetConfig.geocodingQueryString(this.props.interview, this.props.path);
            if (newGeocodingQueryString !== null) {
                this.setState(() => ({
                    geocoding: true
                }), function () {
                    fetch(`${photonOsmSearchApiUrl}?q=${newGeocodingQueryString}&fuzziness=${this.props.widgetConfig.fuzziness || 1}&lon=${this.map.getCenter().lng()}&lat=${this.map.getCenter().lat()}&debug=1&osm_tag=!highway&zoom=${Math.min(this.map.getZoom(), 16)}&location_bias_scale=${this.props.widgetConfig.locationBiasScale || 0.2}`)
                        .then(function (response) {
                            if (response.status === 200) {
                                response.json().then(function (jsonResponse) {
                                    if (jsonResponse && jsonResponse.features && jsonResponse.features.length > 0) {
                                        this.onFoundPlaces(jsonResponse.features, newGeocodingQueryString, fitBoundsOnRefresh);
                                    } else {
                                        surveyHelper.devLog('Find places found no place'); // TODO: error message in the ui
                                        this.setState(() => ({
                                            geocoding: false,
                                            geocodingFailed: true
                                        }));
                                    }
                                }.bind(this)).catch(function(error) {
                                    surveyHelper.devLog('Find places failed', error); // TODO: error message in the ui
                                    this.setState(() => ({
                                        geocoding: false,
                                        geocodingFailed: true
                                    }));
                                }.bind(this));
                            }
                        }.bind(this)).catch((error) => {
                            surveyHelper.devLog('Error fetching data', error); // TODO: error message in the ui
                        });
                }.bind(this));
            }
        }
    }

    onMapReady(mapProps, map) {
        if (!this.mapBounds.isEmpty()) {
            map.fitBounds(this.mapBounds);
        } else {
            map.setCenter(this.props.value ? this.convertToLatLng(this.props.value) : this.defaultCenter);
            map.setZoom(this.props.widgetConfig.defaultZoom || 14);
        }
        this.map = map;
        this.placesFinder = new this.props.google.maps.places.PlacesService(this.map);
    }

    onMapDragEnd(mapProps, map) {
        if (this.state.places && !this.state.confirmedPlace) { // if there are places, just refresh the find places to the new center
            this.findPlaceFromQueryString(false);
        }
    }

    geojson(latLng) {
        return (latLng && latLng.lat() && latLng.lng()) ? turfPoint([latLng.lng(), latLng.lat()]) : null;
    }


    render() {
        if (!this.props.loaded) {
            return <InputLoading t={this.props.t} />;
        }

        if (_isBlank(this.props.value)) { // TODO: explain why we need this
            if (this.geocodeButtonRef.current) {
                const clickEvent = new MouseEvent('click', {
                    'view': window,
                    'bubbles': false,
                    'cancelable': true
                });
                this.geocodeButtonRef.current.dispatchEvent(clickEvent);
            }
        }

        const placeIconUrl = this.props.widgetConfig.placesIcon ? surveyHelper.parseString(this.props.widgetConfig.placesIcon.url, this.props.interview, this.props.path, this.props.user) : '/dist/images/activites_icons/default_marker.svg';
        const iconUrl = this.props.widgetConfig.icon ? surveyHelper.parseString(this.props.widgetConfig.icon.url, this.props.interview, this.props.path, this.props.user) : '/dist/images/default_marker.svg';
        const selectedIconUrl = '/dist/images/activities_icons/default_selected_marker.svg';
        const geojsons = this.props.widgetConfig.geojsons ? this.props.widgetConfig.geojsons(this.props.interview, this.props.path, this.props.activeUuid) : null;
        const gPolygons = [];
        const polygons = geojsons ? _get(geojsons, 'polygons.features', []) : null;
        const places = this.state.places;
        const placeMarkers = [];
        const placeMenuChoices = [];

        const confirmedPlaceMarker = this.props.value && this.state.confirmedPlace ? <Marker
            position={this.convertToLatLng(this.props.value)}
            onDragend={this.onMarkerMove}
            draggable={true}
            icon={this.props.widgetConfig.icon ? {
                url: iconUrl,
                size: new google.maps.Size(40, 40),
                scaledSize: new google.maps.Size(40, 40)
            } : null}
        /> : null;

        if (places && places.length > 0) {
            for (let i = 0; i < places.length; i++) {
                const place = places[i];
                place.id = place.properties.osm_type + '/' + place.properties.osm_id;
                const googleMapsPlaceLatLng = new this.props.google.maps.LatLng(place.geometry.coordinates[1], place.geometry.coordinates[0]);
                const isSelected = this.state.selectedPlace && this.state.selectedPlace.id ? place.id === this.state.selectedPlace.id : false;
                //const placeGeojson = this.geojson(place.geometry.location);
                placeMarkers.push(<Marker
                    key={`gmarker_inputMapFindPlace_${this.props.path}__${i}`}
                    position={googleMapsPlaceLatLng}
                    draggable={false}
                    icon={{
                        url: isSelected ? selectedIconUrl : placeIconUrl,
                        size: new google.maps.Size(40, 40),
                        scaledSize: new google.maps.Size(40, 40)
                    }}
                    onClick={function (marker, map, e) {
                        if (e && e.domEvent && typeof e.domEvent === 'function') {
                            e.domEvent.stopPropagation(); // don't propagate click on map, only on marker
                        }
                        this.setState(function () {
                            this.placesInfoWindow.close();
                            this.placesInfoWindow.setContent(this.getInfoWindowString(place));
                            this.placesInfoWindow.setPosition(googleMapsPlaceLatLng)
                            this.placesInfoWindow.open(this.map);
                            return {
                                selectedPlace: place
                            }
                        }.bind(this));
                    }.bind(this)}
                />);
                const placeAdress = formatPhotonAddress(place.properties);
                const placeOsmTag = place.properties && place.properties.osm_key && place.properties.osm_value ? place.properties.osm_key + ':' + place.properties.osm_value : '';
                placeMenuChoices.push({
                    value: place.id,
                    label: this.getPlaceLabel(place) + (!_isBlank(placeAdress) ? ' (' + placeAdress + ')' : '') + (placeOsmTag ? ' [' + placeOsmTag + ']' : '')
                });
            }
        }

        // prepare polygons:
        if (polygons) {
            for (let i = 0, countI = polygons.length; i < countI; i++) {
                const polygon = polygons[i];
                const polygonCoordinates = polygon.geometry.coordinates[0].map((coordinates) => ({
                    lat: coordinates[1],
                    lng: coordinates[0]
                }));

                gPolygons.push(< Polygon key={`gPolygon_inputMapFindPlace_${this.props.path}__${i}`}
                    paths={polygonCoordinates}
                    strokeColor={polygon.properties.strokeColor || "#0000FF"}
                    strokeOpacity={polygon.properties.strokeOpacity || 0.8}
                    strokeWeight={polygon.properties.strokeWeight || 2}
                    fillColor={polygon.properties.fillColor || "#0000FF"}
                    fillOpacity={polygon.properties.fillOpacity || 0.35}
                />
                );
            }
        }

        return (
            <div className={`survey-question__input-map-container`}>
                <input // we don't really need the input with maps. We just need to find a way to change style of map container according to isEmpty or isValid status
                    type="hidden"
                    aria-hidden="true"
                    className={`apptr__form-input input-map-hidden`}
                    name={this.props.shortname}
                    id={this.props.id}
                    defaultValue={JSON.stringify(this.props.value)}
                    readOnly={true}
                    ref={this.props.inputRef}
                />
                {this.props.widgetConfig.refreshGeocodingLabel &&
                    <button
                        type="button"
                        className="button refresh-geocode green large"
                        onClick={this.onButtonFindPlaceClick}
                        ref={this.geocodeButtonRef}
                    >
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="faIconLeft" /> {this.props.widgetConfig.refreshGeocodingLabel[this.props.i18n.language]}
                    </button>}
                {this.state.geocoding && <p>{this.props.t("main:Searching")}...</p>}
                {places && places.length > 1 && <p className="_strong _dark">{this.props.t("main:SelectPlaceText")}</p>}
                {places && places.length === 1 && <p className="_strong _dark">{this.props.t("main:SelectPlaceTextSingleResult")}</p>}
                {places && places.length >= 1 &&
                    <div>
                        <label htmlFor={'survey-question__input-multiselect-' + this.props.path + '_mapFindPlaceMenuOsm'} style={{ display: 'none' }}>{this.props.t("main:SelectPlaceResultsLabel")}</label>
                        <InputMultiSelect
                            widgetConfig={{
                                multiple: false,
                                isMulti: false,
                                closeMenuOnSelect: true,
                                path: this.props.path + '_mapFindPlaceMenuOsm',
                                choices: placeMenuChoices
                            }}
                            path={this.props.path + '_mapFindPlaceMenuOsm'}
                            value={this.state.selectedPlace && this.state.selectedPlace.place_id ? this.state.selectedPlace.place_id : null}
                            onValueChange={this.onMenuSelect}
                        />
                    </div>}
                <div className="survey-question__input-map-container" aria-hidden="true">
                    <Map
                        className="apptr__form-input input-map"
                        google={this.props.google}
                        containerStyle={{
                            boxSizing: 'border-box',
                            position: 'relative',
                            width: '100%',
                            height: this.props.widgetConfig.height || '40rem',
                            border: '1px solid rgba(0,0,0,0.2'
                        }}
                        onClick={this.onMapClick}
                        center={this.defaultCenter} // this is not used, use onMapReady function to set center or bounds
                        onReady={this.onMapReady}
                        maxZoom={this.props.widgetConfig.maxZoom || 18}
                        onDragend={this.onMapDragEnd}
                        zoom={this.props.widgetConfig.defaultZoom || 14}
                        gestureHandling='greedy'
                        bootstrapURLKeys={{ libraries: ['places', 'geometry'] }}>
                        {confirmedPlaceMarker !== null && confirmedPlaceMarker}
                        {placeMarkers}
                        {gPolygons}
                    </Map>
                </div>
                {this.state.selectedPlace && places && places.length > 0 && <div className='center'>
                    {this.props.widgetConfig.refreshGeocodingLabel &&
                        <button
                            type="button"
                            className="button green"
                            onClick={this.onConfirmPlace}
                        >
                            <FontAwesomeIcon icon={faCheckCircle} className="faIconLeft" />{this.props.t("main:ConfirmLocation")}
                        </button>}
                </div>}
            </div>
        );
    }
}

// TODO: remove need for GoogleApi by replacing by leaflet

export default GoogleApiWrapper({ ...googleConfig })(withTranslation()(InputMapFindPlacePhotonOsm))