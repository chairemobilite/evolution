/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// FIXME See if we need to move this declaration to the root of the project to allow other typescript files to use it
declare module '*.svg' {
    const content: any;
    export default content;
}
