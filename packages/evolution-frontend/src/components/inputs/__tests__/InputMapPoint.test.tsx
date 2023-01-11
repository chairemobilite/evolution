/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { mount } from 'enzyme';

import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import InputMapPoint from '../InputMapPoint';
import { geocodeSinglePoint } from '../maps/google/GoogleGeocoder';

// Mock db queries
jest.mock('../maps/google/GoogleGeocoder', () => ({
    geocodeSinglePoint: jest.fn()
}));
const mockedGeocode = geocodeSinglePoint as jest.MockedFunction<typeof geocodeSinglePoint>;

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

const interviewAttributes: UserInterviewAttributes = {
    id: 1,
    uuid: 'arbitrary uuid',
    user_id: 1,
    is_completed: false,
    responses: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        }
    },
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    },
    is_valid: true
};

const baseWidgetConfig = {
    type: 'question' as const,
    twoColumns: true,
    path: 'test.foo',
    containsHtml: true,
    label: {
        fr: `Texte en français`,
        en: `English text`
    },
    inputType: 'mapPoint' as const,
    defaultCenter: { lat: 45, lon: -73 }
};

describe('Render InputMapPoint with various parameters', () => {

    test('Test with minimal parameters', () => {
        const wrapper = TestRenderer.create(
            <InputMapPoint
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={baseWidgetConfig}
                value={undefined}
                inputRef={React.createRef()}
                size='medium'
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
                url: 'path/to/icon'
            },
            maxZoom: 18,
            defaultZoom: 15
        }, baseWidgetConfig);
        const wrapper = TestRenderer.create(
            <InputMapPoint
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={testWidgetConfig}
                value={{ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [-73.1, 45.02]}}}
                inputRef={React.createRef()}
                size='medium'
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
    const geocodingString = '123 foo street';
    const mockOnValueChange = jest.fn();

    const testWidgetConfig = Object.assign({
        geocodingQueryString: jest.fn().mockReturnValue(geocodingString),
        refreshGeocodingLabel: {
            fr: `Geocode`,
            en: `Geocode`
        },
        icon: {
            url: 'path/to/icon'
        },
        maxZoom: 18,
        defaultZoom: 15,
        placesIcon: {
            url: 'path/to/icon'
        },
        updateDefaultValueWhenResponded: true
    }, baseWidgetConfig);

    const geocodedFeature = { 
        type: 'Feature' as const, 
        geometry: { type: 'Point' as const, coordinates: [-73.2, 45.1] },
        properties: { geocodingResultMetadata: { formattedAddress: '123 foo street, Montreal, QC' }, lastAction: 'geocoding', geocodingQueryString: geocodingString }
    };
    

    beforeEach(() => {
        mockedGeocode.mockClear();
        mockOnValueChange.mockClear();
    });

    test('Geocode single result', async () => {
    
        const mapPointWidget = mount(<InputMapPoint
            id={testId}
            onValueChange={mockOnValueChange}
            widgetConfig={testWidgetConfig}
            value={{ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [-73.1, 45.02]}}}
            inputRef={React.createRef()}
            size='medium'
            interview={interviewAttributes}
            user={userAttributes}
            path='foo.test'
        />);

        // Find and click on the Geocode button, to return multiple values
        mockedGeocode.mockResolvedValueOnce(geocodedFeature);
        const geocodeButton = mapPointWidget.find({id: `${testId}_refresh`, type: 'button'});
        expect(geocodeButton.getDOMNode<HTMLButtonElement>().textContent).toBe('Geocode');
        geocodeButton.simulate('click');
        // Let async functions terminate
        await new Promise(process.nextTick);
    
        // The select list should display 4 children (2 places and the 2 extra elements) and should not have a confirm button
        mapPointWidget.update();
        expect(mockedGeocode).toHaveBeenCalledTimes(1);
        expect(mockedGeocode).toHaveBeenCalledWith(geocodingString, expect.anything());
        
        // Make sure the value has not been changed
        expect(mockOnValueChange).toHaveBeenCalledTimes(1);
        expect(mockOnValueChange).toHaveBeenCalledWith({ target: { value: geocodedFeature }});
        
    });

    test('Geocode with undefined', async () => {
    
        const mapPointWidget = mount(<InputMapPoint
            id={testId}
            onValueChange={mockOnValueChange}
            widgetConfig={testWidgetConfig}
            value={{ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [-73.1, 45.02]}}}
            inputRef={React.createRef()}
            size='medium'
            interview={interviewAttributes}
            user={userAttributes}
            path='foo.test'
        />);

        // Find and click on the Geocode button, to return multiple values
        mockedGeocode.mockResolvedValueOnce(undefined);
        const geocodeButton = mapPointWidget.find({id: `${testId}_refresh`, type: 'button'});
        expect(geocodeButton.getDOMNode<HTMLButtonElement>().textContent).toBe('Geocode');
        geocodeButton.simulate('click');
        // Let async functions terminate
        await new Promise(process.nextTick);
    
        // The select list should display 4 children (2 places and the 2 extra elements) and should not have a confirm button
        mapPointWidget.update();
        expect(mockedGeocode).toHaveBeenCalledTimes(1);
        expect(mockedGeocode).toHaveBeenCalledWith(geocodingString, expect.anything());
        
        // Make sure the value has not been changed
        expect(mockOnValueChange).toHaveBeenCalledTimes(1);
        expect(mockOnValueChange).toHaveBeenCalledWith({ target: { value: undefined }});
        
    });

    test('Geocode with rejection', async () => {
    
        const mapPointWidget = mount(<InputMapPoint
            id={testId}
            onValueChange={mockOnValueChange}
            widgetConfig={testWidgetConfig}
            value={{ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [-73.1, 45.02]}}}
            inputRef={React.createRef()}
            size='medium'
            interview={interviewAttributes}
            user={userAttributes}
            path='foo.test'
        />);

        // Find and click on the Geocode button, to return multiple values
        mockedGeocode.mockRejectedValueOnce('error geocoding');
        const geocodeButton = mapPointWidget.find({id: `${testId}_refresh`, type: 'button'});
        expect(geocodeButton.getDOMNode<HTMLButtonElement>().textContent).toBe('Geocode');
        geocodeButton.simulate('click');
        // Let async functions terminate
        await new Promise(process.nextTick);
    
        // The select list should display 4 children (2 places and the 2 extra elements) and should not have a confirm button
        mapPointWidget.update();
        expect(mockedGeocode).toHaveBeenCalledTimes(1);
        expect(mockedGeocode).toHaveBeenCalledWith(geocodingString, expect.anything());
        
        // Make sure the value has not been changed
        expect(mockOnValueChange).toHaveBeenCalledTimes(1);
        expect(mockOnValueChange).toHaveBeenCalledWith({ target: { value: undefined }});
        
    });

});
