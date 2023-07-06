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
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons/faCheckCircle';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import projectConfig from 'chaire-lib-common/lib/config/shared/project.config';
import { InputMapFindPlaceType } from 'evolution-common/lib/services/widgets';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { WithTranslation, withTranslation } from 'react-i18next';
import { FeatureGeocodedProperties, MarkerData, defaultIconSize, PlaceGeocodedProperties } from './maps/InputMapTypes';
import InputSelect from './InputSelect';
import { CommonInputProps } from './CommonInputProps';

// TODO Allow to support multiple maps and geocoders
import InputMapGoogle from './maps/google/InputMapGoogle';
import { geocodeMultiplePlaces } from './maps/google/GoogleGeocoder';

export type InputMapFindPlaceProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = CommonInputProps<
    CustomSurvey,
    CustomHousehold,
    CustomHome,
    CustomPerson
> & {
    value?: GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties>;
    loadingState?: number;
    inputRef?: React.LegacyRef<HTMLInputElement>;
    widgetConfig: InputMapFindPlaceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
};

interface InputMapFindPlaceState {
    geocoding: boolean;
    geocodingQueryString?: string;
    defaultCenter: any;
    places: GeoJSON.Feature<GeoJSON.Point, PlaceGeocodedProperties>[];
    selectedPlace?: GeoJSON.Feature<GeoJSON.Point, PlaceGeocodedProperties> | undefined;
    searchPlaceButtonWasMouseDowned: boolean;
    /** This allows map widgets to specify options specific for a corresponding
     * geocoder. Some geocoders do not need any additional information, but some
     * need to match a map (for instance Google) */
    geocodingSpecificOptions: { [key: string]: unknown };
}

/**
 * Allow to select a single point from a map.
 *
 * TODO For now, it only uses google map, but this class should remain map
 * agnostic and support more map types
 *
 * TODO This was copy pasted from InputMapPoint and the methods were modified
 * with original InputMapFindPlace. We should try to re-use as much of the code
 * as possible. Main difference is that there can be multiple markers here and
 * it needs confirmation.
 */
export class InputMapFindPlace<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> extends React.Component<
    InputMapFindPlaceProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation,
    InputMapFindPlaceState
