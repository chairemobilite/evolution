/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Rejects a geography confirmed from an imprecise geocoding result.
 * The widget must set `invalidGeocodingResultTypes` so InputMapFindPlace can
 * flag `properties.isGeocodingImprecise` on confirm (`lastAction: 'findPlace'`).
 */
export const getImpreciseGeocodingValidation = (
    geography: {
        properties?: {
            isGeocodingImprecise?: boolean;
            geocodingQueryString?: string;
            lastAction?: string;
        };
    } | null
) => {
    const geocodingTextInput = geography?.properties?.geocodingQueryString;
    return {
        // Only after confirm: candidates can carry isGeocodingImprecise before lastAction is set.
        validation:
            geography?.properties?.lastAction === 'findPlace' && Boolean(geography?.properties?.isGeocodingImprecise),
        errorMessage: {
            text: 'survey:geography.geocodingStringImpreciseError',
            params: { geocodingTextInput: geocodingTextInput || '' }
        }
    };
};
