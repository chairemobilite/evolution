/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { isHttpsAttributionUri, PLACE_PHOTO_HEIGHT, PlacePhotoAttribution } from './placePhoto';

export type PlaceInfoWindowContent = {
    name?: string;
    address?: string;
    photoUrl?: string;
    photoAttributionPrefix?: string;
    photoAttributions?: PlacePhotoAttribution[];
    photoAttribution?: string;
};

const attributionFromAnchor = (anchor: Element): PlacePhotoAttribution | undefined => {
    const text = anchor.textContent?.trim() ?? '';
    if (text === '') {
        return undefined;
    }
    const href = anchor.getAttribute('href');
    return { text, ...(isHttpsAttributionUri(href) ? { uri: href } : {}) };
};

/**
 * Recover name / address / photo / attribution from the HTML string when
 * structured fields were not passed (e.g. stale bundle). Leaf divs are name
 * then address. Attribution uses `.map-find-place-info-window-photo-attribution`.
 */
export const placeInfoWindowContentFromHtml = (html: string): PlaceInfoWindowContent => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const img = tmp.querySelector('img');
    const attribution = tmp.querySelector('.map-find-place-info-window-photo-attribution');
    const leaves = [...tmp.querySelectorAll('div')].filter((el) => el.children.length === 0);
    const photoAttributions = [...(attribution?.querySelectorAll('a') ?? [])]
        .map(attributionFromAnchor)
        .filter((part): part is PlacePhotoAttribution => part !== undefined);
    const prefixNode = attribution?.childNodes[0];
    const photoAttributionPrefix =
        photoAttributions.length > 0 && prefixNode?.nodeType === Node.TEXT_NODE
            ? prefixNode.textContent?.trim() || undefined
            : undefined;
    return {
        name: leaves[0]?.textContent?.trim() || undefined,
        address: leaves[1]?.textContent?.trim() || undefined,
        photoUrl: img?.getAttribute('src') || undefined,
        photoAttributionPrefix,
        photoAttributions: photoAttributions.length > 0 ? photoAttributions : undefined,
        photoAttribution: photoAttributions.length > 0 ? undefined : attribution?.textContent?.trim() || undefined
    };
};

const appendPhotoAttribution = (photo: HTMLElement, content: PlaceInfoWindowContent): void => {
    const attributions = content.photoAttributions ?? [];
    if (attributions.length === 0 && !content.photoAttribution) {
        return;
    }
    const attribution = document.createElement('div');
    attribution.className = 'map-find-place-info-window-photo-attribution';
    if (attributions.length > 0) {
        if (content.photoAttributionPrefix) {
            attribution.append(document.createTextNode(`${content.photoAttributionPrefix} `));
        }
        attributions.forEach((part, index) => {
            if (index > 0) {
                attribution.append(document.createTextNode(', '));
            }
            if (isHttpsAttributionUri(part.uri)) {
                const link = document.createElement('a');
                link.setAttribute('href', new URL(part.uri).href);
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
                link.textContent = part.text;
                attribution.append(link);
            } else {
                attribution.append(document.createTextNode(part.text));
            }
        });
    } else {
        attribution.textContent = content.photoAttribution ?? '';
    }
    photo.appendChild(attribution);
};

/**
 * Build the MapFindPlace info-window DOM.
 * Google `InfoWindow.setContent` takes an `Element` or HTML string, not a
 * React tree, so this stays in createElement. Avoid innerHTML: sanitize
 * unwraps nested divs and layout classes land on the wrong nodes
 * (title-only box, confirm button above the photo).
 * @param content name, address, optional photo and attribution
 */
export const createPlaceInfoWindowElement = (content: PlaceInfoWindowContent): HTMLDivElement => {
    const root = document.createElement('div');
    root.className = 'map-find-place-info-window';

    const text = document.createElement('div');
    text.className = 'map-find-place-info-window-text';
    const name = document.createElement('div');
    name.textContent = content.name ?? '';
    const address = document.createElement('div');
    address.className = '_pale';
    address.textContent = content.address ?? '';
    text.append(name, address);
    root.appendChild(text);

    const body = document.createElement('div');
    body.className = 'map-find-place-info-window-body';
    if (content.photoUrl) {
        const photo = document.createElement('div');
        photo.className = 'map-find-place-info-window-photo';
        const img = document.createElement('img');
        img.src = content.photoUrl;
        img.height = PLACE_PHOTO_HEIGHT;
        photo.appendChild(img);
        appendPhotoAttribution(photo, content);
        body.appendChild(photo);
    }
    root.appendChild(body);
    return root;
};
