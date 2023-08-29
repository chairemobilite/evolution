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

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import projectConfig from 'chaire-lib-common/lib/config/shared/project.config';
import { InputMapPointType } from 'evolution-common/lib/services/widgets';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { WithTranslation, withTranslation } from 'react-i18next';
import { FeatureGeocodedProperties, MarkerData } from './maps/InputMapTypes';
import { CommonInputProps } from './CommonInputProps';

// TODO Allow to support multiple maps and geocoders
import InputMapGoogle from './maps/google/InputMapGoogle';
import { geocodeSinglePoint } from './maps/google/GoogleGeocoder';

export type InputMapPointProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = CommonInputProps<
    CustomSurvey,
    CustomHousehold,
    CustomHome,
    CustomPerson
> & {
    value?: GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties>;
    inputRef?: React.LegacyRef<HTMLInputElement>;
    widgetConfig: InputMapPointType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
};

interface InputMapPointState {
    defaultCenter: any;
    currentBounds?: [number, number, number, number];
    markers: MarkerData[];
}

/**
 * Allow to select a single point from a map.
 *
 * TODO For now, it only uses google map, but this class should remain map
 * agnostic and support more map types
 */
export class InputMapPoint<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> extends React.Component<
    InputMapPointProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation,
    InputMapPointState
> {
    private geocodeButtonRef: React.RefObject<HTMLButtonElement> = React.createRef();
    private iconUrl: string;
    private iconSize: [number, number];

    constructor(props: InputMapPointProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation) {
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
        this.setState({ currentBounds: bbox });
        if (!this.props.value) {
            this.geocodeAddress(bbox);
        }
    };

    onBoundsChanged = (bbox?: [number, number, number, number]) => {
        this.setState({ currentBounds: bbox });
    };

    onGeocodeAddress = (e: React.MouseEvent) => {
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
        if (geocodingQueryString) {
            try {
                const feature = await geocodeSinglePoint(geocodingQueryString, { bbox });
                this.onValueChange(feature);
            } catch (error) {
                this.onValueChange(undefined);
            }
        }
    };

    render() {
        const maxZoom = this.props.widgetConfig.maxZoom || 18;

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
                {this.props.widgetConfig.refreshGeocodingLabel && this.props.widgetConfig.showSearchPlaceButton !== false &&  (
                    <button
                        type="button"
                        id={`${this.props.id}_refresh`}
                        className="button refresh-geocode green large"
                        onClick={this.onGeocodeAddress}
                        ref={this.geocodeButtonRef}
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
                <div aria-hidden="true" className="survey-question__input-map-container">
                    <InputMapGoogle
                        defaultCenter={this.state.defaultCenter}
                        value={this.props.value}
                        onValueChange={this.onValueChange}
                        defaultZoom={Math.min(this.props.widgetConfig.defaultZoom || 16, maxZoom)}
                        markers={this.state.markers}
                        onMapReady={this.onMapReady}
                        onBoundsChanged={this.onBoundsChanged}
                    />
                </div>
            </div>
        );
    }
}

export default withTranslation()(InputMapPoint) as React.FunctionComponent<InputMapPointProps<any, any, any, any>>;
