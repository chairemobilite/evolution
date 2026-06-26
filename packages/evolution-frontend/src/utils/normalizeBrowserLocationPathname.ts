/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Collapses consecutive `/` in a URL pathname to a single `/`.
 * React Router matches the literal `location.pathname`, so `//segment/...` must be normalized
 * (see https://github.com/chairemobilite/evolution/issues/2).
 *
 * @param pathname - `window.location.pathname` (may include duplicate slashes)
 * @returns Canonical pathname starting with `/` when non-empty
 */
export const collapseConsecutiveSlashesInPathname = (pathname: string): string => {
    const collapsed = pathname.replace(/\/+/g, '/');
    return collapsed === '' ? '/' : collapsed;
};

/**
 * If the current pathname contains duplicate slashes, replaces the browser URL in-place
 * (same origin, search, hash, history state) so React Router sees a path it can match.
 *
 * Call only from browser entry bundles (e.g. admin/participant `index.tsx`). Do not import
 * into Node-only code: `window` is assumed to exist.
 */
export const replaceBrowserPathnameIfNeeded = (): void => {
    const { pathname, search, hash } = window.location;
    const normalized = collapseConsecutiveSlashesInPathname(pathname);
    if (normalized === pathname) {
        return;
    }
    window.history.replaceState(window.history.state, '', `${normalized}${search}${hash}`);
};
