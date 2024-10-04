/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Result, createErrors, createOk } from '../../../types/Result.type';
import { ParamsValidatorUtils } from '../../../utils/ParamsValidatorUtils';
import { InterviewParadata, InterviewParadataAttributes } from './InterviewParadata';

/**
 * Validate the interview paradata params.
 * @param dirtyParams the json data
 * @param displayName the name of the object for error messages
 * @returns a list of errors if any, or an empty list if the params are valid
 */
export const validateParams = function (
    dirtyParams: { [key: string]: unknown },
    displayName = 'InterviewParadata'
): Error[] {
    const errors: Error[] = [];

    errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
    errors.push(...ParamsValidatorUtils.isObject('params', dirtyParams, displayName));

    // TODO: also check if start/end timestamps are inside the survey period:
    errors.push(...ParamsValidatorUtils.isPositiveInteger('startedAt', dirtyParams.startedAt, displayName));
    errors.push(...ParamsValidatorUtils.isPositiveInteger('updatedAt', dirtyParams.updatedAt, displayName));
    errors.push(...ParamsValidatorUtils.isPositiveInteger('completedAt', dirtyParams.completedAt, displayName));

    errors.push(...ParamsValidatorUtils.isString('source', dirtyParams.source, displayName));
    errors.push(
        ...ParamsValidatorUtils.isArrayOfStrings(
            'personsRandomSequence',
            dirtyParams.personsRandomSequence,
            displayName
        )
    );

    errors.push(...ParamsValidatorUtils.isArray('languages', dirtyParams.languages, displayName));
    if (dirtyParams.languages && Array.isArray(dirtyParams.languages)) {
        for (let i = 0; i < dirtyParams.languages.length; i++) {
            const language = dirtyParams.languages[i];
            errors.push(...ParamsValidatorUtils.isString(`languages.[${i}].language`, language.language, displayName));
            errors.push(
                ...ParamsValidatorUtils.isPositiveInteger(
                    `languages.[${i}].startTimestamp`,
                    language.startTimestamp,
                    displayName
                )
            );
            errors.push(
                ...ParamsValidatorUtils.isPositiveInteger(
                    `languages.[${i}].endTimestamp`,
                    language.endTimestamp,
                    displayName
                )
            );
        }
    }

    errors.push(...ParamsValidatorUtils.isArray('browsers', dirtyParams.browsers, displayName));
    if (dirtyParams.browsers && Array.isArray(dirtyParams.browsers)) {
        for (let i = 0; i < dirtyParams.browsers.length; i++) {
            const browser = dirtyParams.browsers[i];
            errors.push(...ParamsValidatorUtils.isString(`browsers.[${i}].ua`, browser.ua, displayName));
            if (browser.browser) {
                errors.push(
                    ...ParamsValidatorUtils.isString(`browsers.[${i}].browser.name`, browser.browser.name, displayName)
                );
                errors.push(
                    ...ParamsValidatorUtils.isString(
                        `browsers.[${i}].browser.version`,
                        browser.browser.version,
                        displayName
                    )
                );
            }
            if (browser.engine) {
                errors.push(
                    ...ParamsValidatorUtils.isString(`browsers.[${i}].engine.name`, browser.engine.name, displayName)
                );
                errors.push(
                    ...ParamsValidatorUtils.isString(
                        `browsers.[${i}].engine.version`,
                        browser.engine.version,
                        displayName
                    )
                );
            }
            if (browser.os) {
                errors.push(...ParamsValidatorUtils.isString(`browsers.[${i}].os.name`, browser.os.name, displayName));
                errors.push(
                    ...ParamsValidatorUtils.isString(`browsers.[${i}].os.version`, browser.os.version, displayName)
                );
                errors.push(
                    ...ParamsValidatorUtils.isString(
                        `browsers.[${i}].os.versionName`,
                        browser.os.versionName,
                        displayName
                    )
                );
            }
            if (browser.platform) {
                errors.push(
                    ...ParamsValidatorUtils.isString(
                        `browsers.[${i}].platform.model`,
                        browser.platform.model,
                        displayName
                    )
                );
                errors.push(
                    ...ParamsValidatorUtils.isString(
                        `browsers.[${i}].platform.type`,
                        browser.platform.type,
                        displayName
                    )
                );
                errors.push(
                    ...ParamsValidatorUtils.isString(
                        `browsers.[${i}].platform.vendor`,
                        browser.platform.vendor,
                        displayName
                    )
                );
            }
            errors.push(
                ...ParamsValidatorUtils.isPositiveInteger(
                    `browsers.[${i}].startTimestamp`,
                    browser.startTimestamp,
                    displayName
                )
            );
            errors.push(
                ...ParamsValidatorUtils.isPositiveInteger(
                    `browsers.[${i}].endTimestamp`,
                    browser.endTimestamp,
                    displayName
                )
            );
        }
    }

    errors.push(...ParamsValidatorUtils.isObject('sections', dirtyParams.sections, displayName));
    if (dirtyParams.sections && Object.keys(dirtyParams.sections).length > 0) {
        for (const sectionShortname in dirtyParams.sections) {
            const sections = dirtyParams.sections?.[sectionShortname] || [];
            errors.push(...ParamsValidatorUtils.isArray(`sections.${sectionShortname}`, sections, displayName));
            if (sections && Array.isArray(sections)) {
                for (let i = 0; i < sections.length; i++) {
                    const section = sections[i];
                    // TODO: check that section shortnames are indeed valid for the survey
                    errors.push(
                        ...ParamsValidatorUtils.isObject(
                            `sections.${sectionShortname}.[${i}].widgets`,
                            section.widgets,
                            displayName
                        )
                    );
                    errors.push(
                        ...ParamsValidatorUtils.isPositiveInteger(
                            `sections.${sectionShortname}.[${i}].startTimestamp`,
                            section.startTimestamp,
                            displayName
                        )
                    );
                    errors.push(
                        ...ParamsValidatorUtils.isPositiveInteger(
                            `sections.${sectionShortname}.[${i}].endTimestamp`,
                            section.endTimestamp,
                            displayName
                        )
                    );
                    for (const widgetShortname in section.widgets as any[]) {
                        const widgets = section.widgets[widgetShortname] || [];
                        errors.push(
                            ...ParamsValidatorUtils.isArray(
                                `sections.${sectionShortname}.[${i}].widgets.${widgetShortname}`,
                                widgets,
                                displayName
                            )
                        );
                        if (widgets && Array.isArray(widgets)) {
                            for (let j = 0; j < widgets.length; j++) {
                                const widget = widgets[j];
                                // TODO: check that widget shortnames/paths? are indeed valid for the survey
                                errors.push(
                                    ...ParamsValidatorUtils.isPositiveInteger(
                                        `sections.${sectionShortname}.[${i}].widgets.${widgetShortname}.[${j}].startTimestamp`,
                                        widget.startTimestamp,
                                        displayName
                                    )
                                );
                                errors.push(
                                    ...ParamsValidatorUtils.isPositiveInteger(
                                        `sections.${sectionShortname}.[${i}].widgets.${widgetShortname}.[${j}].endTimestamp`,
                                        widget.endTimestamp,
                                        displayName
                                    )
                                );
                            }
                        }
                    }
                }
            }
        }
    }
    return errors;
};

/**
 * Create an interview paradata from the params.
 * If any param is invalid, return a list of errors
 * If no error, return the interview paradata object.
 * @param dirtyParams the json data
 * @returns an interview paradata object if the params are valid, or a list of errors otherwise
 */
export const create = function (dirtyParams: { [key: string]: unknown }): Result<InterviewParadata> {
    const errors = validateParams(dirtyParams);
    const interview =
        errors.length === 0 ? new InterviewParadata(dirtyParams as InterviewParadataAttributes) : undefined;
    if (errors.length > 0) {
        return createErrors(errors);
    }
    return createOk(interview as InterviewParadata);
};
