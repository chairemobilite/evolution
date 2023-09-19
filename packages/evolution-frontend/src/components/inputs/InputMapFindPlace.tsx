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
import Loader from 'react-spinners/HashLoader';

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

interface InputMapFindPlaceState<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
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
    InputMapFindPlaceState<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
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
        this.onSearchPlaceButtonKeyDown = this.onSearchPlaceButtonKeyDown.bind(this);

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

    onSearchPlaceButtonKeyDown(e) {
        e.preventDefault();
        if (e.key === 'enter' || e.key === 'space' || e.which === 13 || e.which === 32) {
            this.onButtonFindPlaceClick();
        }
    }

    onValueChange = (feature?: GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties>) => {
        if (feature) {
            feature.geometry.coordinates = feature.geometry.coordinates.map((coordinate) => {
                return Number(coordinate.toFixed(this.props.widgetConfig.coordinatesPrecision ?? 5));
            });
        }

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
        const language = this.props.i18n.language;

        const geocodingQueryString = this.getGeocodingQueryString();
        if (geocodingQueryString) {
            try {
                this.setState({ geocoding: true });
                const features =
                    (await geocodeMultiplePlaces(geocodingQueryString, {
                        bbox,
                        language,
                        ...this.state.geocodingSpecificOptions
                    })) || [];
                const isSingleResult = features && features.length === 1;

                // If there is only a single result, we check if it's precise enough using the location type information
                // returned by the geocoding API.
                // The Google Maps geocoding API returns an array of location types for each result.
                // For a result, if all of its location types are deemed too imprecise, then this result is considered to be imprecise and an error is shown to the user.
                for (let i = 0; i < features.length; i++) {
                    if (
                        this.props.widgetConfig.invalidGeocodingResultTypes &&
                        features[i] &&
                        features[i].properties.placeData &&
                        features[i].properties.placeData.types
                    ) {
                        const types = features[i].properties.placeData.types as Array<string>;
                        features[i].properties.isGeocodingImprecise = types.every((e) =>
                            this.props.widgetConfig.invalidGeocodingResultTypes!.includes(e)
                        );
                    }
                }
                const isSingleResultAndImpreciseGeocoding =
                    this.props.widgetConfig.invalidGeocodingResultTypes &&
                    isSingleResult &&
                    features[0].properties.isGeocodingImprecise;

                this.setState(
                    {
                        places: features,
                        selectedPlace: isSingleResult ? features[0] : undefined,
                        geocodingQueryString
                    },
                    () => {
                        // FIXME: In order to directly show the "geocoding is imprecise" warning if there is a *single* result
                        // we must automatically confirm the place so that the validation code is executed.
                        // Ideally, we would not have to do this and we would be able to trigger the validation code directly
                        // from inside this react component.
                        if (isSingleResult && (this.autoConfirmIfSingleResult || isSingleResultAndImpreciseGeocoding)) {
                            this.onConfirmPlace(undefined);
                        } else if (this.props.widgetConfig.invalidGeocodingResultTypes !== undefined) {
                            // Kind of a hack, but we must clear the value for this question when we do geocoding.
                            // For example, if you search for "montreal", you would get the "geocoding is imprecise" label in red.
                            // Then, if you search for "place ville marie" (a more specific place), you would see search results
                            // but STILL see the "geocoding is imprecise" error label since you haven't yet confirmed this location.
                            // This is weird and it seems to indicate to the user that this location is still not precise enough, which is not the case.
                            // Therefore, by clearing the value here, we get rid of any existing warning labels shown on the widget.
                            this.props.onValueChange({ target: { value: null } });
                        }
                    }
                );
                if ((!this.autoConfirmIfSingleResult || !isSingleResult) && !isSingleResultAndImpreciseGeocoding) {
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
            selectedPlace.properties.geocodingResultsData = {
                formatted_address: placeData.formatted_address,
                place_id: placeData.place_id,
                types: placeData.types
            };
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

        const showSearchPlaceButton = this.props.widgetConfig.showSearchPlaceButton
            ? surveyHelper.parseBoolean(
                this.props.widgetConfig.showSearchPlaceButton,
                this.props.interview,
                this.props.path,
                this.props.user
            )
            : true;

        const searchPlaceButtonColor = this.props.widgetConfig.searchPlaceButtonColor
            ? surveyHelper.parseString(
                this.props.widgetConfig.searchPlaceButtonColor,
                this.props.interview,
                this.props.path,
                this.props.user
            )
            : 'green';

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

            if (this.props.value.properties.lastAction && this.props.value.properties.lastAction === 'shortcut') {
                // Since this block of code runs when the map is given an initial value (for example when a shortcut is chosen),
                // we need to update the map bounds.
                this.shouldFitBoundsIdx++;
            }
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
                {this.props.widgetConfig.refreshGeocodingLabel && showSearchPlaceButton !== false && (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'flex-start',
                            alignItems: 'center'
                        }}
                    >
                        <button
                            id={`${this.props.id}_refresh`}
                            type="button"
                            className={`button refresh-geocode ${searchPlaceButtonColor} large`}
                            onMouseDown={this.onSearchPlaceButtonMouseDown}
                            onMouseUp={this.onSearchPlaceButtonMouseUp}
                            onKeyDown={this.onSearchPlaceButtonKeyDown}
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
                        <div style={{ marginLeft: 10 }}>
                            <Loader size={30} color={'#aaaaaa'} loading={this.state.geocoding} />
                        </div>
                    </div>
                )}

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
                        height={this.props.widgetConfig.height}
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
