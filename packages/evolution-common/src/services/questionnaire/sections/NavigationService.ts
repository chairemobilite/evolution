/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _isEqual from 'lodash/isEqual';
import _shuffle from 'lodash/shuffle';
import { UserRuntimeInterviewAttributes } from '../types/Data';
import { SurveySections, SectionConfigWithDefaultsBlock } from '../types/SectionConfig';
import { NavigationSection, NavigationState, sectionToUrlPath, TargetSectionResult } from '../types/NavigationTypes';
import { getLastVisitedSection, isIterationContextStarted, isSectionCompleted } from './navigationHelpers';
import { getResponse, parseBoolean } from '../../../utils/helpers';
import { getInterviewablePersonsArray } from '../../odSurvey/helpers';

/**
 * NavigationService handles complex navigation for questionnaires,
 * including repeated blocks of sections and conditional navigation.
 */
export class NavigationService {
    private sections: SurveySections;

    constructor(sections: SurveySections) {
        this.sections = sections;
    }

    private getFirstSection(): string {
        const firstSection = Object.keys(this.sections).find(
            (sectionName) => this.sections[sectionName].previousSection === null
        );
        if (firstSection === undefined) {
            throw new Error('No first section found');
        }
        return firstSection;
    }

    private isSectionEnabled(interview: UserRuntimeInterviewAttributes, section: NavigationSection): boolean {
        const sectionConfig = this.sections[section.sectionShortname];
        if (sectionConfig.enableConditional) {
            return parseBoolean(sectionConfig.enableConditional, interview, section.sectionShortname);
        }
        // By default, the section is enabled if the previous section is completed
        return sectionConfig.previousSection === null
            ? true
            : this.isSectionCompleted(
                interview,
                this.handleIterationContextOnSection(
                    {
                        sectionShortname: sectionConfig.previousSection,
                        iterationContext: section.iterationContext
                    },
                    interview
                )
            );
    }

    private isSectionCompleted(interview: UserRuntimeInterviewAttributes, section: NavigationSection): boolean {
        // TODO Should we check validity of current section widgets? If so, we'd
        // need to make sure to be able to calculate them for sections that were
        // not active. Maybe not...
        const sectionConfig = this.sections[section.sectionShortname];
        // Run the section's `isSectionCompleted` function if it exists
        if (sectionConfig.isSectionCompleted) {
            return sectionConfig.isSectionCompleted(interview, section.iterationContext);
        }
        // Check the default section completion function
        return isSectionCompleted({
            interview,
            sectionName: section.sectionShortname,
            iterationContext: section.iterationContext
        });
    }

    private isSectionSkipped(interview: UserRuntimeInterviewAttributes, section: NavigationSection): boolean {
        const sectionConfig = this.sections[section.sectionShortname];
        // Run the section's `isSectionSkipped` function if it exists
        if (sectionConfig.isSectionSkipped) {
            return sectionConfig.isSectionSkipped(interview, section.iterationContext);
        }
        // By default the section is not skipped
        return false;
    }

