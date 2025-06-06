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
    StartNavigate,
    StartRemoveGroupedObjects,
    StartUpdateInterview,
    UserInterviewAttributes,
    UserRuntimeInterviewAttributes
} from './Data';
import { WidgetConfig } from './WidgetConfig';

export type SectionPreload = (
    interview: UserInterviewAttributes,
    args: {
        startUpdateInterview: StartUpdateInterview;
        startAddGroupedObjects: StartAddGroupedObjects;
        startRemoveGroupedObjects: StartRemoveGroupedObjects;
        startNavigate: StartNavigate;
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
     * Describes what this block will iterate over.
     *
     * FIXME: This type may not be complete, we may want to support a fixed
     * number of iterations, or the kind of iterations where the respondent can
     * dynamically add a new iteration (does not only depend on previous
     * answers). But it covers the current use cases
     */
    iterationRule:
        | {
              /**
               * Iterate over a collection of objects in the interview response. This
               * object collection won't be modified during the repeated block
               * sections, they typically depend on answers in previous sections.
               *
               * FIXME: Add a filter on the objects if required
               */
              type: 'surveyObjectPath';
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
    activeSurveyObjectPath: string;

    /**
     * Prefix to prepend to the active survey object ID in the iteration
     * context, for more conviviality in the iteration context, to avoid brutal
     * uuids. For example, if the survey object is a person, the path prefix can
     * be 'person' and tne iteration context will be `['person', <uuid of
     * object>]` and the resulting URL would be
     * `/survey/sectionShortname/person/uuid`. If not set, the uuid only will be
     * used as iteration context.
     */
    pathPrefix?: string;

    /**
     * Sections that are part of this repeated block
     */
    sections: string[];

    /**
     * Determine whether a given iteration of the block is valid or not. This
     * function will be used to automatically select an incomplete iteration.
     * The participant may have a non-linear navigation through the iteration. A
     * previous one may be incomplete even if the last one is.
     */
    isIterationValid?: SectionConditionalFunction;
};

type SectionConditionalFunction = (
    interview: UserRuntimeInterviewAttributes,
    iterationContext: string[] | undefined
) => boolean;

type SectionEventFunction = (
    interview: UserRuntimeInterviewAttributes,
    iterationContext: string[] | undefined
) => Record<string, unknown> | undefined;

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
     * @deprecated The preloading catch-all mechanism that can do everything and
     * anything should now be moved to the more appropriate functions in the
     * section config. To initialize stuff at the beginning of a section the
     * `onSectionEntry` and `onSectionExit` functions should be used. For
     * skipping sections or direction navigating to sections according to
     * various conditions, use the `isSectionVisible`, `isSectionCompleted` or,
     * if in a repeated block, the repeated block's `isIterationValid` function.
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
     * to navigate to this section from the navigation menu. By default, a
     * section will be enabled if the previous section is completed.
     *
     * FIXME: As we are moving towards a config-only section definition, this
     * function should be replaced with something that can be defined in config
     */
    enableConditional?: boolean | ParsingFunction<boolean>;

    /**
     * Whether this section and all its iterations should be considered
     * completed or not. If `true`, the section will have a different style in
     * the navigation menu. If the section is not in a menu, this will be ignored
     *
     * FIXME: As we are moving towards a config-only section definition, this
     * function should be replaced with something that can be defined in config
     */
    completionConditional?: boolean | ParsingFunction<boolean>;

    /**
     * Whether this section or a specific iteration of it, if it is part of a
     * repeated block, is completed or not. This function is used during
     * navigation to determine if the next section should be available. If the
     * section should be skipped, use the `isSectionVisible` instead.
     *
     * FIXME: As we are moving towards a config-only section definition, this
     * function should be replaced with something that can be defined in config
     *
     * NOTE: It is purposefully not the same as the `completionConditional` as
     * they are used in different contexts (navigation menu vs actual survey
     * navigation with possible iteration contexts). Both contexts will have
     * different default implementations if not set, so we keep both, but
     * hopefully this one will be deprecated in the future.
     *
     * @param interview The interview object
     * @param iterationContext The current iteration context of the section.
     * Undefined if the section is not part of a repeated block
     * @returns Whether this section is completed or skipped
     */
    isSectionCompleted?: SectionConditionalFunction;

    /**
     * Whether this section should be visible or skipped. If this section should
     * be skipped on some conditions, for example if there are no widgets to
     * show, this function should return `false`. If not set, the section will
     * always be present.
     *
     * FIXME: As we are moving towards a config-only section definition, this
     * function should be replaced with something that can be defined in config
     *
     * FIXME: At first, instead of this function, there was a property called
     * `skipIfNoVisibleQuestionWidgets` that would skip the section if there are
     * no visible question widgets. But currently, to determine if a widget is
     * visible requires calling a redux action in the frontend and it's harder
     * to access from the navigation. When
     * https://github.com/chairemobilite/evolution/issues/858 is implemented, it
     * may be simpler to use a property instead of a function.
     */
    isSectionVisible?: SectionConditionalFunction;

    /**
     * Configuration for a repeated block of sections Only defined for the first
     * section of a repeated block. The other sections of the block are ordinary
     * sections. The last one should point back to the section defining the
     * repeated block. A section with a repeated block should not have any
     * widgets and will not be navigated to. But it can still be seen in the
     * menus to contain its sub-sections or have its enablement and completion
     * conditions set.
     *
     * TODO Support nested repeated blocks, currently, it only works with one
     * repeated block
     */
    repeatedBlock?: RepeatedBlockSectionConfig;

    /**
     * This function will be executed once each time the section is being
     * navigated to, before the widgets are displayed. This is the place to
     * define all side effects of entering the section, such as initializing
     * group objects, pre-setting some answers. It returns the values to update
     * in the interview response.
     *
     * This function, and the `onSectionExit` function are meant to replace the
     * `preload` function of the section. It should not call the update
     * callbacks or anything else, just return the side effects of the section
     * for the current iteration.
     */
    onSectionEntry?: SectionEventFunction;

    /**
     * This function will be executed once each time the section is being
     * navigated away from, before navigating to the next section. This is the
     * place to define all side effects of exiting the section, such as making
     * sure related values in other sections match the ones from the current
     * section (for example household size)
     *
     * This function, and the `onSectionEntry` function are meant to replace the
     * `preload` function of the section. It should not call the update
     * callbacks or anything else, just return the side effects of the section
     * for the current iteration.
     */
    onSectionExit?: SectionEventFunction;
};

/**
 * Survey section configuration type, as should be entered in a survey
 * configuration
 */
export type SurveySectionsConfig = { [sectionName: string]: SectionConfig };

export type SectionConfigWithDefaults = Omit<SectionConfig, 'navMenu' | 'repeatedBlock'> & {
    type: 'section';
    navMenu: Exclude<SectionConfig['navMenu'], undefined>;
    /**
     * If this section is part of a repeated block, this is the section that
     * defines the repeated block.
     */
    repeatedBlockSection?: string;
};

export type SectionConfigWithDefaultsBlock = Omit<SectionConfig, 'navMenu' | 'repeatedBlock' | 'nextSection'> & {
    type: 'repeatedBlock';
    navMenu: Exclude<SectionConfig['navMenu'], undefined>;
    repeatedBlock: Exclude<SectionConfig['repeatedBlock'], undefined>;
    // It should not be possible to terminate a survey on a repeated block,
    // there should at least be a next section with a text
    nextSection: Exclude<SectionConfig['nextSection'], null>;
};

export type SectionConfigWithDefaultsSet = SectionConfigWithDefaults | SectionConfigWithDefaultsBlock;

/**
 * Get the complete SurveySections object from the configuration. This sets the
 * default values of the configuration when not specified so that all values are
 * specific.
 *
 * @param {SurveySectionsConfig} sections The survey sections configuration
 * @returns {SurveySections} The complete SurveySections object
 */
export const getAndValidateSurveySections = (sections: SurveySectionsConfig): SurveySections => {
    // Map the sections that are in a repeated block to the section that define this block
    const sectionsInRepeatedBlock: { [sectionName: string]: string } = {};
    Object.keys(sections).forEach((sectionName) => {
        const sectionConfig = sections[sectionName];
        if (sectionConfig.repeatedBlock) {
            const repeatedSections = sectionConfig.repeatedBlock.sections;
            repeatedSections.forEach((repeatedSectionName) => {
                sectionsInRepeatedBlock[repeatedSectionName] = sectionName;
            });
        }
    });

    const sectionsWithDefaults: SurveySections = {};
    // Make sure the navMenu is defined for each section
    Object.keys(sections).forEach((sectionName) => {
        const sectionConfig = sections[sectionName];
        if (sectionConfig.repeatedBlock !== undefined) {
            if (sectionConfig.nextSection === null) {
                throw new Error(
                    `Section "${sectionName}" cannot have a nextSection set to null when it is a repeated block.`
                );
            }
            sectionsWithDefaults[sectionName] = {
                ...sectionConfig,
                type: 'repeatedBlock',
                nextSection: sectionConfig.nextSection!,
                navMenu: sectionConfig.navMenu ?? { type: 'inNav', menuName: sectionConfig.title ?? '' },
                repeatedBlock: sectionConfig.repeatedBlock
            };
        } else if (sectionsInRepeatedBlock[sectionName]) {
            sectionsWithDefaults[sectionName] = {
                ...sectionConfig,
                type: 'section',
                navMenu: sectionConfig.navMenu ?? {
                    type: 'hidden',
                    parentSection: sectionsInRepeatedBlock[sectionName]
                },
                repeatedBlockSection: sectionsInRepeatedBlock[sectionName]
            };
        } else {
            sectionsWithDefaults[sectionName] = {
                ...sectionConfig,
                type: 'section',
                navMenu: sectionConfig.navMenu ?? { type: 'inNav', menuName: sectionConfig.title ?? '' }
            };
        }
    });

    // Validate each section to make sure every configuration is correct
    Object.entries(sectionsWithDefaults).forEach(([sectionName, sectionConfig]) => {
        // Give warnings if there are undefined sections in the configuration
        if (sectionConfig.previousSection && !sectionsWithDefaults[sectionConfig.previousSection]) {
            throw new Error(
                `Section "${sectionConfig.previousSection}" is referenced in "previousSection" of section "${sectionName}", but it is not defined in the sections config.`
            );
        }
        if (sectionConfig.nextSection && !sectionsWithDefaults[sectionConfig.nextSection]) {
            throw new Error(
                `Section "${sectionConfig.nextSection}" is referenced in "nextSection" of section "${sectionName}", but it is not defined in the sections config.`
            );
        }

        if (sectionConfig.type === 'repeatedBlock') {
            // All repeated sections should exist
            const repeatedSections = sectionConfig.repeatedBlock.sections;
            repeatedSections.forEach((repeatedSectionName) => {
                if (!sectionsWithDefaults[repeatedSectionName]) {
                    throw new Error(
                        `Section "${repeatedSectionName}" is referenced in "repeatedBlock" of section "${sectionName}", but it is not defined in the sections config.`
                    );
                }
            });
            // The selectionSection should exist if specified
            if (sectionConfig.repeatedBlock.selectionSectionId) {
                if (!sectionsWithDefaults[sectionConfig.repeatedBlock.selectionSectionId]) {
                    throw new Error(
                        `Section "${sectionConfig.repeatedBlock.selectionSectionId}" is referenced in "selectionSectionId" of section "${sectionName}", but it is not defined in the sections config.`
                    );
                }
            }
        }
        // Validate that the section in the navMenu exists
        if (sectionConfig.navMenu.type === 'hidden') {
            const parentSection = sectionConfig.navMenu.parentSection;
            if (!sectionsWithDefaults[parentSection]) {
                throw new Error(
                    `Parent section "${parentSection}" is referenced in "navMenu" of section "${sectionName}", but it is not defined in the sections config.`
                );
            } else if (sectionsWithDefaults[parentSection].navMenu.type !== 'inNav') {
                throw new Error(
                    `Parent section "${parentSection}" referenced in "navMenu" of section "${sectionName}" is not visible in the navigation menu.`
                );
            }
        }
    });
    // Make sure there is a first and last section
    const firstSection = Object.keys(sectionsWithDefaults).find(
        (sectionName) => sectionsWithDefaults[sectionName].previousSection === null
    );
    if (!firstSection) {
        throw new Error('No first section defined. Make sure at least one section has "previousSection" set to null.');
    }
    const lastSection = Object.keys(sectionsWithDefaults).find(
        (sectionName) => sectionsWithDefaults[sectionName].nextSection === null
    );
    if (!lastSection) {
        throw new Error('No last section defined. Make sure at least one section has "nextSection" set to null.');
    }
    // FIXME Make further check? Do we have cycles? Are all sections used? are there many first or last sections?
    return sectionsWithDefaults;
};

/**
 * A survey section configuration type where all unset and default values have
 * been set to avoid having to check for undefined values in the code.
 */
export type SurveySections = { [sectionName: string]: SectionConfigWithDefaultsSet };

export type SurveyWidgets = {
    [widgetName: string]: WidgetConfig;
};
