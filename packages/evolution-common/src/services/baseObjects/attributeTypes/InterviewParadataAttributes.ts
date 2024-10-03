/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { StartEndTimestampable } from './GenericAttributes';

// These come from bowser package:
// TODO: type these (not yet typed in bowser)
export const devices = ['tablet', 'mobile', 'desktop', 'tv', 'bot'] as const;
export type Device = (typeof devices & string)[number]; // add string to allow future devices
export type Browser = {
    _ua?: string; // the user agent raw string
    browser?: {
        name?: string;
        version?: string;
    };
    engine?: {
        name?: 'Gecko' | 'EdgeHTML' | 'Blink' | 'WebKit' | string; // accept future unknown values
        version?: string;
    };
    os?: {
        name?: 'macos' | 'windows' | 'android' | 'ios' | 'chromeos' | 'linux' | string; // accept future unknown values
        version?: string;
        versionName?: string;
    };
    platform?: {
        model?: string;
        type?: Device; // this is the most useful info for respondent behaviour analysis
        vendor?: string;
    };
} & StartEndTimestampable;

export type WidgetMetadata = StartEndTimestampable; // TODO: should we log changed values for each widget, so add a value attribute? (any or anything else?)
export type SectionMetadata = {
    // each time a widget is opened/focused, we add a new WidgetMetadata object with timestamps
    widgets: {
        [key: string]: WidgetMetadata[];
    };
} & StartEndTimestampable;
export type Language = {
    language?: string; // ISO 639-1 two letters language code
} & StartEndTimestampable;