    /**
     * Find the first section that shouldn't be skipped in the given direction
     */
    private findFirstNonSkippedSection(
        interview: UserRuntimeInterviewAttributes,
        currentSection: NavigationSection,
        direction: 'forward' | 'backward'
    ): [NavigationSection] | [NavigationSection, Record<string, unknown> | undefined] {
        let navigateToSection = currentSection;

        // visited set to prevent infinite loops.
        const visited = new Set<string>();

        // Check for infinite loop
        while (!visited.has(sectionToUrlPath(navigateToSection))) {
            visited.add(sectionToUrlPath(navigateToSection));

            // Get the next section in the direction
            const sectionConfig = this.sections[navigateToSection.sectionShortname];
            const targetSectionName =
                direction === 'forward' ? sectionConfig.nextSection : sectionConfig.previousSection;

            // If null, keep current section
            if (targetSectionName === null) {
                return [navigateToSection];
            }

            // Get the target section and add the iteration context if necessary
            const targetSection = this.handleIterationContextOnSection(
                { sectionShortname: targetSectionName, iterationContext: navigateToSection.iterationContext },
                interview
            );
            // See if it is possible to go to this section. If not and the
            // direction is forward, return the current section, otherwise
            // continue navigation.
            if (!this.isSectionEnabled(interview, targetSection)) {
                if (direction === 'forward') {
                    // FIXME If direction is 'next' and the section is not enabled, could a section be enabled later? Or we should just return?
                    return [navigateToSection];
                } else {
                    navigateToSection = targetSection;
                    continue;
                }
            }
            const targetSectionConfig = this.sections[targetSection.sectionShortname];

            // If the section is one with a repeated block, get the actual next
            // section from this block
            const maybeGetTargetFromRepeatedBlock = (): [NavigationSection, Record<string, unknown> | undefined] => {
                if (targetSectionConfig.type === 'repeatedBlock') {
                    return this.getTargetSectionFromRepeatedBlock(
                        interview,
                        navigateToSection,
                        targetSectionConfig,
                        direction
                    );
                }
                return [targetSection, undefined];
            };
            const [targetSectionWithRepeated, updatedValues] = maybeGetTargetFromRepeatedBlock();

            // Determine if the section should be skipped, if so, continue to the next iteration of the loop
            if (this.isSectionSkipped(interview, targetSectionWithRepeated)) {
                navigateToSection = targetSectionWithRepeated;
                continue;
            }

            // Return the section
            return [targetSectionWithRepeated, updatedValues];
        }
        console.error(
            `NavigationService: Infinite loop detected in 'findFirstNonSkippedSection'. Will return current section ${sectionToUrlPath(navigateToSection)}, but it may not be right.`
        );
        return [navigateToSection];
    }

    // Get the list of contexts for the repeated block that will need to be
    // iterated over. The values to update are any randomization values.
    private getIterationContextsForBlock(
        interview: UserRuntimeInterviewAttributes,
        blockSection: SectionConfigWithDefaultsBlock
    ): [string[][], Record<string, unknown> | undefined] {
        const interviewFieldsToUpdate = {};

        // Get the object ids from repeatForObjects
        const getObjects = () => {
            if (blockSection.repeatedBlock.repeatForObjects.type === 'builtin') {
                if (blockSection.repeatedBlock.repeatForObjects.path === 'interviewablePersons') {
                    return getInterviewablePersonsArray({ interview }).map((person) => person._uuid as string);
                }
            } else if (blockSection.repeatedBlock.repeatForObjects.type === 'surveyObjectPath') {
                const surveyObjects = getResponse(
                    interview,
                    blockSection.repeatedBlock.repeatForObjects.path,
                    {}
                ) as Record<string, unknown>;
                return Object.keys(surveyObjects);
            }
            throw new Error(`Unsupported repeatForObjects type: ${blockSection.repeatedBlock.repeatForObjects}`);
        };
        let objectIds = getObjects();

        // See if we need to randomize
        if (blockSection.repeatedBlock.order === 'random') {
            // See if we already have a random order
            const randomOrderPath = `_${blockSection.repeatedBlock.pathPrefix || ''}RandomSequence`;
            const randomOrder = getResponse(interview, randomOrderPath, []) as string[];
            // If the random order is not set or if it is not valid anymore, set it right
            if (
                randomOrder === undefined ||
                randomOrder.length !== objectIds.length ||
                randomOrder.some((id) => !objectIds.includes(id))
            ) {
                objectIds = _shuffle(objectIds);
                interviewFieldsToUpdate[`response.${randomOrderPath}`] = objectIds;
            } else {
                // Otherwise, use the random order
                objectIds.splice(0, objectIds.length - 1, ...randomOrder);
            }
        }

        return [
            objectIds.map((id) =>
                blockSection.repeatedBlock.pathPrefix ? [blockSection.repeatedBlock.pathPrefix, id] : [id]
            ),
            Object.keys(interviewFieldsToUpdate).length === 0 ? undefined : interviewFieldsToUpdate
        ];
    }