> {
    private geocodeButtonRef: React.RefObject<HTMLButtonElement> = React.createRef();
    private autoConfirmIfSingleResult: boolean;
    private selectedIconUrl: string;
    private shouldFitBoundsIdx = 0;
    private currentBounds: [number, number, number, number] | undefined = undefined;

    constructor(
        props: InputMapFindPlaceProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation
    ) {
        super(props);

        this.onSearchPlaceButtonMouseDown = this.onSearchPlaceButtonMouseDown.bind(this);
        this.onSearchPlaceButtonMouseUp = this.onSearchPlaceButtonMouseUp.bind(this);

        // get initial map center from current value or widget config (can be a function)
        const defaultCenter = props.value
            ? { lon: props.value.geometry.coordinates[0], lat: props.value.geometry.coordinates[1] }
            : surveyHelper.parse(props.widgetConfig.defaultCenter, props.interview, props.path, props.user) ||
              projectConfig.mapDefaultCenter;

        this.autoConfirmIfSingleResult = this.props.widgetConfig.autoConfirmIfSingleResult || false;

        this.selectedIconUrl = '/dist/images/activities_icons/default_selected_marker.svg';

        this.state = {
            geocoding: false,
            defaultCenter,
            places: [],
            searchPlaceButtonWasMouseDowned: false,
            geocodingSpecificOptions: {}
        };
    }

    componentDidUpdate(prevProps) {
        // wait for any field to blur (unfocus) and save and/or validate, then trigger click:
        if (
            this.props.loadingState === 0 &&
            prevProps.loadingState > 0 &&
            this.state.searchPlaceButtonWasMouseDowned === true
        ) {
            // this is a hack because it will ignore mouseup if triggered and
            // will run clickButton even if the mouse was not upped.
            // but there is no other way to wait for blur to complete with fast clicks
            // (fast clicks with onBlur do not trigger mouseup)
            this.setState({ searchPlaceButtonWasMouseDowned: false }, this.onButtonFindPlaceClick);
        }
    }

    onSearchPlaceButtonMouseDown(e) {
        //e.preventDefault();
        // preventing default would ignore active input blur
        this.setState({ searchPlaceButtonWasMouseDowned: true });
    }

    onSearchPlaceButtonMouseUp(e) {
        e.preventDefault();
        if (this.props.loadingState === 0) {
            this.setState({ searchPlaceButtonWasMouseDowned: false }, this.onButtonFindPlaceClick);
        }
    }

    onValueChange = (feature?: GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties>) => {
        this.props.onValueChange({ target: { value: feature } });
        this.setState({
            selectedPlace: undefined,
            defaultCenter: feature
                ? { lat: feature.geometry.coordinates[1], lon: feature.geometry.coordinates[0] }
                : this.state.defaultCenter
        });
    };

    onMapReady = (bbox?: [number, number, number, number]) => {
        this.currentBounds = bbox;
        /*if (!this.props.value) { // does not work because map is not yet loaded at this point
            this.geocodePlaces(bbox);
        }*/
    };

    onBoundsChanged = (bbox?: [number, number, number, number]) => {
        this.currentBounds = bbox;
    };

    onButtonFindPlaceClick = () => {
        this.geocodePlaces(this.currentBounds);
    };

    getGeocodingQueryString = () => {
        return this.props.widgetConfig.geocodingQueryString
            ? this.props.widgetConfig.geocodingQueryString(this.props.interview, this.props.path, this.props.user)
            : undefined;
    };

    getMaxGeocodingResultsBounds = () => {
        return this.props.widgetConfig.maxGeocodingResultsBounds
            ? this.props.widgetConfig.maxGeocodingResultsBounds(this.props.interview, this.props.path, this.props.user)
            : undefined;
    };

    setGeocodingOptions = (options: { [key: string]: unknown }) => {
        this.setState({ geocodingSpecificOptions: options });
    };

    geocodePlaces = async (bbox?: [number, number, number, number]) => {
        const geocodingQueryString = this.getGeocodingQueryString();
        if (geocodingQueryString) {
            try {
                this.setState({ geocoding: true });
                const features =
                    (await geocodeMultiplePlaces(geocodingQueryString, {
                        bbox,
                        ...this.state.geocodingSpecificOptions
                    })) || [];
                const isSingleResult = features && features.length === 1;
                this.setState(
                    {
                        places: features,
                        selectedPlace: features && features.length === 1 ? features[0] : undefined,
                        geocodingQueryString
                    },
                    () => {
                        if (this.autoConfirmIfSingleResult && isSingleResult) {
                            this.onConfirmPlace(undefined);
                        }
                    }
                );
                if (!this.autoConfirmIfSingleResult || !isSingleResult) {
                    this.shouldFitBoundsIdx++;
                }
            } catch (error) {
                surveyHelper.devLog(`Error geocoding places: ${error}`);
                this.setState({ places: [], selectedPlace: undefined });
            } finally {
                this.setState({ geocoding: false });
            }
        }
    };

    onMenuSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const placeId = e && e.target ? e.target.value : null;
        if (placeId) {
            const selectedPlace = this.state.places.find((place) => place.properties.placeData.place_id === placeId);
            this.setState({ selectedPlace });
        }
    };

    onMarkerSelect = (feature) => {
        this.onValueChange(feature);
        this.setState({ selectedPlace: feature });
    };

    onConfirmPlace = (e: React.MouseEvent | undefined) => {
        if (e) {
            e.preventDefault();
        }
        if (this.state.selectedPlace) {
            const selectedPlace = { ...this.state.selectedPlace } as GeoJSON.Feature<
                GeoJSON.Point,
                FeatureGeocodedProperties
            >;
            const { placeData, ...selectedPlaceProperties } = this.state.selectedPlace.properties;
            selectedPlace.properties = { ...selectedPlaceProperties };
            selectedPlace.properties.lastAction = 'findPlace';
            selectedPlace.properties.geocodingQueryString = this.state.geocodingQueryString;
            this.props.onValueChange({ target: { value: selectedPlace } });
            this.setState({
                places: [],
                selectedPlace: undefined,
                defaultCenter: {
                    lat: selectedPlace.geometry.coordinates[1],
                    lon: selectedPlace.geometry.coordinates[0]
                }
            });
        }
    };

    private getInfoWindowContent = (
        place: GeoJSON.Feature<GeoJSON.Point, PlaceGeocodedProperties>,
        showPhoto = false
    ) => {
        return `
            <div>
              <div>
                ${place.properties.placeData.name}
              </div>
              <div class="_pale">${place.properties.placeData.formatted_address}</div>
              ${
    showPhoto && place.properties.placeData.photos && (place.properties.placeData.photos as any[])[0]
        ? `<div><img src="${(
                            place.properties.placeData.photos as any[]
        )[0].getUrl()}" height="100" /></div>`
        : ''
}
            </div>`;
    };

    render() {
        const maxZoom = this.props.widgetConfig.maxZoom || 18;
        const places = this.state.places;

        const placesIconUrl = this.props.widgetConfig.placesIcon
            ? surveyHelper.parseString(
                this.props.widgetConfig.placesIcon.url,
                this.props.interview,
                this.props.path,
                this.props.user
            ) || '/dist/images/default_marker.svg'
            : '/dist/images/default_marker.svg';

        const placesIconSize =
            this.props.widgetConfig.placesIcon && this.props.widgetConfig.placesIcon.size
                ? this.props.widgetConfig.placesIcon.size
                : defaultIconSize;

        const iconUrl = this.props.widgetConfig.icon
            ? surveyHelper.parseString(
                this.props.widgetConfig.icon.url,
                this.props.interview,
                this.props.path,
                this.props.user
            ) || '/dist/images/default_marker.svg'
            : '/dist/images/default_marker.svg';

        const iconSize =
            this.props.widgetConfig.icon && this.props.widgetConfig.icon.size
                ? this.props.widgetConfig.icon.size
                : defaultIconSize;

        const placeMenuChoices = places.map((place) => {
            const placeData = place.properties.placeData as any;
            return {
                value: placeData.place_id,
                label:
                    placeData.types && placeData.types.length === 1 && placeData.types[0] === 'street_address'
                        ? placeData.formatted_address
                        : `${placeData.name} (${placeData.formatted_address})`
            };
        });
        const markers: MarkerData[] = [];
        if (places && places.length > 0) {
            places.forEach((feature) =>
                markers.push({
                    position: feature,
                    icon: {
                        url: feature === this.state.selectedPlace ? this.selectedIconUrl : placesIconUrl,
                        size: placesIconSize
                    },
                    draggable: this.state.selectedPlace ? true : false,
                    onClick: () => this.onMarkerSelect(feature)
                })
            );
        }

        if (this.props.value) {
            markers.push({
                position: this.props.value,
                icon: { url: iconUrl, size: iconSize },
                draggable: true
            });
            // Since this block of code runs when the map is given an initial value (for example when a shortcut is chosen),
            // we need to update the map bounds.
            this.shouldFitBoundsIdx++;
        }

        const infoWindow = this.state.selectedPlace
            ? {
                position: this.state.selectedPlace,
                content: this.getInfoWindowContent(this.state.selectedPlace, this.props.widgetConfig.showPhoto)
            }
            : undefined;

        const afterRefreshButtonText = this.props.widgetConfig.afterRefreshButtonText
            ? surveyHelper.translateString(
                this.props.widgetConfig.afterRefreshButtonText,
                this.props.i18n,
                this.props.interview,
                this.props.path,
                this.props.user
            )
            : null;

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
                {this.props.widgetConfig.refreshGeocodingLabel && (
                    <button
                        id={`${this.props.id}_refresh`}
                        type="button"
                        className="button refresh-geocode green large"
                        onMouseDown={this.onSearchPlaceButtonMouseDown}
                        onMouseUp={this.onSearchPlaceButtonMouseUp}
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

                {this.state.geocoding && <p>{this.props.t('main:Searching')}...</p>}
                {places.length > 0 && (
                    <p className="_strong _dark">
                        {this.props.t(places.length > 1 ? 'main:SelectPlaceText' : 'main:SelectPlaceTextSingleResult')}
                    </p>
                )}
                {places.length >= 1 && (
                    <div>
                        <label
                            htmlFor={'survey-question__input-multiselect-' + this.props.path + '_mapFindPlaceMenu'}
                            style={{ display: 'none' }}
                        >
                            {this.props.t('main:SelectPlaceResultsLabel')}
                        </label>
                        <InputSelect
                            widgetConfig={{
                                inputType: 'select',
                                choices: placeMenuChoices
                            }}
                            path={this.props.path + '_mapFindPlaceMenu'}
                            value={
                                this.state.selectedPlace && this.state.selectedPlace.properties.placeData.place_id
                                    ? (this.state.selectedPlace.properties.placeData.place_id as string)
                                    : undefined
                            }
                            onValueChange={this.onMenuSelect}
                            interview={this.props.interview}
                            user={this.props.user}
                            id={`${this.props.id}_mapFindPlace`}
                        />
                        <div className="apptr__separator"></div>
                    </div>
                )}

                {afterRefreshButtonText && this.props.widgetConfig.containsHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: afterRefreshButtonText }} />
                ) : (
                    <Markdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]}>
                        {afterRefreshButtonText as string}
                    </Markdown>
                )}

                <div aria-hidden="true" className="survey-question__input-map-container">
                    <InputMapGoogle
                        defaultCenter={this.state.defaultCenter}
                        maxGeocodingResultsBounds={this.getMaxGeocodingResultsBounds()}
                        value={this.props.value}
                        onValueChange={this.onValueChange}
                        defaultZoom={Math.min(this.props.widgetConfig.defaultZoom || 16, maxZoom)}
                        maxZoom={maxZoom}
                        markers={markers}
                        onMapReady={this.onMapReady}
                        onBoundsChanged={this.onBoundsChanged}
                        shouldFitBounds={this.shouldFitBoundsIdx}
                        infoWindow={infoWindow}
                        setGeocodingOptions={this.setGeocodingOptions}
                    />
                </div>
                {this.state.selectedPlace && places.length > 0 && (
                    <div className="center">
                        {this.props.widgetConfig.refreshGeocodingLabel && (
                            <button
                                id={`${this.props.id}_confirm`}
                                type="button"
                                className="button green"
                                onClick={this.onConfirmPlace}
                            >
                                <FontAwesomeIcon icon={faCheckCircle} className="faIconLeft" />
                                {this.props.t('main:ConfirmLocation')}
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }
}

export default withTranslation()(InputMapFindPlace) as React.FunctionComponent<
    InputMapFindPlaceProps<any, any, any, any>
>;
