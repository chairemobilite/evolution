/**
 * Get the path in the URL for a given section
 * @param currentPath The current location path of the page
 * @param section The requested section
 * @returns The updated path for the section, or `false` if the path is already correct
 */
export const getPathForSection = (currentPath: string, section: string) => {
    // TODO: This was copy-pasted from the Section component, which was correct,
    // so other components can re-use, but given how it works now, why does the
    // admin require a special treatment?
    if (
        !currentPath.startsWith('/admin') &&
        !currentPath.startsWith('/admin/survey') &&
        !currentPath.endsWith(`/${section}`)
    ) {
        // Change the last part of the path to be the current section
        // TODO Originally, admin routes did not need this. Can they be included in this code path?
        const pathParts = currentPath.split('/');
        // Ignore if it corresponds to the 'survey' path, which would be the first, preceded or not by /
        // TODO Too custom! there must be a better way
        if (
            (!currentPath.startsWith('/') && pathParts.length > 1) ||
            (currentPath.startsWith('/') && pathParts.length > 2)
        ) {
            pathParts.splice(pathParts.length - 1, 1, section);
        } else {
            pathParts.push(section);
        }
        return pathParts.join('/');
    }
    return false;
};
