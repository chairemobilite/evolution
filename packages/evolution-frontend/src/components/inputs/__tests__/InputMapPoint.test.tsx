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
import InputMapPoint from '../InputMapPoint';
import { geocodeSinglePoint } from '../maps/google/GoogleGeocoder';

// Mock react-markdown and remark-gfm as they use syntax not supported by jest;
// these are pulled in transitively by the map provider adapter (via InfoMap).
jest.mock('react-markdown', () => 'Markdown');
jest.mock('remark-gfm', () => 'remark-gfm');

// Mock db queries
jest.mock('../maps/google/GoogleGeocoder', () => ({
    geocodeSinglePoint: jest.fn()
}));
const mockedGeocode = geocodeSinglePoint as jest.MockedFunction<typeof geocodeSinglePoint>;

const userAttributes = {
    id: 1,
    username: 'foo',
    preferences: {},
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
    inputType: 'mapPoint' as const,
    size: 'medium' as const,
    defaultCenter: { lat: 45, lon: -73 }
};

describe('Render InputMapPoint with various parameters', () => {

    test('Test with minimal parameters', () => {
        const { container } = render(
            <InputMapPoint
                id={'test'}
                onValueChange={() => { /* nothing to do */ }}
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
                size: [20, 20] as [number, number]
            },
            maxZoom: 18,
            defaultZoom: 15
        }, baseWidgetConfig);
        const { container } = render(
            <InputMapPoint
                id={'test'}
                onValueChange={() => { /* nothing to do */ }}
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
    const geocodingString = '123 foo street';
    const mockOnValueChange = jest.fn();

    const testWidgetConfig = Object.assign({
        geocodingQueryString: jest.fn().mockReturnValue(geocodingString),
        refreshGeocodingLabel: {
            fr: 'Geocode',
            en: 'Geocode'
        },
        icon: {
            url: 'path/to/icon',
            size: [20, 20] as [number, number]
        },
        maxZoom: 18,
        defaultZoom: 15,
        placesIcon: {
            url: 'path/to/icon',
            size: [60, 60] as [number, number]
        },
        resetToDefaultUnlessUserInteracted: true
    }, baseWidgetConfig);

    const geocodedFeature = {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [-73.2, 45.1] },
        properties: {
            geocodingResultMetadata: { formattedAddress: '123 foo street, Montreal, QC' },
            lastAction: 'geocoding',
            geocodingQueryString: geocodingString
        }
    };

    const renderWidget = () =>
        render(
            <InputMapPoint
                id={testId}
                onValueChange={mockOnValueChange}
                widgetConfig={testWidgetConfig}
                value={{
                    type: 'Feature' as const,
                    properties: {},
                    geometry: { type: 'Point' as const, coordinates: [-73.1, 45.02] }
                }}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path="foo.test"
            />
        );

    beforeEach(() => {
        mockedGeocode.mockClear();
        mockOnValueChange.mockClear();
    });

    // Whatever the geocoding outcome, clicking Geocode forwards a single update
    // call to onValueChange with the matching value (resolved feature or undefined).
    test.each<[string, () => void, GeoJSON.Feature<GeoJSON.Point> | undefined]>([
        ['resolved feature', () => mockedGeocode.mockResolvedValueOnce(geocodedFeature), geocodedFeature],
        ['undefined result', () => mockedGeocode.mockResolvedValueOnce(undefined), undefined],
        ['rejected promise', () => mockedGeocode.mockRejectedValueOnce('error geocoding'), undefined]
    ])('Geocode click with %s triggers a single onValueChange', async (_label, primeMock, expected) => {
        renderWidget();
        const user = userEvent.setup();

        // Find and click on the Geocode button, to return the prepared result (feature, undefined or rejection)
        primeMock();
        await user.click(screen.getByText('Geocode'));

        expect(mockedGeocode).toHaveBeenCalledTimes(1);
        expect(mockedGeocode).toHaveBeenCalledWith(geocodingString, expect.anything());
        // Make sure the value was changed to the expected feature (or undefined on no result / error)
        expect(mockOnValueChange).toHaveBeenCalledTimes(1);
        expect(mockOnValueChange).toHaveBeenCalledWith({ target: { value: expected } });
    });
});