    private findTargetSectionInRepeatedBlock(
        interview: UserRuntimeInterviewAttributes,
        repeatedBlockSection: SectionConfigWithDefaultsBlock,
        iterationContext: string[]
    ): string {
        // There are 2 flow of possibilities for the target section of the block
        // 1. If it is the natural flow (the new iteration has not started yet),
        //    then we go to the first section of the block, or skip it if it is
        //    the selection section and the block is configured to skip in
        //    natural flow
        // 2. If not in natural flow, go to the selection section if specified
        //    or to the first one of the block
        const isNaturalFlow = !isIterationContextStarted({ interview, iterationContext });
        const firstBlockSection = repeatedBlockSection.repeatedBlock.sections[0];
        if (isNaturalFlow) {
            if (
                repeatedBlockSection.repeatedBlock.skipSelectionInNaturalFlow &&
                firstBlockSection === repeatedBlockSection.repeatedBlock.selectionSectionId
            ) {
                // Skip the selection section
                return repeatedBlockSection.repeatedBlock.sections[1];
            } else {
                return firstBlockSection;
            }
        } else {
            // If not in natural flow, go to the selection section if specified
            if (repeatedBlockSection.repeatedBlock.selectionSectionId) {
                return repeatedBlockSection.repeatedBlock.selectionSectionId;
            } else {
                return firstBlockSection;
            }
        }
    }

    private deactivateActiveSurveyObject(
        repeatedBlockSection: SectionConfigWithDefaultsBlock,
        valuesByPath: Record<string, unknown> | undefined
    ): Record<string, unknown> {
        return Object.assign(valuesByPath || {}, {
            [`response.${repeatedBlockSection.repeatedBlock.activeSurveyObjectPath}`]: undefined
        });
    }

    private getTargetSectionFromRepeatedBlock(
        interview: UserRuntimeInterviewAttributes,
        originSection: NavigationSection,
        repeatedBlockSection: SectionConfigWithDefaultsBlock,
        direction: string
    ): [NavigationSection, Record<string, unknown> | undefined] {
        // Get the iteration contexts for which the block will be repeated
        const [iterationContexts, updatedValues] = this.getIterationContextsForBlock(interview, repeatedBlockSection);

        // Get the index of the current iteration in the iteration contexts
        const currentIterationIndex = iterationContexts.findIndex((context) =>
            _isEqual(context, originSection.iterationContext)
        );

        // See if we need to get off the block if current iteration is the last
        // and the direction is fioward, or if the iteration is the first and
        // direction is backward.
        if (currentIterationIndex === iterationContexts.length - 1 && direction === 'forward') {
            return [
                { sectionShortname: repeatedBlockSection.nextSection },
                this.deactivateActiveSurveyObject(repeatedBlockSection, updatedValues)
            ];
        } else if (currentIterationIndex === 0 && direction === 'backward' && repeatedBlockSection.previousSection) {
            return [
                { sectionShortname: repeatedBlockSection.previousSection },
                this.deactivateActiveSurveyObject(repeatedBlockSection, updatedValues)
            ];
        }

        // Determine the next object to activate: if there was no previously
        // selected object, take the first, otherwise, take the next one in the
        // direction of the navigation
        const nextIterationIndex =
            currentIterationIndex === -1
                ? 0
                : Math.max(
                    0,
                    Math.min(currentIterationIndex + (direction === 'forward' ? 1 : -1), iterationContexts.length - 1)
                );
        const nextIterationContext = iterationContexts[nextIterationIndex];

        // Go to the target section of the repeated block
        const targetSectionName = this.findTargetSectionInRepeatedBlock(
            interview,
            repeatedBlockSection,
            nextIterationContext
        );

        return [{ sectionShortname: targetSectionName, iterationContext: nextIterationContext }, updatedValues];
    }

