/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { interviewAttributes } from './interviewData';
import InputMapFindPlace from '../InputMapFindPlace';
import { geocodeMultiplePlaces } from '../maps/google/GoogleGeocoder';

// Mock react-markdown and remark-gfm as they use syntax not supported by jest
jest.mock('react-markdown', () => 'Markdown');
jest.mock('remark-gfm', () => 'remark-gfm');

// Mock db queries
jest.mock('../maps/google/GoogleGeocoder', () => ({
    geocodeMultiplePlaces: jest.fn()
}));
const mockedGeocode = geocodeMultiplePlaces as jest.MockedFunction<typeof geocodeMultiplePlaces>;

const userAttributes = {
    id: 1,
    username: 'foo',
    preferences: {  },
    serializedPermissions: [],
    isAuthorized: () => true,
    is_admin: false,
    pages: [],
    showUserInfo: true
};

const baseWidgetConfig = {
    type: 'question' as const,
    twoColumns: true,
    path: 'test.foo',
    containsHtml: true,
    label: {
        fr: 'Texte en français',
        en: 'English text'
    },
    size: 'medium' as const,
    inputType: 'mapFindPlace' as const,
    defaultCenter: { lat: 45, lon: -73 },
    showPhoto: false
};

describe('Render InputMapPoint with various parameters', () => {

    test('Test with minimal parameters', () => {
        const { container } = render(
            <InputMapFindPlace
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={baseWidgetConfig}
                value={undefined}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(container).toMatchSnapshot();
    });

    test('Test with all parameters', () => {

        const testWidgetConfig = Object.assign({
            geocodingQueryString: jest.fn(),
            refreshGeocodingLabel: {
                fr: 'Rafraîchir la carte',
                en: 'Refresh map'
            },
            icon: {
                url: 'path/to/icon',
                size: [80, 80] as [number, number]
            },
            maxZoom: 18,
            defaultZoom: 15,
            coordinatesPrecision: 6,
            placesIcon: {
                url: 'path/to/places-icon',
                size: [85, 85] as [number, number]
            },
            selectedIcon: {
                url: 'path/to/selected-icon',
                size: [90, 90] as [number, number]
            },
            maxGeocodingResultsBounds: function (_interview, _path) {
                return [{ lat: 45.2229, lng: -74.3230 }, { lat: 46.1181, lng: -72.9215 }] as [{ lat: number; lng: number; }, { lat: number; lng: number; }];
            },
            invalidGeocodingResultTypes: [
                'political',
                'country',
            ],
            resetToDefaultUnlessUserInteracted: true
        }, baseWidgetConfig);
        const { container } = render(
            <InputMapFindPlace
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={testWidgetConfig}
                value={{ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [-73.1, 45.02] } }}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(container).toMatchSnapshot();
    });

});

describe('Test geocoding requests', () => {
    const testId = 'test';
    const geocodingString = 'foo restaurant';
    const mockOnValueChange = jest.fn();

    const testWidgetConfig = Object.assign({
        geocodingQueryString: jest.fn().mockReturnValue(geocodingString),
        refreshGeocodingLabel: {
            fr: 'Geocode',
            en: 'Geocode'
        },
        icon: {
            url: 'path/to/icon',
        },
        maxZoom: 18,
        defaultZoom: 15,
        placesIcon: {
            url: 'path/to/icon',
        },
        size: 'medium',
        resetToDefaultUnlessUserInteracted: true
    }, baseWidgetConfig);

    const placeFeature1 = {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [-73.2, 45.1] },
        properties: { placeData: { place_id: '1', formatted_address: '123 test street', name: 'Foo extra good restaurant' } }
    };
    const placeFeature2 = {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [-73.2, 45.1] },
        properties: { placeData: { place_id: '2', formatted_address: '123 foo street', types: ['street_address'] } }
    };
    const placeFeature3 = {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [ -73.5673919, 45.5018869] },
        properties: { placeData: { place_id: '3', formatted_address: 'Montreal, QC, Canada', types: ['locality', 'political'] } }
    };

    /**
     * Render the widget with shared defaults. Pass `widgetConfig` to override.
     */
    const renderWidget = (overrides: { widgetConfig?: any } = {}) =>
        render(
            <InputMapFindPlace
                id={testId}
                onValueChange={mockOnValueChange}
                widgetConfig={overrides.widgetConfig || testWidgetConfig}
                value={{
                    type: 'Feature' as const,
                    properties: {},
                    geometry: { type: 'Point' as const, coordinates: [-73.1, 45.02] }
                }}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path="foo.test"
                loadingState={0}
            />
        );

    beforeEach(() => {
        mockedGeocode.mockClear();
        mockOnValueChange.mockClear();
    });

    test('Geocode with multiple results: shows them in the list, no auto-select, no confirm', async () => {
        const { container } = renderWidget();
        const user = userEvent.setup();

        // Find and click on the Geocode button, to return multiple values
        mockedGeocode.mockResolvedValueOnce([placeFeature1, placeFeature2]);
        await user.click(screen.getByText('Geocode'));
        expect(mockedGeocode).toHaveBeenCalledWith(geocodingString, expect.anything());

        // The select list should display the 2 places and the empty element and should not have a confirm button
        const selectionList = container.querySelector('select') as HTMLSelectElement;
        expect(selectionList).toBeInTheDocument();
        expect(selectionList.children.length).toEqual(3);
        expect(selectionList.children[1].textContent).toEqual('Foo extra good restaurant (123 test street)');
        expect(selectionList.children[2].textContent).toEqual('123 foo street');
        expect(screen.queryByText('ConfirmLocation')).not.toBeInTheDocument();

        // Make sure the value has not been changed
        expect(mockOnValueChange).not.toHaveBeenCalled();
    });

    test('Multi-result: user picks the second option, then confirm saves that place_id', async () => {
        const { container } = renderWidget();
        const user = userEvent.setup();

        // Find and click on the Geocode button, to return multiple values
        mockedGeocode.mockResolvedValueOnce([placeFeature1, placeFeature2]);
        await user.click(screen.getByText('Geocode'));
        const select = container.querySelector('select') as HTMLSelectElement;

        // Pick the second result (place_id '2') in the selection list
        await user.selectOptions(select, placeFeature2.properties.placeData.place_id);
        expect(screen.getByText('ConfirmLocation')).toBeInTheDocument();

        // Click on the confirm button and make sure the update function has been called
        await user.click(screen.getByText('ConfirmLocation'));
        // The saved value must reference the SECOND place's place_id, not the first
        expect(mockOnValueChange).toHaveBeenCalledWith({
            target: {
                value: expect.objectContaining({
                    properties: expect.objectContaining({
                        geocodingResultsData: expect.objectContaining({
                            place_id: placeFeature2.properties.placeData.place_id,
                            formatted_address: placeFeature2.properties.placeData.formatted_address,
                            types: placeFeature2.properties.placeData.types
                        })
                    })
                })
            }
        });
    });

    test('Geocode with single result auto-selects it (but still requires a manual confirm), then confirm preserves place_id (legal compliance)', async () => {
        const { container } = renderWidget();
        const user = userEvent.setup();

        // Find and click on the Geocode button, to return a single result
        mockedGeocode.mockResolvedValueOnce([placeFeature1]);
        await user.click(screen.getByText('Geocode'));
        const selectionList = container.querySelector('select') as HTMLSelectElement;
        // The single result is auto-selected: the list has the single result and an empty choice
        expect(selectionList.children.length).toEqual(2);
        expect(selectionList.children[1].textContent).toEqual('Foo extra good restaurant (123 test street)');

        // Click on the confirm button and make sure the update function has been called
        await user.click(screen.getByText('ConfirmLocation'));
        expect(mockOnValueChange).toHaveBeenCalledWith({
            target: {
                value: {
                    type: 'Feature' as const,
                    geometry: placeFeature1.geometry,
                    properties: {
                        lastAction: 'findPlace',
                        geocodingQueryString: geocodingString,
                        geocodingResultsData: {
                            formatted_address: placeFeature1.properties.placeData.formatted_address,
                            place_id: placeFeature1.properties.placeData.place_id,
                            types: undefined
                        }
                    }
                }
            }
        });
        // There should not be any selection or confirm widgets anymore
        expect(container.querySelector('select')).not.toBeInTheDocument();
        expect(screen.queryByText('ConfirmLocation')).not.toBeInTheDocument();
    });

    // Re-querying after a single result clears the selection list and confirm button,
    // both when the new query yields no result and when it rejects.
    test.each([
        ['undefined results', () => mockedGeocode.mockResolvedValueOnce(undefined)],
        ['rejected promise', () => mockedGeocode.mockRejectedValueOnce('error geocoding')]
    ])('Geocode with single result, then re-query with %s clears the list', async (_label, primeSecondCall) => {
        const { container } = renderWidget();
        const user = userEvent.setup();

        // Find and click on the Geocode button, to return a single result
        mockedGeocode.mockResolvedValueOnce([placeFeature1]);
        await user.click(screen.getByText('Geocode'));
        expect(container.querySelector('select')).toBeInTheDocument();
        expect(screen.getByText('ConfirmLocation')).toBeInTheDocument();

        // Click the geocode button again, but get undefined results or a rejection
        const newGeocodingString = 'other string';
        testWidgetConfig.geocodingQueryString.mockReturnValueOnce(newGeocodingString);
        primeSecondCall();
        await user.click(screen.getByText('Geocode'));
        expect(mockedGeocode).toHaveBeenLastCalledWith(newGeocodingString, expect.anything());
        expect(container.querySelector('select')).not.toBeInTheDocument();
        expect(screen.queryByText('ConfirmLocation')).not.toBeInTheDocument();
    });

    test('Geocode with single imprecise result auto-confirms with isGeocodingImprecise flag', async () => {
        const widgetConfig = Object.assign(
            {
                invalidGeocodingResultTypes: [
                    'political',
                    'country',
                    'administrative_area_level_1',
                    'administrative_area_level_2',
                    'administrative_area_level_3',
                    'administrative_area_level_4',
                    'administrative_area_level_5',
                    'administrative_area_level_6',
                    'administrative_area_level_7',
                    'colloquial_area',
                    'locality',
                    'sublocality',
                    'sublocality_level_1',
                    'neighborhood',
                    'route'
                ]
            },
            testWidgetConfig
        );

        const { container } = renderWidget({ widgetConfig });
        const user = userEvent.setup();

        // Find and click on the Geocode button, to return a single but imprecise value (according to widgetConfig.invalidGeocodingResultTypes)
        mockedGeocode.mockResolvedValueOnce([placeFeature3]);
        await user.click(screen.getByText('Geocode'));

        expect(mockedGeocode).toHaveBeenCalledWith(geocodingString, expect.anything());
        expect(mockOnValueChange).toHaveBeenCalledWith({
            target: {
                value: {
                    type: 'Feature' as const,
                    geometry: placeFeature3.geometry,
                    properties: {
                        lastAction: 'findPlace',
                        geocodingQueryString: geocodingString,
                        geocodingResultsData: {
                            formatted_address: placeFeature3.properties.placeData.formatted_address,
                            place_id: placeFeature3.properties.placeData.place_id,
                            types: placeFeature3.properties.placeData.types
                        },
                        isGeocodingImprecise: true // key part!
                    }
                }
            }
        });
        // Select list and confirm button should not be present
        expect(container.querySelector('select')).not.toBeInTheDocument();
        expect(screen.queryByText('ConfirmLocation')).not.toBeInTheDocument();
    });
});
