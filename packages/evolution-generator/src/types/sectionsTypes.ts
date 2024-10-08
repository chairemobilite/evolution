/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { GroupConfig } from 'evolution-common/lib/services/widgets/WidgetConfig';
import { StartUpdateInterview } from 'evolution-common/lib/utils/helpers';

// Note: This file includes types for all the different sections types used in the evolution-generator

export type SectionName = string | null;
export type WidgetsNames = string[];
export type InterviewPathFunction = (interview: any, path: string) => boolean;
export type Group = GroupConfig;
export type Groups = {
    [groupName: string]: Group;
};
// TODO: Add better types for Preload
export type Preload = (
    interview: any,
    startUpdateInterview: StartUpdateInterview,
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
    // TODO: Find a better type for template
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
