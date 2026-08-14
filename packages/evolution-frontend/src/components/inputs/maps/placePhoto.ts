/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/** Display height of the MapFindPlace info-window photo, in pixels. */
export const PLACE_PHOTO_HEIGHT = 180;

/** Place photo from Places API New (`getURI`) or legacy PlacesService (`getUrl`). */
export type PlacePhotoLike = {
    getURI?: (options?: { maxHeight?: number; maxWidth?: number }) => string;
    getUrl?: (options?: { maxHeight?: number; maxWidth?: number }) => string;
    authorAttributions?: { displayName?: string; uri?: string | null }[];
    html_attributions?: string[];
};

/** Author name plus optional https profile link (Places API New `uri` or legacy `<a href>`). */
export type PlacePhotoAttribution = {
    text: string;
    uri?: string;
};

const attributionText = (value: string | undefined): string => (value ?? '').replace(/<[^>]+>/g, '').trim();

/**
 * True when `value` is an absolute https URL. Used before rendering attribution links.
 * @param value candidate href from AuthorAttribution.uri or legacy html_attributions
 */
export const isHttpsAttributionUri = (value: string | undefined | null): value is string => {
    if (typeof value !== 'string' || value.trim() === '') {
        return false;
    }
    try {
        return new URL(value).protocol === 'https:';
    } catch {
        return false;
    }
};

const attributionFromAuthor = (attribution: {
    displayName?: string;
    uri?: string | null;
}): PlacePhotoAttribution | undefined => {
    const text = attributionText(attribution.displayName);
    if (text === '') {
        return undefined;
    }
    return { text, ...(isHttpsAttributionUri(attribution.uri) ? { uri: attribution.uri } : {}) };
};

/** Read display text and https href from a legacy `html_attributions` fragment. Does not render the HTML. */
const attributionFromHtml = (html: string): PlacePhotoAttribution | undefined => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const text = (tmp.textContent ?? '').trim();
    if (text === '') {
        return undefined;
    }
    const href = tmp.querySelector('a')?.getAttribute('href');
    return { text, ...(isHttpsAttributionUri(href) ? { uri: href } : {}) };
};

/**
 * Image URL for a Google Place photo. The new Places library uses `getURI`;
 * the deprecated PlacesService used `getUrl`. Calling either loads the image
 * and is billed as the Place Photos SKU.
 * @param photo photo object from a Place search or Place Details response
 * @param maxHeight max image height in pixels
 */
export const getPlacePhotoUrl = (
    photo: PlacePhotoLike | undefined,
    maxHeight = PLACE_PHOTO_HEIGHT
): string | undefined => {
    if (photo === undefined) {
        return undefined;
    }
    if (typeof photo.getURI === 'function') {
        return photo.getURI({ maxHeight });
    }
    if (typeof photo.getUrl === 'function') {
        return photo.getUrl({ maxHeight });
    }
    return undefined;
};

/**
 * Every photo attribution that must be shown with the image: all
 * `authorAttributions` (Places API New) and all legacy `html_attributions`.
 * Keeps https profile links from `AuthorAttribution.uri` and `<a href>`.
 * @param photo photo object from a Place search or Place Details response
 * @returns Attributions to render, or an empty array if none
 */
export const getPlacePhotoAttribution = (photo: PlacePhotoLike | undefined): PlacePhotoAttribution[] => {
    if (photo === undefined) {
        return [];
    }
    return [
        ...(photo.authorAttributions ?? []).map(attributionFromAuthor),
        ...(photo.html_attributions ?? []).map(attributionFromHtml)
    ].filter((attribution): attribution is PlacePhotoAttribution => attribution !== undefined);
};

/**
 * Load photos for a place already found by PlacesService.textSearch.
 * Uses Place Details (New) so search ranking is unchanged. Places is already
 * loaded with the map (`libraries: ['places']`). Returns undefined if Google
 * is unavailable or the request fails.
 * @param placeId Google place id from the search result
 */
export const fetchPlacePhotos = async (placeId: string | undefined): Promise<PlacePhotoLike[] | undefined> => {
    if (!placeId || typeof google === 'undefined') {
        return undefined;
    }
    try {
        const place = new google.maps.places.Place({ id: placeId });
        await place.fetchFields({ fields: ['photos'] });
        return place.photos ?? undefined;
    } catch {
        return undefined;
    }
};
