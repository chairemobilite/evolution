/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { mount } from 'enzyme';

import { interviewAttributes } from './interviewData.test';
import InputMapFindPlace from '../InputMapFindPlace';
import { geocodeMultiplePlaces } from '../maps/google/GoogleGeocoder';

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
}

const baseWidgetConfig = {
    type: 'question' as const,
    twoColumns: true,
    path: 'test.foo',
    containsHtml: true,
    label: {
        fr: `Texte en français`,
        en: `English text`
    },
    size: 'medium' as const,
    inputType: 'mapFindPlace' as const,
    defaultCenter: { lat: 45, lon: -73 },
    showPhoto: false
};

describe('Render InputMapPoint with various parameters', () => {

    test('Test with minimal parameters', () => {
        const wrapper = TestRenderer.create(
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
        expect(wrapper).toMatchSnapshot();
    });

    test('Test with all parameters', () => {
            
        const testWidgetConfig = Object.assign({
            geocodingQueryString: jest.fn(),
            refreshGeocodingLabel: {
                fr: `Rafraîchir la carte`,
                en: `Refresh map`
            },
            icon: {
                url: 'path/to/icon',
                size: [80, 80] as [number, number]
            },
            maxZoom: 18,
            defaultZoom: 15,
            coordinatesPrecision: 6,
            placesIcon: {
                url: 'path/to/icon',
                size: [85, 85] as [number, number]
            },
            maxGeocodingResultsBounds: function (interview, path) {
                return [{lat: 45.2229, lng: -74.3230}, {lat: 46.1181, lng: -72.9215}] as [{ lat: number; lng: number; }, { lat: number; lng: number; }];
            },
            updateDefaultValueWhenResponded: true
        }, baseWidgetConfig);
        const wrapper = TestRenderer.create(
            <InputMapFindPlace
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={testWidgetConfig}
                value={{ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [-73.1, 45.02]}}}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(wrapper).toMatchSnapshot();
    });
    
});

describe('Test geocoding requests', () => {
    const testId = 'test';
    const geocodingString = 'foo restaurant';
    const mockOnValueChange = jest.fn();

    const testWidgetConfig = Object.assign({
        geocodingQueryString: jest.fn().mockReturnValue(geocodingString),
        refreshGeocodingLabel: {
            fr: `Geocode`,
            en: `Geocode`
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
        updateDefaultValueWhenResponded: true
    }, baseWidgetConfig);

    const placeFeature1 = { 
        type: 'Feature' as const, 
        geometry: { type: 'Point' as const, coordinates: [-73.2, 45.1] },
        properties: { placeData: { place_id: 2, formatted_address: '123 test street', name: 'Foo extra good restaurant' } }
    };
    const placeFeature2 = {
        type: 'Feature' as const, 
        geometry: { type: 'Point' as const, coordinates: [-73.2, 45.1] },
        properties: { placeData: { place_id: 2, formatted_address: '123 foo street', types: ['street_address'] } }
    };

    beforeEach(() => {
        mockedGeocode.mockClear();
        mockOnValueChange.mockClear();
    });

    test('Geocode with multiple results', async () => {
    
        const findPlaceWidget = mount(<InputMapFindPlace
            id={testId}
            onValueChange={mockOnValueChange}
            widgetConfig={testWidgetConfig}
            value={{ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [-73.1, 45.02]}}}
            inputRef={React.createRef()}
            interview={interviewAttributes}
            user={userAttributes}
            path='foo.test'
            loadingState={0}
        />);

        // Find and click on the Geocode button, to return multiple values
        mockedGeocode.mockResolvedValueOnce([placeFeature1, placeFeature2]);
        const geocodeButton = findPlaceWidget.find({id: `${testId}_refresh`, type: 'button'});
        expect(geocodeButton.getDOMNode<HTMLButtonElement>().textContent).toBe('Geocode');
        geocodeButton.simulate('mousedown');
        geocodeButton.simulate('mouseup');
        // Let async functions terminate
        await new Promise(process.nextTick);
    
        // The select list should display 4 children (2 places and the 2 extra elements) and should not have a confirm button
        findPlaceWidget.update();
        expect(mockedGeocode).toHaveBeenCalledTimes(1);
        expect(mockedGeocode).toHaveBeenCalledWith(geocodingString, expect.anything());
        const selectionList = findPlaceWidget.find(`select`);
        const selectionDomElement = selectionList.getDOMNode<HTMLSelectElement>();
        expect(selectionDomElement.children.length).toEqual(4);
        expect(selectionDomElement.children[1].textContent).toEqual('Foo extra good restaurant (123 test street)');
        expect(selectionDomElement.children[2].textContent).toEqual('123 foo street');
    
        const confirmButton = findPlaceWidget.find({id: `${testId}_confirm`, type: 'button'});
        expect(confirmButton.length).toEqual(0);

        // Make sure the value has not been changed
        expect(mockOnValueChange).not.toHaveBeenCalled();
        
    });

    test('Geocode with single results, and confirm result', async () => {
        
        const findPlaceWidget = mount(<InputMapFindPlace
            id={testId}
            onValueChange={mockOnValueChange}
            widgetConfig={testWidgetConfig}
            value={{ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [-73.1, 45.02]}}}
            inputRef={React.createRef()}
            interview={interviewAttributes}
            user={userAttributes}
            path='foo.test'
            loadingState={0}
        />);
        
        // Find and click on the Geocode button, to return multiple values
        mockedGeocode.mockResolvedValueOnce([placeFeature1]);
        const geocodeButton = findPlaceWidget.find({id: `${testId}_refresh`, type: 'button'});
        expect(geocodeButton.getDOMNode<HTMLButtonElement>().textContent).toBe('Geocode');
        geocodeButton.simulate('mousedown');
        geocodeButton.simulate('mouseup');
        // Let async functions terminate
        await new Promise(process.nextTick);
    
        // The select list should display 3 children (1 place and the 2 extra elements) and the confirm button should be present
        findPlaceWidget.update();
        expect(mockedGeocode).toHaveBeenCalledTimes(1);
        expect(mockedGeocode).toHaveBeenCalledWith(geocodingString, expect.anything());
        const selectionList = findPlaceWidget.find(`select`);
        const selectionDomElement = selectionList.getDOMNode<HTMLSelectElement>();
        expect(selectionDomElement.children.length).toEqual(3);
        expect(selectionDomElement.children[1].textContent).toEqual('Foo extra good restaurant (123 test street)');
    
        // Click on the confirm button and make sure the onValueChanged function has been called
        const confirmButton = findPlaceWidget.find({id: `${testId}_confirm`, type: 'button'});
        expect(confirmButton.length).toEqual(1);
        confirmButton.simulate('click');
        expect(mockOnValueChange).toHaveBeenCalledTimes(1);
        expect(mockOnValueChange).toHaveBeenCalledWith({ target: { value: {
            type: 'Feature' as const,
            geometry: placeFeature1.geometry,
            properties: { lastAction: 'findPlace', geocodingQueryString: geocodingString }
        }}})

        // There should not be any selection or confirm widgets
        findPlaceWidget.update();
        const selectionList2 = findPlaceWidget.find(`select`);
        expect(selectionList2.length).toEqual(0);
        const confirmButton2 = findPlaceWidget.find({id: `${testId}_confirm`, type: 'button'});
        expect(confirmButton2.length).toEqual(0);
        
    });

    test('Geocode with single result, then re-query with undefined results', async () => {
    
        const findPlaceWidget = mount(<InputMapFindPlace
            id={testId}
            onValueChange={mockOnValueChange}
            widgetConfig={testWidgetConfig}
            value={{ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [-73.1, 45.02]}}}
            inputRef={React.createRef()}
            interview={interviewAttributes}
            user={userAttributes}
            path='foo.test'
            loadingState={0}
        />);

        // Find and click on the Geocode button, to return multiple values
        mockedGeocode.mockResolvedValueOnce([placeFeature1]);
        const geocodeButton = findPlaceWidget.find({id: `${testId}_refresh`, type: 'button'});
        expect(geocodeButton.getDOMNode<HTMLButtonElement>().textContent).toBe('Geocode');
        geocodeButton.simulate('mousedown');
        geocodeButton.simulate('mouseup');
        // Let async functions terminate
        await new Promise(process.nextTick);
    
        // Make sure the widget after 1 result are present
        findPlaceWidget.update();
        expect(mockedGeocode).toHaveBeenCalledTimes(1);
        expect(mockedGeocode).toHaveBeenCalledWith(geocodingString, expect.anything());
        const selectionList = findPlaceWidget.find(`select`);
        expect(selectionList.length).toEqual(1);

        const confirmButton = findPlaceWidget.find({id: `${testId}_confirm`, type: 'button'});
        expect(confirmButton.length).toEqual(1);
        
        // Click the geocode button again, but get undefined values
        mockedGeocode.mockResolvedValueOnce(undefined);
        const newGeocodingString = 'other string';
        testWidgetConfig.geocodingQueryString.mockReturnValueOnce(newGeocodingString);
        geocodeButton.simulate('mousedown');
        geocodeButton.simulate('mouseup');
        // Let async functions terminate
        await new Promise(process.nextTick);
    
        // The select list should display 4 children (2 places and the 2 extra elements) and should not have a confirm button
        findPlaceWidget.update();
        expect(mockedGeocode).toHaveBeenCalledTimes(2);
        expect(mockedGeocode).toHaveBeenLastCalledWith(newGeocodingString, expect.anything());
        const selectionList2 = findPlaceWidget.find(`select`);
        expect(selectionList2.length).toEqual(0);
        const confirmButton2 = findPlaceWidget.find({id: `${testId}_confirm`, type: 'button'});
        expect(confirmButton2.length).toEqual(0);
        
    });

    test('Geocode with single result, then re-query with rejection', async () => {
    
        const findPlaceWidget = mount(<InputMapFindPlace
            id={testId}
            onValueChange={mockOnValueChange}
            widgetConfig={testWidgetConfig}
            value={{ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [-73.1, 45.02]}}}
            inputRef={React.createRef()}
            interview={interviewAttributes}
            user={userAttributes}
            path='foo.test'
            loadingState={0}
        />);

        // Find and click on the Geocode button, to return multiple values
        mockedGeocode.mockResolvedValueOnce([placeFeature1]);
        const geocodeButton = findPlaceWidget.find({id: `${testId}_refresh`, type: 'button'});
        expect(geocodeButton.getDOMNode<HTMLButtonElement>().textContent).toBe('Geocode');
        geocodeButton.simulate('mousedown');
        geocodeButton.simulate('mouseup');
        // Let async functions terminate
        await new Promise(process.nextTick);
    
        // Make sure the widget after 1 result are present
        findPlaceWidget.update();
        expect(mockedGeocode).toHaveBeenCalledTimes(1);
        expect(mockedGeocode).toHaveBeenCalledWith(geocodingString, expect.anything());
        const selectionList = findPlaceWidget.find(`select`);
        expect(selectionList.length).toEqual(1);

        const confirmButton = findPlaceWidget.find({id: `${testId}_confirm`, type: 'button'});
        expect(confirmButton.length).toEqual(1);
        
        // Click the geocode button again, but get undefined values
        mockedGeocode.mockRejectedValueOnce('error geocoding');
        const newGeocodingString = 'other string';
        testWidgetConfig.geocodingQueryString.mockReturnValueOnce(newGeocodingString);
        geocodeButton.simulate('mousedown');
        geocodeButton.simulate('mouseup');
        // Let async functions terminate
        await new Promise(process.nextTick);
    
        // The select list should display 4 children (2 places and the 2 extra elements) and should not have a confirm button
        findPlaceWidget.update();
        expect(mockedGeocode).toHaveBeenCalledTimes(2);
        expect(mockedGeocode).toHaveBeenLastCalledWith(newGeocodingString, expect.anything());
        const selectionList2 = findPlaceWidget.find(`select`);
        expect(selectionList2.length).toEqual(0);
        const confirmButton2 = findPlaceWidget.find({id: `${testId}_confirm`, type: 'button'});
        expect(confirmButton2.length).toEqual(0);
        
    });

    test('Click the geocode button, that triggers an update', async () => {
    
        const props = {
            id: testId,
            onValueChange: mockOnValueChange,
            widgetConfig: testWidgetConfig,
            value: { type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [-73.1, 45.02]}},
            inputRef: React.createRef() as React.LegacyRef<HTMLInputElement>,
            size: 'medium' as const,
            interview: interviewAttributes,
            user: userAttributes,
            path: 'foo.test',
            loadingState: 0,
        }

        const findPlaceWidget = mount(<InputMapFindPlace {...props} />);

        // Find and click on the Geocode button, which should trigger an update
        mockedGeocode.mockResolvedValueOnce([placeFeature1]);
        const geocodeButton = findPlaceWidget.find({id: `${testId}_refresh`, type: 'button'});
        expect(geocodeButton.getDOMNode<HTMLButtonElement>().textContent).toBe('Geocode');
        geocodeButton.simulate('mousedown');
        // Update props to simulate update
        findPlaceWidget.setProps({...props, loadingState:1 });
        geocodeButton.simulate('mouseup');
        // Let async functions terminate
        await new Promise(process.nextTick);

        // The geocode function should not have been called
        findPlaceWidget.update();
        expect(mockedGeocode).not.toHaveBeenCalled();

        // Terminate the update, the geocode function should now be called
        findPlaceWidget.setProps({...props, loadingState: 0 });
        // Let async functions terminate
        await new Promise(process.nextTick);

        findPlaceWidget.update();
        expect(mockedGeocode).toHaveBeenCalledTimes(1);
        expect(mockedGeocode).toHaveBeenCalledWith(geocodingString, expect.anything());
        const selectionList = findPlaceWidget.find(`select`);
        expect(selectionList.length).toEqual(1);

        const confirmButton = findPlaceWidget.find({id: `${testId}_confirm`, type: 'button'});
        expect(confirmButton.length).toEqual(1);
        
    });
});
