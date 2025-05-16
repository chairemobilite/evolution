/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// Contains types for the questionnaire sections configuration

import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import {
    I18nData,
    ParsingFunction,
    StartAddGroupedObjects,
    StartRemoveGroupedObjects,
    StartUpdateInterview,
    UserInterviewAttributes
} from './Data';
import { WidgetConfig } from './WidgetConfig';

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

export type BuiltinSectionTemplates = 'tripsAndSegmentsWithMap';

/**
 * Configuration for a repeated block of sections
 */
export type RepeatedBlockSectionConfig = {
    /**
     * Identifies the collection of objects to iterate over.
     *
     * FIXME: This type may not be complete, we may want to support a fixed
     * number of iterations, or the kind of iterations where the respondent can
     * dynamically add a new iteration (does not only depend on previous
     * anssers). But it covers the current use cases
     */
    repeatForObjects:
        | {
              /**
               * Iterate over a collection of objects in the interview response. This
               * object collection won't be modified during the repeated block
               * sections, they typically depend on answers in previous sections.
               *
               * FIXME: Add a filter on the objects if required
               */
              type: 'objectPath';
              /**
               * The path in the interview response that contains a key/value element
               * where the keys are the ID of the objects and the values are the
               * objects for which to iterate.
               *
               * eg. 'household.persons'
               */
              path: string;
          }
        | {
              /**
               * Iterate over a collection of objects received from a builtin function
               * in Evolution. Useful for more complex iterations, with additional
               * conditions on the objects, but that are common enough to be part of
               * the Evolution framework.
               */
              type: 'builtin';
              /**
               * The name of the builtin function to call.
               *
               * `interviewablePersons` will iterate over the persons in the household
               * that are of interviewable age.
               */
              path: 'interviewablePersons';
          };

    /**
     * Determines order of iteration through the collection
     * 'sequential', 'random'
     */
    order?: 'sequential' | 'random';

    /**
     * ID of the section that selects the current object for iteration. Should
     * be set if the `skipSelectionInNaturalFlow` is `true`, otherwise it will
     * default to the first listed section.
     */
    selectionSectionId?: string;

    /**
     * Whether to skip the selection section in natural navigation flow.
     * Defaults to `false`
     */
    skipSelectionInNaturalFlow?: boolean;

    /**
     * Path where to store the currently selected object ID
     * e.g., '_activePersonId'
     */
    activeObjectPath: string;

    /**
     * Sections that are part of this repeated block
     */
    sections: string[];
};

export type SectionConfig = {
    /**
     * The title of the section. This will be displayed as the header on the
     * page when this section is active.
     */
    title?: I18nData;
    /**
     * The section to navigate to when the user clicks the "previous" button.
     * If set to null, it is the first section
     */
    previousSection: string | null;
    /**
     * The section to navigate to when the user clicks the "next" button.
     * If set to null, the survey will end.
     */
    nextSection: string | null;
    /**
     * How to display this section in the survey navigation menu, at the top of
     * the survey page. Defaults to `inNav` with `menuName` identical to `title`
     * if the section is a top-level one, or `hiddenInNav` with the section with
     * repeated block as parent if it is part of a block of repeated sections.
     */
    navMenu?:
        | {
              /**
               * Display this section in the survey navigation menu
               */
              type: 'inNav';
              /**
               * The title of the section that will be displayed in the survey
               * navigation menu. It should be short to avoid cluttering the menu, and
               * possibly different from the `title`.
               */
              menuName: I18nData;
          }
        | {
              /**
               * Do not display this section in the navigation menu
               */
              type: 'hidden';
              /**
               * Title of the section that should be set as active in the survey
               * navigation menu when this section is the one active
               */
              parentSection: string;
          };
    /**
     * List of widgets to be displayed in this section.
     */
    widgets: string[];
    /**
     * If set, this function will be executed whenever the section is entered.
     *
     * FIXME: As we are moving towards a config-only section definition, this
     * preload function should be replaced with something that can be defined in
     * config
     */
    preload?: SectionPreload;
    /**
     * The name of the template to use for this section. Surveys should provide
     * a mapping for the frontend between the template name and the actual
     * component it should map to. The builtin templates are already provided by
     * `evolution`, but can be overridden by the survey.
     */
    template?: BuiltinSectionTemplates | string;
    // FIXME Type this
    customStyle?: any;

    /**
     * Whether this section is enabled or not. If `false`, it won't be possible
     * to navigate to this section from the navigation menu.
     *
     * FIXME: As we are moving towards a config-only section definition, this
     * function should be replaced with something that can be defined in config
     */
    enableConditional?: boolean | ParsingFunction<boolean>;

    /**
     * Whether this section is completed or not. If `true`, the section will
     * have a different style in the navigation menu. If the section is not in a
     * menu, this may still be set, as the default behavior of the parent
     * function that is in the navigation menu may call this completion
     * function.
     *
     * FIXME: As we are moving towards a config-only section definition, this
     * function should be replaced with something that can be defined in config
     */
    completionConditional?: boolean | ParsingFunction<boolean>;

    /**
     * If true, this section will be skipped if it has no visible question
     * widgets.  Defaults to `true`.
     *
     * FIXME: Should it exclude the button widgets (ie we could skip also if
     * there is only 1 button widget visible)? And/or auto-click on the button
     * if there is a single button visible?
     */
    skipIfNoVisibleQuestionWidgets?: boolean;

    /**
     * Configuration for a repeated block of sections
     * Only defined for the first section of a repeated block
     */
    repeatedBlock?: RepeatedBlockSectionConfig;
};

/**
 * Survey section configuration type, as should be entered in a survey
 * configuration
 */
export type SurveySectionsConfig = { [sectionName: string]: SectionConfig };

export type SectionConfigWithDefaultsSet = Omit<
    SectionConfig,
    'navMenu' | 'enableConditional' | 'completionConditional'
> & {
    navMenu: Exclude<SectionConfig['navMenu'], undefined>;
    enableConditional: Exclude<SectionConfig['enableConditional'], undefined>;
    completionConditional: Exclude<SectionConfig['completionConditional'], undefined>;
};
/**
 * A survey section configuration type where all unset and default values have
 * been set to avoid having to check for undefined values in the code.
 */
export type SurveySections = { [sectionName: string]: SectionConfigWithDefaultsSet };

export type SurveyWidgets = {
    [widgetName: string]: WidgetConfig;
};
