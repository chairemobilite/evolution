/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { WidgetConfig } from 'evolution-common/lib/services/widgets';
import {
    I18nData,
    ParsingFunction,
    StartAddGroupedObjects,
    StartRemoveGroupedObjects,
    StartUpdateInterview
} from 'evolution-common/lib/utils/helpers';

export type WidgetStatus = {
    path: string;
    customPath?: string;
    isVisible: boolean;
    modalIsOpen: boolean;
    isDisabled: boolean;
    isCollapsed: boolean;
    isEmpty: boolean;
    isCustomEmpty: boolean;
    isValid: boolean;
    isResponded: boolean;
    isCustomResponded: boolean;
    errorMessage?: I18nData;
    groupedObjectId?: string;
    value: unknown;
    customValue?: unknown;
    /** Key that should be changed if the widget is updated outside the application workflow, eg. from the server */
    currentUpdateKey: number;
};

/* FIXME This type represents what was in the legacy evolution, with fields that
 evolve throughout the application, they represent state of the local interview
 more than interview attributes. This all should be moved to some class, with
 methods to follow the state of the current interview. */
export type FrontendInterviewAttributes = {
    previousWidgets?: {
        [widgetShortname: string]: WidgetStatus;
    };
    previousGroups?: {
        [groupName: string]: {
            [groupId: string]: {
                [widgetShortname: string]: WidgetStatus;
            };
        };
    };
    // These are widgets statuses for the current section, if they are not grouped
    widgets: { [widgetShortname: string]: WidgetStatus };
    // These are the widget status for the groups in the current section
    groups: {
        [groupName: string]: {
            [groupId: string]: {
                [widgetShortname: string]: WidgetStatus;
            };
        };
    };
    // Contains the paths in the responses of the visible widgets... FIXME Rename?
    visibleWidgets: string[];
    allWidgetsValid: boolean;
    // Name of the currently loaded section
    sectionLoaded?: string;
};

export type UserFrontendInterviewAttributes = FrontendInterviewAttributes & UserInterviewAttributes;

export type SectionPreload = (
    interview: UserInterviewAttributes,
    args: {
        startUpdateInterview: StartUpdateInterview;
        startAddGroupedObjects: StartAddGroupedObjects;
        startRemoveGroupedObjects: StartRemoveGroupedObjects;
        callback: (interview: UserInterviewAttributes) => void;
        user: CliUser;
    }
) => void;

export type SectionConfig = {
    widgets: string[];
    previousSection: string | null;
    nextSection: string | null;
    title?: I18nData;
    menuName?: I18nData;
    preload?: SectionPreload;
    template?: React.ComponentType;
    /**
     * If set, this section is a sub-section of the parent section. It will not
     * be displayed in the section navigation.
     */
    parentSection?: string;
    // FIXME Type this
    customStyle?: any;
    enableConditional?: boolean | ParsingFunction<boolean>;
    completionConditional?: boolean | ParsingFunction<boolean>;
};
export type SurveySections = { [sectionName: string]: SectionConfig };
export type SurveyWidgets = {
    [widgetName: string]: WidgetConfig;
};