    /**
     * Add the iteration context to the target section or remove any previous
     * context if it is not in a repeated block
     * @param interview
     * @param sectionName
     * @param repeatedBlockSectionName
     * @returns
     */
    private goToCurrentIterationContextOrSelect(
        interview: UserRuntimeInterviewAttributes,
        sectionName: string,
        repeatedBlockSectionName: string
    ): NavigationSection {
        const sectionConfig = this.sections[repeatedBlockSectionName];
        if (sectionConfig.type !== 'repeatedBlock') {
            return {
                sectionShortname: sectionName,
                iterationContext: undefined
            };
        }
        const repeatedBlock = sectionConfig.repeatedBlock;
        // Get the current active object in the repeated block
        const activeObjectId = getResponse(interview, repeatedBlock.activeSurveyObjectPath) as string | undefined;

        if (activeObjectId === undefined) {
            return {
                sectionShortname: repeatedBlock.selectionSectionId || repeatedBlockSectionName,
                iterationContext: undefined
            };
        } else {
            return {
                sectionShortname: sectionName,
                iterationContext: [activeObjectId]
            };
        }
    }

    /**
     * Main navigation function to determine the target section in the
     * appropriate direction. If the navigation is not possible in the requested
     * direction, the `TargetSectionResult` object will return the current
     * navigation state.
     *
     * @param {UserRuntimeInterviewAttributes} interview The interview for which
     * to navigate
     * @param {NavigationState} navigationState The current navigation state
     * @param {'next'|'prev'} [direction] The direction to navigate, either
     * 'next' or 'prev'. Defaults to `next`
     * @returns The next section to visit and the updated navigation state
     */
    public navigate(
        interview: UserRuntimeInterviewAttributes,
        navigationState: NavigationState,
        direction: 'forward' | 'backward' = 'forward'
    ): TargetSectionResult {
        // If direction is 'next', validate that the current section is valid and completed. If not, return current section
        if (direction === 'forward') {
            if (!this.isSectionCompleted(interview, navigationState.currentSection)) {
                return {
                    navigationState: navigationState
                };
            }
        }

        // Find the first non-skipped section in the requested direction
        const [targetSection, valuesByPath] = this.findFirstNonSkippedSection(
            interview,
            navigationState.currentSection,
            direction
        );

        // return current state if next section is the same as the current, otherwise, return the new state
        const valuesToUpdate = this.getValuesToUpdate(interview, targetSection);
        return _isEqual(targetSection, navigationState.currentSection)
            ? { navigationState }
            : {
                navigationState: {
                    currentSection: targetSection,
                    navigationHistory: [...navigationState.navigationHistory, navigationState.currentSection]
                },
                valuesByPath:
                      valuesByPath === undefined ? valuesToUpdate : Object.assign(valuesByPath, valuesToUpdate)
            };
    }

    // Add the iteration context to the target section if it is in a repeated
    // block and not set yet, or reversely, remove it if it was set and not in a
    // repeated block section
    handleIterationContextOnSection(targetSection: NavigationSection, interview: UserRuntimeInterviewAttributes) {
        const sectionConfig = this.sections[targetSection.sectionShortname];
        if (
            targetSection.iterationContext === undefined &&
            sectionConfig.type === 'section' &&
            sectionConfig.repeatedBlockSection
        ) {
            return this.goToCurrentIterationContextOrSelect(
                interview,
                targetSection.sectionShortname,
                sectionConfig.repeatedBlockSection
            );
        } else if (
            targetSection.iterationContext !== undefined &&
            sectionConfig.type === 'section' &&
            !sectionConfig.repeatedBlockSection
        ) {
            // Remove the iteration context if it is not in a repeated block
            return { sectionShortname: targetSection.sectionShortname, iterationContext: undefined };
        }
        return targetSection;
    }

