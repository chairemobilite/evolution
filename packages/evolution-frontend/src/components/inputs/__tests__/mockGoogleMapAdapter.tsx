/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import DOMPurify from 'dompurify';

import type { MapProviderAdapter, MapWidgetProps } from '../maps/types';

/** Shared geocode mock used by the adapter double and by InputMapFindPlace tests. */
export const mockGeocodeMultiplePlaces = jest.fn();

/**
 * Test double for GoogleMapAdapter: renders InfoWindow confirm so both
 * confirm entry points (map popup + below-map button) can be exercised.
 */
const MockInputMap: React.FC<MapWidgetProps> = ({ infoWindow, onMapReady }) => {
    React.useEffect(() => {
        onMapReady?.([0, 0, 0, 0]);
    }, [onMapReady]);

    return (
        <div data-testid="mock-input-map">
            {infoWindow ? (
                <div data-testid="mock-info-window">
                    <div
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(infoWindow.content) }}
                    />
                    {infoWindow.confirmLabel && infoWindow.onConfirm ? (
                        <button
                            type="button"
                            data-testid="mock-info-window-confirm"
                            onClick={infoWindow.onConfirm}
                        >
                            {infoWindow.confirmLabel}
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};

const mockGoogleMapAdapter: MapProviderAdapter = {
    InputMap: MockInputMap,
    InfoMap: () => null,
    geocodeSinglePoint: jest.fn(),
    geocodeMultiplePlaces: mockGeocodeMultiplePlaces
};

export default mockGoogleMapAdapter;
