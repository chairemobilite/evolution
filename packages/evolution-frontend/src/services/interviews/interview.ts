import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { WidgetConfig, LangData } from 'evolution-common/lib/services/widgets';

export type WidgetStatus<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
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
    errorMessage?: LangData<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
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
export type FrontendInterviewAttributes<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
    previousWidgets?: {
        [widgetShortname: string]: WidgetStatus<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    };
    previousGroups?: {
        [groupName: string]: {
            [groupId: string]: {
                [widgetShortname: string]: WidgetStatus<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
            };
        };
    };
    // These are widgets statuses for the current section, if they are not grouped
    widgets: { [widgetShortname: string]: WidgetStatus<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> };
    // These are the widget status for the groups in the current section
    groups: {
        [groupName: string]: {
            [groupId: string]: {
                [widgetShortname: string]: WidgetStatus<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
            };
        };
    };
    // Contains the paths in the responses of the visible widgets... FIXME Rename?
    visibleWidgets: string[];
    allWidgetsValid: boolean;
    // Name of the currently loaded section
    sectionLoaded?: string;
};

export type UserFrontendInterviewAttributes<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = FrontendInterviewAttributes<
    Su,
    Ho,
    Pe,
    Pl,
    Ve,
    Vp,
    Tr,
    Se
> &
    UserInterviewAttributes<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;

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
export type SurveyWidgets<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
    [widgetName: string]: WidgetConfig<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
};
