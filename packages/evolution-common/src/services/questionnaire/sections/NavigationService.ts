/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _isEqual from 'lodash/isEqual';
import _shuffle from 'lodash/shuffle';
import _set from 'lodash/set';
import { UserRuntimeInterviewAttributes } from '../types/Data';
import { SurveySections, SectionConfigWithDefaultsBlock, SectionConfigWithDefaultsSet } from '../types/SectionConfig';
import { NavigationSection, sectionToUrlPath, TargetSectionResult } from '../types/NavigationTypes';
import { getLastVisitedSection, isSectionCompleted } from './navigationHelpers';
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

    // Get the first section, the one that has no previous
    private getFirstSection(): string {
        const firstSection = Object.keys(this.sections).find(
            (sectionName) => this.sections[sectionName].previousSection === null
        );
        if (firstSection === undefined) {
            throw new Error('No first section found');
        }
        return firstSection;
    }

    private logAndThrowErrorInSectionFunction({
        section,
        functionName,
        error
    }: {
        section: NavigationSection;
        functionName: string;
        error: unknown;
    }): void {
        const message = `NavigationService: Error evaluating ${functionName} for section ${section.sectionShortname}${section.iterationContext ? ` with iteration ${section.iterationContext.join('/')}` : ''}: ${error}`;
        console.error(message);
        throw new Error(message);
    }

    // Determine if a section is enabled
    private isSectionEnabled({
        interview,
        section
    }: {
        interview: UserRuntimeInterviewAttributes;
        section: NavigationSection;
    }): boolean {
        const sectionConfig = this.sections[section.sectionShortname];
        if (sectionConfig.enableConditional) {
            try {
                return parseBoolean(sectionConfig.enableConditional, interview, section.sectionShortname);
            } catch (error) {
                this.logAndThrowErrorInSectionFunction({ section, functionName: 'enableConditional', error });
            }
        }
        // By default, the section is enabled if the previous section is completed
        return sectionConfig.previousSection === null
            ? true
            : this.isSectionCompleted({
                interview,
                section: this.handleIterationContextOnSection({
                    targetSection: {
                        sectionShortname: sectionConfig.previousSection,
                        iterationContext: section.iterationContext
                    },
                    interview
                })
            });
    }

    private isRepeatedBlockIterationValid({
        interview,
        repeatedBlockSection,
        iterationContext
    }: {
        interview: UserRuntimeInterviewAttributes;
        repeatedBlockSection: SectionConfigWithDefaultsBlock;
        iterationContext: string[];
    }): boolean {
        const isIterationValid = repeatedBlockSection.repeatedBlock.isIterationValid;
        // If there is a `isIterationValid` function, run it to determine if it is valid
        if (typeof isIterationValid === 'function') {
            try {
                return isIterationValid(interview, iterationContext);
            } catch (error) {
                this.logAndThrowErrorInSectionFunction({
                    section: {
                        sectionShortname: repeatedBlockSection.sectionName,
                        iterationContext
                    },
                    functionName: 'isIterationValid',
                    error
                });
            }
        }
        // Otherwise, the iteration is valid if every visible section of the block is completed
        return repeatedBlockSection.repeatedBlock.sections.every(
            (sectionName) =>
                !this.isSectionVisible({ interview, section: { sectionShortname: sectionName, iterationContext } }) ||
                isSectionCompleted({ interview, sectionName, iterationContext })
        );
    }

    private isSectionCompleted({
        interview,
        section
    }: {
        interview: UserRuntimeInterviewAttributes;
        section: NavigationSection;
    }): boolean {
        // TODO Should we check validity of current section widgets? If so, we'd
        // need to make sure to be able to calculate them for sections that were
        // not active. Maybe not...
        const sectionConfig = this.sections[section.sectionShortname];
        // Run the section's `isSectionCompleted` function if it exists
        if (sectionConfig.isSectionCompleted) {
            try {
                return sectionConfig.isSectionCompleted(interview, section.iterationContext);
            } catch (error) {
                this.logAndThrowErrorInSectionFunction({ section, functionName: 'isSectionCompleted', error });
            }
        }
        // If there is no `isSectionCompleted` function, it is considered
        // completed for navigation. Any validation should be done in the
        // section itself.
        return true;
    }

    // Verify that a section is both enabled and visible. Enable and visible are
    // different from the point of view of navigation menu, but they are the
    // same for navigation.
    private isSectionEnabledAndVisible({
        interview,
        section
    }: {
        interview: UserRuntimeInterviewAttributes;
        section: NavigationSection;
    }): boolean {
        if (!this.isSectionEnabled({ interview, section })) {
            return false;
        }
        return this.isSectionVisible({ interview, section });
    }

    // Verify that a section is enabled, but not visible. A section that is
    // enabled, but not visible should be considered as completed from the point
    // of view of navigation and it should be possible to go to the next section
    private isSectionVisible({
        interview,
        section
    }: {
        interview: UserRuntimeInterviewAttributes;
        section: NavigationSection;
    }): boolean {
        const sectionConfig = this.sections[section.sectionShortname];
        // Run the section's `isSectionVisible` function if it exists
        if (sectionConfig.isSectionVisible) {
            try {
                return sectionConfig.isSectionVisible(interview, section.iterationContext);
            } catch (error) {
                this.logAndThrowErrorInSectionFunction({ section, functionName: 'isSectionVisible', error });
            }
        }
        // By default the section is visible
        return true;
    }

    private getNextSectionCandidateFromSection({
        interview,
        section,
        direction
    }: {
        interview: UserRuntimeInterviewAttributes;
        section: NavigationSection;
        direction: 'forward' | 'backward';
    }): string | null {
        const sectionConfig = this.sections[section.sectionShortname];
        if (sectionConfig.type !== 'repeatedBlock' || direction !== 'forward') {
            return direction === 'forward' ? sectionConfig.nextSection : sectionConfig.previousSection;
        }

        // If the section is a repeated block, the possible next section is
        // either the actual next section if the active survey object is not
        // set, or the first section of the block.
        const activeObjectId = getResponse(interview, sectionConfig.repeatedBlock.activeSurveyObjectPath) as
            string | undefined;
        if (activeObjectId !== undefined) {
            return sectionConfig.repeatedBlock.sections[0];
        }

        return sectionConfig.nextSection;
    }

    // Find the first section that shouldn't be skipped in the given direction
    private findFirstNonSkippedSection({
        interview,
        currentSection,
        direction
    }: {
        interview: UserRuntimeInterviewAttributes;
        currentSection: NavigationSection;
        direction: 'forward' | 'backward';
    }): [NavigationSection] | [NavigationSection, Record<string, unknown> | undefined] {
        // Section visited in the current iteration, can be disabled or not visible
        let lastVisitedSection = currentSection;
        // Section to navigate to, must be visible and enabled
        const navigateToSection = currentSection;

        // visited set to prevent infinite loops.
        const visited = new Set<string>();

        // Check for infinite loop
        while (!visited.has(sectionToUrlPath(lastVisitedSection))) {
            visited.add(sectionToUrlPath(lastVisitedSection));

            const targetSectionName = this.getNextSectionCandidateFromSection({
                interview,
                section: lastVisitedSection,
                direction
            });

            // If null, keep current section
            if (targetSectionName === null) {
                return [navigateToSection];
            }

            // Get the target section and add the iteration context if necessary
            const targetSection = this.handleIterationContextOnSection({
                targetSection: {
                    sectionShortname: targetSectionName,
                    iterationContext: lastVisitedSection.iterationContext
                },
                interview
            });
            // See if it is possible to go to this section. If not,
            // continue navigation.
            if (!this.isSectionEnabledAndVisible({ interview, section: targetSection })) {
                lastVisitedSection = targetSection;
                continue;
            }

            const [targetSectionWithRepeated, updatedValues] = this.maybeGetTargetFromRepeatedBlock({
                interview,
                targetSection,
                originSection: lastVisitedSection,
                direction
            });

            // If the target section in repeated block is different from original target section, verify visibility again.
            if (
                !_isEqual(targetSectionWithRepeated, targetSection) &&
                !this.isSectionEnabledAndVisible({ interview, section: targetSectionWithRepeated })
            ) {
                lastVisitedSection = targetSectionWithRepeated;
                continue;
            }

            // Return the section
            return [targetSectionWithRepeated, updatedValues];
        }
        console.error(
            `NavigationService: Infinite loop detected in 'findFirstNonSkippedSection'. Will return current section ${sectionToUrlPath(lastVisitedSection)}, but it may not be right.`
        );
        return [navigateToSection];
    }

    // If the section is one with a repeated block, get the actual next section
    // from this block. Target section is the one who may be a repeated block
    // and origin section is the origin of the navigation. They may not be
    // identical if some sections were skipped in between
    private maybeGetTargetFromRepeatedBlock = ({
        interview,
        targetSection,
        originSection,
        direction
    }: {
        interview: UserRuntimeInterviewAttributes;
        targetSection: NavigationSection;
        originSection: NavigationSection;
        direction: 'forward' | 'backward';
    }): [NavigationSection, Record<string, unknown> | undefined] => {
        const targetSectionConfig = this.sections[targetSection.sectionShortname];
        if (targetSectionConfig.type === 'repeatedBlock') {
            return this.getTargetSectionFromRepeatedBlock({
                interview,
                originSection,
                repeatedBlockSection: targetSectionConfig,
                direction
            });
        }
        return [targetSection, undefined];
    };

    // Get the list of contexts for the repeated block that will need to be
    // iterated over. The values to update are any randomization values.
    private getIterationContextsForBlock({
        interview,
        blockSection
    }: {
        interview: UserRuntimeInterviewAttributes;
        blockSection: SectionConfigWithDefaultsBlock;
    }): [string[][], Record<string, unknown> | undefined] {
        const interviewFieldsToUpdate = {};

        // Get the object ids from repeatForObjects
        const getObjects = () => {
            if (blockSection.repeatedBlock.iterationRule.type === 'builtin') {
                if (blockSection.repeatedBlock.iterationRule.path === 'interviewablePersons') {
                    return getInterviewablePersonsArray({ interview }).map((person) => person._uuid as string);
                }
            } else if (blockSection.repeatedBlock.iterationRule.type === 'surveyObjectPath') {
                const surveyObjects = getResponse(
                    interview,
                    blockSection.repeatedBlock.iterationRule.path,
                    {}
                ) as Record<string, unknown>;
                return Object.keys(surveyObjects);
            }
            throw new Error(`Unsupported repeatForObjects type: ${blockSection.repeatedBlock.iterationRule}`);
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
                // Otherwise, use the random order, don't use the array from the response directly, copy it instead
                objectIds = [...randomOrder];
            }
        }

        return [
            objectIds.map((id) =>
                blockSection.repeatedBlock.pathPrefix ? [blockSection.repeatedBlock.pathPrefix, id] : [id]
            ),
            Object.keys(interviewFieldsToUpdate).length === 0 ? undefined : interviewFieldsToUpdate
        ];
    }

    private findFirstVisibleSectionInRepeatedBlock({
        interview,
        repeatedBlockSection,
        iterationContext,
        startFrom
    }: {
        interview: UserRuntimeInterviewAttributes;
        repeatedBlockSection: SectionConfigWithDefaultsBlock;
        iterationContext: string[];
        startFrom: string;
    }): string {
        // Find the first visible section in the repeated block starting from
        // the given section. If no section is found, return the first one.
        const sections = repeatedBlockSection.repeatedBlock.sections;
        const startIndex = sections.indexOf(startFrom);
        if (startIndex === -1) {
            return startFrom;
        }
        // Check visiblity of the section before returning, as otherwise the
        // initNaviagion will navigate backward, thus out of the block/iteration
        for (let i = startIndex; i < sections.length; i++) {
            const sectionName = sections[i];
            if (
                this.isSectionEnabledAndVisible({
                    interview,
                    section: {
                        sectionShortname: sectionName,
                        iterationContext
                    }
                })
            ) {
                return sectionName;
            }
        }
        // If no visible section found, return the first section, the caller will handle the invisibility depending on the navigation direction.
        return startFrom;
    }

    private findTargetSectionInRepeatedBlock({
        interview,
        repeatedBlockSection,
        iterationContext
    }: {
        interview: UserRuntimeInterviewAttributes;
        repeatedBlockSection: SectionConfigWithDefaultsBlock;
        iterationContext: string[];
    }): string {
        return this.findFirstVisibleSectionInRepeatedBlock({
            interview,
            repeatedBlockSection,
            iterationContext,
            startFrom: repeatedBlockSection.repeatedBlock.sections[0]
        });
    }

    private deactivateActiveSurveyObject({
        repeatedBlockSection,
        valuesByPath
    }: {
        repeatedBlockSection: SectionConfigWithDefaultsBlock;
        valuesByPath: Record<string, unknown> | undefined;
    }): Record<string, unknown> {
        return Object.assign(valuesByPath || {}, {
            [`response.${repeatedBlockSection.repeatedBlock.activeSurveyObjectPath}`]: undefined
        });
    }

    private getTargetSectionFromRepeatedBlock({
        interview,
        originSection,
        repeatedBlockSection,
        direction
    }: {
        interview: UserRuntimeInterviewAttributes;
        originSection: NavigationSection;
        repeatedBlockSection: SectionConfigWithDefaultsBlock;
        direction: 'forward' | 'backward';
    }): [NavigationSection, Record<string, unknown> | undefined] {
        // Get the iteration contexts for which the block will be repeated
        const [iterationContexts, updatedValues] = this.getIterationContextsForBlock({
            interview,
            blockSection: repeatedBlockSection
        });

        if (!repeatedBlockSection.repeatedBlock.skipSelectionInNaturalFlow) {
            return [
                { sectionShortname: repeatedBlockSection.sectionName },
                originSection.iterationContext
                    ? this.deactivateActiveSurveyObject({ repeatedBlockSection, valuesByPath: updatedValues })
                    : updatedValues
            ];
        }

        // Get the index of the current iteration in the iteration contexts
        const currentIterationIndex = iterationContexts.findIndex((context) =>
            _isEqual(context, originSection.iterationContext)
        );

        // See if we need to get off the block if current iteration is the last
        // and the direction is forward, or if the iteration is the first and
        // direction is backward.
        if (direction === 'forward' && currentIterationIndex === iterationContexts.length - 1) {
            return this.findEndOfBlockNextSection({
                interview,
                repeatedBlockSection,
                iterationContexts,
                updatedValues
            });
        } else if (currentIterationIndex === 0 && direction === 'backward' && repeatedBlockSection.previousSection) {
            return [
                { sectionShortname: repeatedBlockSection.previousSection },
                this.deactivateActiveSurveyObject({ repeatedBlockSection, valuesByPath: updatedValues })
            ];
        }

        // Determine the next object to activate: if there was no previously
        // selected object, take the first, otherwise, take the next one in the
        // direction of the navigation
        const enteringFromOutside = currentIterationIndex === -1;
        const nextIterationIndex = enteringFromOutside
            ? 0
            : Math.max(
                0,
                Math.min(currentIterationIndex + (direction === 'forward' ? 1 : -1), iterationContexts.length - 1)
            );
        const nextIterationContext = iterationContexts[nextIterationIndex];

        // There is no next iteration context, we stay in this section
        if (!nextIterationContext) {
            return [
                { sectionShortname: repeatedBlockSection.sectionName },
                originSection.iterationContext
                    ? this.deactivateActiveSurveyObject({ repeatedBlockSection, valuesByPath: updatedValues })
                    : updatedValues
            ];
        }
        // If the next iteration is valid, we don't need to get into it again,
        // unless we are in skipSelectionInNaturalFlow and there is only one
        // iteration Just stay in the main section and let the participant
        // decide where to go
        if (
            this.isRepeatedBlockIterationValid({
                interview,
                repeatedBlockSection,
                iterationContext: nextIterationContext
            }) &&
            !(repeatedBlockSection.repeatedBlock.skipSelectionInNaturalFlow === true && iterationContexts.length === 1)
        ) {
            return [
                { sectionShortname: repeatedBlockSection.sectionName },
                originSection.iterationContext
                    ? this.deactivateActiveSurveyObject({ repeatedBlockSection, valuesByPath: updatedValues })
                    : updatedValues
            ];
        }

        // Go to the target section of the repeated block for the selected iteration
        const targetSectionName = this.findTargetSectionInRepeatedBlock({
            interview,
            repeatedBlockSection,
            iterationContext: nextIterationContext
        });

        return [{ sectionShortname: targetSectionName, iterationContext: nextIterationContext }, updatedValues];
    }

    private findEndOfBlockNextSection({
        interview,
        repeatedBlockSection,
        iterationContexts,
        updatedValues
    }: {
        interview: UserRuntimeInterviewAttributes;
        repeatedBlockSection: SectionConfigWithDefaultsBlock;
        updatedValues: Record<string, unknown> | undefined;
        iterationContexts: string[][];
    }): [NavigationSection, Record<string, unknown> | undefined] {
        // If a non-linear flow left an iteration invalid, let the repeated
        // block section offer the respondent a chance to select it.
        const firstInvalidIteration = iterationContexts.find(
            (context) =>
                !this.isRepeatedBlockIterationValid({
                    interview,
                    repeatedBlockSection,
                    iterationContext: context
                })
        );
        if (firstInvalidIteration) {
            return [
                { sectionShortname: repeatedBlockSection.sectionName },
                this.deactivateActiveSurveyObject({ repeatedBlockSection, valuesByPath: updatedValues })
            ];
        }
        return [
            { sectionShortname: repeatedBlockSection.nextSection },
            this.deactivateActiveSurveyObject({ repeatedBlockSection, valuesByPath: updatedValues })
        ];
    }

    // Add an active iteration context to a child section, or land on its
    // repeated-block section when no object has been selected yet.
    private goToCurrentIterationContextOrSelect({
        interview,
        sectionName,
        repeatedBlockSectionName
    }: {
        interview: UserRuntimeInterviewAttributes;
        sectionName: string;
        repeatedBlockSectionName: string;
    }): NavigationSection {
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
                sectionShortname: repeatedBlockSectionName,
                iterationContext: undefined
            };
        } else {
            return {
                sectionShortname: sectionName,
                iterationContext: repeatedBlock.pathPrefix
                    ? [repeatedBlock.pathPrefix, activeObjectId]
                    : [activeObjectId]
            };
        }
    }

    // Set the section as completed
    private setSectionCompleted({
        interview,
        section
    }: {
        interview: UserRuntimeInterviewAttributes;
        section: NavigationSection;
    }): void {
        // FIXME Not sure this is the place to set this, but since some enable
        // conditional may depend on preceding section's completion status, we
        // need to know that a section is completed. Using _set directly is not
        // the best way, see if we should add a helper for this is we need to
        // set completion of a section more generally. The backend also has
        // similar code. Eventually, when implementing
        // https://github.com/chairemobilite/evolution/issues/969, the section
        // navigation history and completion won't be stored in the responses
        // anymore and we'll have a better way to set it, so we can go for the
        // easy fix for now.
        _set(
            interview,
            `response._sections.${section.sectionShortname}${section.iterationContext ? '.' + section.iterationContext.join('/') : ''}._isCompleted`,
            true
        );
    }

    private _navigate(
        interview: UserRuntimeInterviewAttributes,
        currentSection: NavigationSection,
        direction: 'forward' | 'backward' = 'forward'
    ): TargetSectionResult {
        // Find the first non-skipped section in the requested direction
        const [targetSection, valuesByPath] = this.findFirstNonSkippedSection({
            interview,
            currentSection,
            direction
        });

        // return current state if next section is the same as the current, otherwise, return the new state
        const valuesToUpdate = this.getValuesToUpdate({ interview, targetSection });
        return _isEqual(targetSection, currentSection)
            ? { targetSection: currentSection }
            : {
                targetSection,
                valuesByPath:
                      valuesByPath === undefined ? valuesToUpdate : Object.assign(valuesByPath, valuesToUpdate)
            };
    }

    /**
     * Main navigation function to determine the target section in the
     * appropriate direction. If the navigation is not possible in the requested
     * direction, the `TargetSectionResult` object will return the current
     * navigation state.
     *
     * Note that the navigation service cannot determine if a form content is
     * valid, so if the navigation is called, it means there are no invalid
     * widgets, or navigation can take place. It will use the section's
     * configuration and `isSectionCompleted` and `isSectionVisible` functions
     * to determine respectively completion and visibility of a section.
     *
     * @param {Object} params The parameters for the navigation
     * @param {UserRuntimeInterviewAttributes} params.interview The interview for which
     * to navigate
     * @param {NavigationSection} params.currentSection The current navigation section
     * @param {'forward'|'backward'} [params.direction] The direction to navigate,
     * either 'forward' or 'backward'. Defaults to `forward`
     * @returns The next section to visit and the updated navigation state
     */
    public navigate({
        interview,
        currentSection,
        direction = 'forward'
    }: {
        interview: UserRuntimeInterviewAttributes;
        currentSection: NavigationSection;
        direction?: 'forward' | 'backward';
    }): TargetSectionResult {
        // If direction is 'forward', validate that the current section is valid and completed. If not, return current section
        if (direction === 'forward') {
            if (!this.isSectionCompleted({ interview, section: currentSection })) {
                return {
                    targetSection: currentSection
                };
            } else {
                this.setSectionCompleted({ interview, section: currentSection });
            }
        }

        return this.handleSectionEntryExit({
            interview,
            targetSection: this._navigate(interview, currentSection, direction),
            previousSection: currentSection
        });
    }

    // Add the iteration context to the target section if it is in a repeated
    // block and not set yet, or reversely, remove it if it was set and not in a
    // repeated block section
    private handleIterationContextOnSection({
        targetSection,
        interview
    }: {
        targetSection: NavigationSection;
        interview: UserRuntimeInterviewAttributes;
    }) {
        const sectionConfig = this.sections[targetSection.sectionShortname];
        if (
            targetSection.iterationContext === undefined &&
            sectionConfig.type === 'section' &&
            sectionConfig.repeatedBlockSection
        ) {
            return this.goToCurrentIterationContextOrSelect({
                interview,
                sectionName: targetSection.sectionShortname,
                repeatedBlockSectionName: sectionConfig.repeatedBlockSection
            });
        } else if (
            targetSection.iterationContext !== undefined &&
            ((sectionConfig.type === 'section' && !sectionConfig.repeatedBlockSection) ||
                sectionConfig.type === 'repeatedBlock')
        ) {
            // Remove the iteration context if it is not in a repeated block
            return { sectionShortname: targetSection.sectionShortname, iterationContext: undefined };
        }
        return targetSection;
    }

    // Add the section entry and exit functions side effect to the target result
    private handleSectionEntryExit({
        interview,
        targetSection,
        previousSection
    }: {
        interview: UserRuntimeInterviewAttributes;
        targetSection: TargetSectionResult;
        previousSection?: NavigationSection;
    }): TargetSectionResult {
        // Execute the `onSectionExit` of the previous section
        const previousSectionConfig = previousSection ? this.sections[previousSection.sectionShortname] : undefined;
        const wrapSectionExit = (previousSectionConfig: SectionConfigWithDefaultsSet) => {
            try {
                return previousSectionConfig.onSectionExit!(interview, previousSection?.iterationContext);
            } catch (error) {
                this.logAndThrowErrorInSectionFunction({
                    section: previousSection!,
                    functionName: 'onSectionExit',
                    error
                });
            }
        };
        const sectionExitValues =
            previousSectionConfig && previousSectionConfig.onSectionExit
                ? wrapSectionExit(previousSectionConfig)
                : undefined;

        // Execute the `onSectionEntry` of the target section
        const sectionConfig = this.sections[targetSection.targetSection.sectionShortname];
        const wrapSectionEntry = (sectionConfig: SectionConfigWithDefaultsSet) => {
            try {
                return sectionConfig.onSectionEntry!(interview, targetSection.targetSection.iterationContext);
            } catch (error) {
                this.logAndThrowErrorInSectionFunction({
                    section: targetSection.targetSection,
                    functionName: 'onSectionEntry',
                    error
                });
            }
        };
        const sectionEntryValues = sectionConfig.onSectionEntry ? wrapSectionEntry(sectionConfig) : undefined;

        // Merge the values from both section entry and exit functions with the valuesByPath of targetSection
        const updatedValues = Object.assign({}, targetSection.valuesByPath, sectionExitValues, sectionEntryValues);
        return {
            targetSection: targetSection.targetSection,
            valuesByPath: Object.keys(updatedValues).length > 0 ? updatedValues : undefined
        };
    }

    private getValuesToUpdate({
        interview,
        targetSection
    }: {
        interview: UserRuntimeInterviewAttributes;
        targetSection: NavigationSection;
    }): { [key: string]: any } | undefined {
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
                    string | undefined;

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

    private _initNavigationState({
        interview,
        requestedSection
    }: {
        interview: UserRuntimeInterviewAttributes;
        requestedSection?: string;
    }): TargetSectionResult {
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
        const targetSectionWithContext = this.handleIterationContextOnSection({ targetSection, interview });

        // TODO Make sure all the sections prior to the requested one are valid and complete

        // See if it is possible to go to this section. If so, return the section
        if (this.isSectionEnabledAndVisible({ interview, section: targetSectionWithContext })) {
            const [targetSectionWithRepeated, updatedValues] = this.maybeGetTargetFromRepeatedBlock({
                interview,
                targetSection: targetSectionWithContext,
                originSection: targetSectionWithContext,
                direction: 'forward'
            });
            if (
                _isEqual(targetSectionWithRepeated, targetSectionWithContext) ||
                this.isSectionEnabledAndVisible({ interview, section: targetSectionWithRepeated })
            ) {
                const finalUpdatedValues = this.getValuesToUpdate({
                    interview,
                    targetSection: targetSectionWithRepeated
                });
                return {
                    targetSection: targetSectionWithRepeated,
                    valuesByPath:
                        updatedValues === undefined
                            ? finalUpdatedValues
                            : Object.assign({}, finalUpdatedValues, updatedValues)
                };
            }
        }

        // Otherwise, find the first incomplete section backwards
        const [targetSectionNonSkipped, valuesByPath] = this.findFirstNonSkippedSection({
            interview,
            currentSection: targetSectionWithContext,
            direction: 'backward'
        });

        const valuestoUpdate = this.getValuesToUpdate({ interview, targetSection: targetSectionNonSkipped });
        return {
            targetSection: targetSectionNonSkipped,
            valuesByPath: valuesByPath === undefined ? valuestoUpdate : Object.assign(valuesByPath, valuestoUpdate)
        };
    }

    /**
     * Go to a specific section or initialize a new navigation state. This can
     * either happen when the page is first loaded to go to the last section, or
     * when the user requests a specific section, for example through the URL or
     * by clicking the navigation menu. In any case, it will not navigate to a
     * section that is not enabled or accessible yet.
     *
     * @param {Object} params The parameters for the navigation state
     * @param {UserRuntimeInterviewAttributes} params.interview The interview for which
     * to create the navigation state
     * @param {string} [params.requestedSection] The section to navigate to. If left
     * blank, it will either navigate to the last visited (or allowed) section
     * or the first one.
     * @param {NavigationSection} [params.currentSection] The current section, if any.
     */
    public initNavigationState({
        interview,
        requestedSection,
        currentSection
    }: {
        interview: UserRuntimeInterviewAttributes;
        requestedSection?: string;
        currentSection?: NavigationSection;
    }): TargetSectionResult {
        return this.handleSectionEntryExit({
            interview,
            targetSection: this._initNavigationState({ interview, requestedSection }),
            previousSection: currentSection
        });
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