    getValuesToUpdate(
        interview: UserRuntimeInterviewAttributes,
        targetSection: NavigationSection
    ): { [key: string]: any } | undefined {
        if (targetSection.iterationContext !== undefined) {
            // Make sure the proper iteration context is set in the interview
            const sectionConfig = this.sections[targetSection.sectionShortname];
            const repeatedBlock =
                sectionConfig.type === 'section' && sectionConfig.repeatedBlockSection
                    ? (this.sections[sectionConfig.repeatedBlockSection] as SectionConfigWithDefaultsBlock)
                        .repeatedBlock
                    : (sectionConfig as any).repeatedBlock;
            if (repeatedBlock) {
                // Get the current active object in the repeated block
                const activeObjectId = getResponse(interview, repeatedBlock.activeSurveyObjectPath) as
                    | string
                    | undefined;

                if (activeObjectId !== targetSection.iterationContext[targetSection.iterationContext.length - 1]) {
                    // Need to update the active object in the interview
                    return {
                        [`response.${repeatedBlock.activeSurveyObjectPath}`]:
                            targetSection.iterationContext[targetSection.iterationContext.length - 1]
                    };
                }
            }
        }
        return undefined;
    }

    /**
     * Go to a specific section or initialize a new navigation state. This can
     * either happen when the page is first loaded to go to the last section, or
     * when the user requests a specific section, for example through the URL or
     * by clicking the navigation menu. In any case, it will not navigate to a
     * section that is not enabled or accessible yet.
     *
     * @param {UserRuntimeInterviewAttributes} interview The interview for which
     * to create the navigation state
     * @param {string} [requestedSection] The section to navigate to. If left
     * blank, it will either navigate to the last visited (or allowed) section
     * or the first one.
     * @param {NavigationState} [navigationState] The current navigation state.
     * It won't be used for the current navigation, but the navigation will be
     * appended to it if set.
     */
    public initNavigationState(
        interview: UserRuntimeInterviewAttributes,
        requestedSection?: string,
        navigationState?: NavigationState
    ): TargetSectionResult {
        const navigationHistory =
            navigationState !== undefined ? [...navigationState.navigationHistory, navigationState.currentSection] : [];

        // Find the target section: either the requested section or last visited
        // section in the interview, or the first one
        const getTargetSection = () => {
            if (requestedSection && this.sections[requestedSection]) {
                return { sectionShortname: requestedSection };
            }
            const lastVisitedSection = getLastVisitedSection({ interview });
            if (lastVisitedSection && this.sections[lastVisitedSection.sectionShortname]) {
                return lastVisitedSection;
            }
            return { sectionShortname: this.getFirstSection() };
        };
        const targetSection = getTargetSection();
        // Find the iteration context for the target section if necessary
        const targetSectionWithContext = this.handleIterationContextOnSection(targetSection, interview);

        // TODO Make sure all the sections prior to the requested one are valid and complete

        // See if it is possible to go to this section. If so, return the section
        if (this.isSectionEnabled(interview, targetSectionWithContext)) {
            return {
                navigationState: {
                    currentSection: targetSectionWithContext,
                    navigationHistory
                },
                valuesByPath: this.getValuesToUpdate(interview, targetSectionWithContext)
            };
        }

        // Otherwise, find the first incomplete section backwards
        const [targetSectionNonSkipped, valuesByPath] = this.findFirstNonSkippedSection(
            interview,
            targetSectionWithContext,
            'backward'
        );

        const valuestoUpdate = this.getValuesToUpdate(interview, targetSectionNonSkipped);
        return {
            navigationState: {
                currentSection: targetSectionNonSkipped,
                navigationHistory
            },
            valuesByPath: valuesByPath === undefined ? valuestoUpdate : Object.assign(valuesByPath, valuestoUpdate)
        };
    }
}

/**
 * Create a navigation service instance from survey sections
 *
 * @param {SurveySections} sections The survey sections description for the current survey
 * @returns {NavigationService} The navigation service instance
 */
export function createNavigationService(sections: SurveySections): NavigationService {
    return new NavigationService(sections);
}
