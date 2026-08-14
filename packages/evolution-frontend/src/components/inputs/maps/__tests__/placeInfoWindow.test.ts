/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { createPlaceInfoWindowElement, placeInfoWindowContentFromHtml } from '../placeInfoWindow';

const sampleContent = {
    name: 'Tim Hortons',
    address: '123 Main',
    photoUrl: 'https://example.com/p.jpg',
    photoAttributionPrefix: 'Photo:',
    photoAttributions: [{ text: 'Jane', uri: 'https://example.com/jane' }]
};

describe('createPlaceInfoWindowElement', () => {
    test.each([
        ['photo and attribution', sampleContent],
        ['photo without attribution', { name: 'Tim Hortons', address: '123 Main', photoUrl: 'https://example.com/p.jpg' }],
        ['text only', { name: 'Tim Hortons', address: '123 Main' }],
        [
            'plain-text attribution fallback',
            {
                name: 'Tim Hortons',
                address: '123 Main',
                photoUrl: 'https://example.com/p.jpg',
                photoAttribution: 'Photo: Jane'
            }
        ],
        [
            'mixed linked and plain attributions',
            {
                ...sampleContent,
                photoAttributions: [{ text: 'Jane', uri: 'https://example.com/jane' }, { text: 'John' }]
            }
        ]
    ])('%s', (_title, content) => {
        expect(createPlaceInfoWindowElement(content).outerHTML).toMatchSnapshot();
    });

    test('keeps the text box outside the body so the confirm button can follow the photo', () => {
        const root = createPlaceInfoWindowElement(sampleContent);
        const text = root.querySelector('.map-find-place-info-window-text');
        const body = root.querySelector('.map-find-place-info-window-body');
        expect(body?.contains(text)).toBe(false);
    });

    test('renders only validated https attribution links', () => {
        const root = createPlaceInfoWindowElement({
            ...sampleContent,
            photoAttributions: [
                { text: 'Jane', uri: 'https://example.com/jane' },
                { text: 'Evil', uri: 'javascript:alert(1)' }
            ]
        });
        const links = [...root.querySelectorAll('.map-find-place-info-window-photo-attribution a')];
        expect(links).toHaveLength(1);
        expect(links[0].getAttribute('href')).toBe('https://example.com/jane');
        expect(links[0].textContent).toBe('Jane');
        expect(root.querySelector('.map-find-place-info-window-photo-attribution')?.textContent).toContain('Evil');
    });
});

describe('placeInfoWindowContentFromHtml', () => {
    test('recovers fields from the created element', () => {
        expect(placeInfoWindowContentFromHtml(createPlaceInfoWindowElement(sampleContent).outerHTML)).toEqual({
            ...sampleContent,
            photoAttribution: undefined
        });
    });

    test('recovers fields from flattened stale html', () => {
        expect(
            placeInfoWindowContentFromHtml(`<div>
              <div>Tim Hortons</div>
              <div>123 Main</div>
              <div><img src="https://example.com/p.jpg" /></div>
            </div>`)
        ).toEqual({
            name: 'Tim Hortons',
            address: '123 Main',
            photoUrl: 'https://example.com/p.jpg',
            photoAttributionPrefix: undefined,
            photoAttributions: undefined,
            photoAttribution: undefined
        });
    });
});
