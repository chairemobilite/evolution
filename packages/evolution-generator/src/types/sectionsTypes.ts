/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// Note: This file includes types for all the different sections types used in the evolution-generator


export type SectionName = string | null;
export type WidgetsNames = string[];
// TODO: Add better types for Preload
export type Preload = (
    interview: any,
    startUpdateInterview: any,
    startAddGroupedObjects: any,
    startRemoveGroupedObjects: any,
    callback: any
) => null;

// Config for the section
export type SectionConfig = {
    previousSection: SectionName;
    nextSection: SectionName;
    hiddenInNav?: boolean;
    title?: {
        fr: string;
        en: string;
    };
    menuName?: {
        fr: string;
        en: string;
    };
    parentSection?: string;
    widgets: WidgetsNames;
    groups?: {
        [groupName: string]: {
            showGroupedObjectDeleteButton: (interview: any, path: string) => boolean;
            showGroupedObjectAddButton: (interview: any, path: string) => boolean;
            groupedObjectAddButtonLabel: {
                fr: string;
                en: string;
            };
            addButtonSize: string;
            widgets: string[];
        };
    };
    preload?: Preload;
    enableConditional: ((interview: any) => boolean) | boolean;
    completionConditional: ((interview: any) => boolean) | boolean;
};

// Configs for the sections configs
export type SectionsConfigs = {
    [sectionName: string]: SectionConfig;
};
