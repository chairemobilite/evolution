/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// Note: This file includes types for all the different sections types used in the evolution-generator

export type SectionName = string | null;
export type WidgetsNames = string[];
export type InterviewPathFunction = (interview: any, path: string) => boolean;
export type Group = {
    showTitle?: boolean;
    showGroupedObjectDeleteButton: InterviewPathFunction | boolean;
    deleteConfirmPopup?: {
        content: {
            fr: ((interview?, path?) => string) | string;
            en: ((interview?, path?) => string) | string;
        };
    };
    showGroupedObjectAddButton: InterviewPathFunction | boolean;
    groupedObjectAddButtonLabel?: {
        fr: ((interview?, path?) => string) | string;
        en: ((interview?, path?) => string) | string;
    };
    addButtonLocation?: 'bottom' | 'both';
    addButtonSize?: string;
    widgets: string[];
};
export type Groups = {
    [groupName: string]: Group;
};
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
    template?: any;
    parentSection?: string;
    widgets: WidgetsNames;
    groups?: Groups;
    preload?: Preload;
    enableConditional: InterviewPathFunction | boolean;
    completionConditional: InterviewPathFunction | boolean;
};

// Configs for the sections configs
export type SectionsConfigs = {
    [sectionName: string]: SectionConfig;
};
