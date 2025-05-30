/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import GeoJSON from 'geojson';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons/faMapMarkerAlt';

import projectConfig from 'evolution-common/lib/config/project.config';
import { InputMapPointType } from 'evolution-common/lib/services/questionnaire/types';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { WithTranslation, withTranslation } from 'react-i18next';
import { FeatureGeocodedProperties, MarkerData } from './maps/InputMapTypes';
import { CommonInputProps } from './CommonInputProps';

// TODO Allow to support multiple maps and geocoders
import InputMapGoogle from './maps/google/InputMapGoogle';
import { geocodeSinglePoint } from './maps/google/GoogleGeocoder';
import SurveyErrorMessage from '../survey/widgets/SurveyErrorMessage';

// Default max zoom and zoom
const defaultZoom = 13;
const defaultMaxZoom = 18;

export type InputMapPointProps = CommonInputProps & {
    value?: GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties>;
    inputRef?: React.LegacyRef<HTMLInputElement>;
    widgetConfig: InputMapPointType;
};

interface InputMapPointState {
    defaultCenter: any;
    currentBounds?: [number, number, number, number];
    markers: MarkerData[];
    displayMessage?: string;
    renderGeoCodeButton: boolean;
}

/**
 * Allow to select a single point from a map.
 *
 * TODO For now, it only uses google map, but this class should remain map
 * agnostic and support more map types
 */
export class InputMapPoint extends React.Component<InputMapPointProps & WithTranslation, InputMapPointState> {
    private geocodeButtonRef: React.RefObject<HTMLButtonElement | null> = React.createRef();
    private iconUrl: string;
    private iconSize: [number, number];

    constructor(props: InputMapPointProps & WithTranslation) {
        super(props);

        // get initial map center from current value or widget config (can be a function)
        const defaultCenter = props.value
            ? { lon: props.value.geometry.coordinates[0], lat: props.value.geometry.coordinates[1] }
            : surveyHelper.parse(props.widgetConfig.defaultCenter, props.interview, props.path, props.user) ||
              projectConfig.mapDefaultCenter;

        this.iconUrl = this.props.widgetConfig.icon
            ? surveyHelper.parseString(
                this.props.widgetConfig.icon.url,
                this.props.interview,
                this.props.path,
                this.props.user
            ) || '/dist/images/default_marker.svg'
            : '/dist/images/default_marker.svg';

        this.iconSize =
            this.props.widgetConfig.icon && this.props.widgetConfig.icon.size
                ? this.props.widgetConfig.icon.size
                : [40, 40];

        this.state = {
            defaultCenter,
            currentBounds: undefined,
            renderGeoCodeButton: false,
            markers: this.props.value
                ? [
                    {
                        position: this.props.value,
                        icon: { url: this.iconUrl, size: this.iconSize },
                        draggable: true
                    }
                ]
                : []
        };
    }

    onValueChange = (feature?: GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties>) => {
        this.props.onValueChange({ target: { value: feature } });
        this.setState({
            defaultCenter: feature
                ? { lat: feature.geometry.coordinates[1], lon: feature.geometry.coordinates[0] }
                : this.state.defaultCenter,
            markers: feature
                ? [
                    {
                        position: feature,
                        icon: { url: this.iconUrl, size: this.iconSize },
                        draggable: true
                    }
                ]
                : []
        });
    };

    onMapReady = (bbox?: [number, number, number, number]) => {
        // Do not render button until map is ready, to prevent flakiness when a test clicks the button too quickly.
        this.setState({ currentBounds: bbox, renderGeoCodeButton: true });
        if (!this.props.value) {
            this.geocodeAddress(bbox);
        }
    };

    onBoundsChanged = (bbox?: [number, number, number, number]) => {
        this.setState({ currentBounds: bbox });
    };

    onGeocodeAddress = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.preventDefault();
        this.geocodeAddress(this.state.currentBounds);
    };

    getGeocodingQueryString = () => {
        return this.props.widgetConfig.geocodingQueryString
            ? this.props.widgetConfig.geocodingQueryString(this.props.interview, this.props.path, this.props.user)
            : undefined;
    };

    geocodeAddress = async (bbox?: [number, number, number, number]) => {
        const geocodingQueryString = this.getGeocodingQueryString();
        const geocodingQueryStringArray =
            typeof geocodingQueryString === 'string'
                ? [{ queryString: geocodingQueryString, zoom: defaultZoom }]
                : geocodingQueryString;
        if (geocodingQueryStringArray) {
            try {
                // FIXME We may want to adapt this to support multiple geocoding queries, like in the inputMapFindPlace widget
                const feature = await geocodeSinglePoint(geocodingQueryStringArray[0].queryString, { bbox });
                this.onValueChange(feature);
                this.setState({ displayMessage: feature === undefined ? 'main:InputMapGeocodeNoResult' : undefined });
            } catch {
                this.onValueChange(undefined);
                this.setState({ displayMessage: 'main:InputMapGeocodeError' });
            }
        }
    };

    render() {
        const maxZoom = this.props.widgetConfig.maxZoom || defaultMaxZoom;

        const showSearchPlaceButton = this.props.widgetConfig.showSearchPlaceButton
            ? surveyHelper.parseBoolean(
                this.props.widgetConfig.showSearchPlaceButton,
                this.props.interview,
                this.props.path,
                this.props.user
            )
            : true;

        return (
            <div className={'survey-question__input-map-container'}>
                <input // we don't really need the input with maps. We just need to find a way to change style of map container according to isEmpty or isValid status
                    type="hidden"
                    className={'apptr__form-input input-map-hidden'}
                    name={this.props.widgetConfig.shortname}
                    id={this.props.id}
                    defaultValue={JSON.stringify(this.props.value)}
                    readOnly={true}
                    ref={this.props.inputRef}
                />
                {this.props.widgetConfig.refreshGeocodingLabel && showSearchPlaceButton !== false && (
                    <button
                        type="button"
                        id={`${this.props.id}_refresh`}
                        className="button refresh-geocode green large"
                        onClick={this.onGeocodeAddress}
                        ref={this.geocodeButtonRef}
                        style={{ display: this.state.renderGeoCodeButton ? 'inline' : 'none' }}
                    >
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="faIconLeft" />
                        {surveyHelper.translateString(
                            this.props.widgetConfig.refreshGeocodingLabel,
                            this.props.i18n,
                            this.props.interview,
                            this.props.path,
                            this.props.user
                        )}
                    </button>
                )}
                {this.state.displayMessage && (
                    <SurveyErrorMessage containsHtml={false} text={this.props.t(this.state.displayMessage)} />
                )}
                <div aria-hidden="true" className="survey-question__input-map-container">
                    <InputMapGoogle
                        defaultCenter={this.state.defaultCenter}
                        value={this.props.value}
                        onValueChange={this.onValueChange}
                        defaultZoom={Math.min(this.props.widgetConfig.defaultZoom || defaultZoom, maxZoom)}
                        markers={this.state.markers}
                        onMapReady={this.onMapReady}
                        onBoundsChanged={this.onBoundsChanged}
                    />
                </div>
            </div>
        );
    }
}

export default withTranslation()(InputMapPoint);
