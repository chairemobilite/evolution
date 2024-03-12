// Config for the section
export type SectionConfig = {
    previousSection: string | null;
    nextSection: string | null;
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
    widgets: string[];
    groups?: {
        [key: string]: {
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
    preload?: (
        interview: any,
        startUpdateInterview: any,
        startAddGroupedObjects: any,
        startRemoveGroupedObjects: any,
        callback: any
    ) => null;
    enableConditional: ((interview: any) => boolean) | boolean;
    completionConditional: ((interview: any) => boolean) | boolean;
};

// Configs for the sections configs
export type SectionsConfigs = {
    [key: string]: SectionConfig;
};
