/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { fetchPlacePhotos, getPlacePhotoAttribution, getPlacePhotoUrl } from '../placePhoto';

describe('getPlacePhotoUrl', () => {
    test.each([
        ['getURI', { getURI: () => 'https://example.com/uri.jpg' }, 'https://example.com/uri.jpg'],
        ['getUrl fallback', { getUrl: () => 'https://example.com/url.jpg' }, 'https://example.com/url.jpg'],
        ['prefers getURI', { getURI: () => 'https://example.com/uri.jpg', getUrl: () => 'https://example.com/url.jpg' }, 'https://example.com/uri.jpg'],
        ['missing photo', undefined, undefined],
        ['no url methods', {}, undefined]
    ])('%s', (_title, photo, expected) => {
        expect(getPlacePhotoUrl(photo)).toBe(expected);
    });
});

describe('getPlacePhotoAttribution', () => {
    test.each([
        ['single authorAttribution', { authorAttributions: [{ displayName: 'Jane' }] }, [{ text: 'Jane' }]],
        [
            'authorAttribution uri',
            { authorAttributions: [{ displayName: 'Jane', uri: 'https://maps.google.com/jane' }] },
            [{ text: 'Jane', uri: 'https://maps.google.com/jane' }]
        ],
        [
            'every authorAttribution',
            { authorAttributions: [{ displayName: 'Jane' }, { displayName: 'John' }] },
            [{ text: 'Jane' }, { text: 'John' }]
        ],
        [
            'legacy html_attributions link',
            { html_attributions: ['<a href="https://example.com">Jane</a>'] },
            [{ text: 'Jane', uri: 'https://example.com' }]
        ],
        ['every html_attribution', { html_attributions: ['Jane', 'John'] }, [{ text: 'Jane' }, { text: 'John' }]],
        [
            'both sources',
            { authorAttributions: [{ displayName: 'Jane' }], html_attributions: ['John'] },
            [{ text: 'Jane' }, { text: 'John' }]
        ],
        [
            'rejects non-https author uri',
            { authorAttributions: [{ displayName: 'Jane', uri: 'http://example.com' }] },
            [{ text: 'Jane' }]
        ],
        [
            'rejects javascript html href',
            { html_attributions: ['<a href="javascript:alert(1)">Jane</a>'] },
            [{ text: 'Jane' }]
        ],
        ['skips empty names', { authorAttributions: [{ displayName: '' }, { displayName: 'Jane' }] }, [{ text: 'Jane' }]],
        ['no attributions', {}, []],
        ['undefined photo', undefined, []]
    ])('%s', (_title, photo, expected) => {
        expect(getPlacePhotoAttribution(photo)).toEqual(expected);
    });
});

describe('fetchPlacePhotos', () => {
    const originalGoogle = (globalThis as { google?: unknown }).google;

    afterEach(() => {
        (globalThis as { google?: unknown }).google = originalGoogle;
    });

    test.each([
        ['undefined place id', undefined],
        ['empty place id', '']
    ])('returns undefined for %s', async (_title, placeId) => {
        expect(await fetchPlacePhotos(placeId)).toBeUndefined();
    });

    test('returns photos from Place.fetchFields', async () => {
        const photos = [{ getURI: () => 'https://example.com/uri.jpg' }];
        const fetchFields = jest.fn().mockResolvedValue(undefined);
        (globalThis as { google: unknown }).google = {
            maps: {
                places: {
                    Place: class {
                        photos = photos;
                        fetchFields = fetchFields;
                    }
                }
            }
        };
        await expect(fetchPlacePhotos('abc')).resolves.toBe(photos);
        expect(fetchFields).toHaveBeenCalledWith({ fields: ['photos'] });
    });

    test('returns undefined when Place Details fails', async () => {
        (globalThis as { google: unknown }).google = {
            maps: {
                places: {
                    Place: class {
                        fetchFields = jest.fn().mockRejectedValue(new Error('unavailable'));
                    }
                }
            }
        };
        await expect(fetchPlacePhotos('abc')).resolves.toBeUndefined();
    });
});
