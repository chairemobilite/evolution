import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';

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
    errorMessage?: string;
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
    previousWidgets?: { [widgetShortname: string]: WidgetStatus };
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

export type SurveySectionGroup = {
    widgets: string[];
};

// TODO Properly type this
export type SurveySection = {
    widgets: string[];
    groups?: {
        [groupName: string]: SurveySectionGroup;
    };
    [key: string]: unknown;
};
export type SurveySections = { [sectionName: string]: SurveySection };
// TODO This type is probably WidgetConfig from '../widgets'. But it is not complete yet and it's to be confirmed
export type SurveyWidgets = { [key: string]: any };