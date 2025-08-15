/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _set from 'lodash/set';
import sortBy from 'lodash/sortBy';
import isEqual from 'lodash/isEqual';
import _cloneDeep from 'lodash/cloneDeep';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import applicationConfiguration from '../../config/application.config';
import { checkConditional, checkChoicesConditional } from './Conditional';
import { checkValidations } from './Validation';
import {
    isInputTypeWithArrayValue,
    UserRuntimeInterviewAttributes,
    WidgetStatus
} from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { GroupConfig } from 'evolution-common/lib/services/questionnaire/types';

/**
 * Preparation data, for the current survey
 */
type CurrentPreparationData = {
    affectedPaths: { [path: string]: boolean };
    valuesByPath: { [path: string]: unknown };
    interview: UserRuntimeInterviewAttributes;
    needToUpdate: boolean;
    updateKey: boolean;
    user?: CliUser;
};

/**
 * Preparation data, specific for a widget
 */
type WidgetPreparationData = {
    widgets: string[];
    groupShortname?: string;
    parentPath?: string;
    parentGroupedObject?: any;
};

const prepareGroupWidgets = (
    data: CurrentPreparationData,
    widgetConfig: GroupConfig,
    groupShortname: string,
    path: string
) => {
    // FIXME: Type the grouped objects so they are not unknown and contain at least the _uuid and _sequence
    const allGroupedObjects = surveyHelper.getResponse(data.interview, path, {}) as { [objectid: string]: unknown };
    const groupedObjects = (
        typeof widgetConfig.filter === 'function'
            ? widgetConfig.filter(data.interview, allGroupedObjects)
            : allGroupedObjects
    ) as { [objectid: string]: { _uuid: string; _sequence: number } };
    const sortedGroupedObjects = sortBy(Object.values(groupedObjects), ['_sequence']);

    for (let grObj_i = 0, grpObjCount = sortedGroupedObjects.length; grObj_i < grpObjCount; grObj_i++) {
        const groupedObject = sortedGroupedObjects[grObj_i];
        const groupedObjectPath = `${path}.${groupedObject._uuid}`;
        const groupedObjectWidgets = widgetConfig.widgets;
        prepareWidgets(data, {
            widgets: groupedObjectWidgets,
            groupShortname,
            parentPath: groupedObjectPath,
            parentGroupedObject: groupedObject
        });
    }
};

// Get the previous status for a widget
const getPreviousWidgetStatus = (
    interview: UserRuntimeInterviewAttributes,
    widgetShortname: string,
    path: string,
    groupShortname?: string,
    parentGroupedObjectId?: string
): WidgetStatus | undefined => {
    const previousStatusForWidget = groupShortname
        ? parentGroupedObjectId
            ? interview.previousGroups?.[groupShortname]?.[parentGroupedObjectId]?.[widgetShortname]
            : undefined
        : interview.previousWidgets?.[widgetShortname];
    return previousStatusForWidget && previousStatusForWidget.path === path ? previousStatusForWidget : undefined;
};

const prepareSimpleWidget = (
    data: CurrentPreparationData,
    widgetData: WidgetPreparationData,
    widgetConfig: any,
    widgetShortname: string,
    path: string
) => {
    const customPath = widgetConfig.customPath
        ? widgetData.parentPath && widgetData.parentPath.length > 0
            ? [widgetData.parentPath, surveyHelper.interpolatePath(data.interview, widgetConfig.customPath)].join('.')
            : surveyHelper.interpolatePath(data.interview, widgetConfig.customPath)
        : undefined;
    // get previous status:
    const parentGroupedObjectId = widgetData.parentGroupedObject ? widgetData.parentGroupedObject._uuid : undefined;
    const previousStatus = getPreviousWidgetStatus(
        data.interview,
        widgetShortname,
        path,
        widgetData.groupShortname,
        parentGroupedObjectId
    );

    // verify conditional visibility:
    const [isVisible, invisibleValue, customInvisibleValue] = checkConditional(
        widgetConfig.conditional,
        data.interview,
        path,
        data.user
    );
    let assignedValue = invisibleValue;
    const customAssignedValue = customInvisibleValue;

    // verify choices conditional visibility:
    let value = surveyHelper.getResponse(data.interview, path, undefined);
    const [areSelectedChoicesVisible, choiceInvisibleValue] =
        isVisible && widgetConfig.choices
            ? checkChoicesConditional(value, widgetConfig.choices, data.interview, path)
            : [true, undefined];
    if (!areSelectedChoicesVisible) {
        assignedValue = choiceInvisibleValue;
    }

    // bypass if no change possible:
    if (
        previousStatus &&
        data.affectedPaths['_all'] !== true &&
        data.affectedPaths['response.' + path] !== true &&
        previousStatus.isVisible &&
        previousStatus.isVisible === isVisible &&
        undefined === assignedValue &&
        undefined === customAssignedValue &&
        areSelectedChoicesVisible
    ) {
        if (widgetData.groupShortname) {
            _set(
                data.interview,
                `groups.${widgetData.groupShortname}.${parentGroupedObjectId}.${widgetShortname}`,
                previousStatus
            );
        } else {
            data.interview.widgets[widgetShortname] = previousStatus;
        }
        data.interview.visibleWidgets.push(path);
        if (customPath) {
            data.interview.visibleWidgets.push(customPath);
        }
        return;
    }

    let customValue = customPath ? surveyHelper.getResponse(data.interview, customPath, undefined) : undefined;

    // convert values to number or boolean if needed:
    value = surveyHelper.parseValue(value, widgetConfig.datatype, isInputTypeWithArrayValue(widgetConfig.inputType));
    let visibleValueUpdated = false;
    customValue = surveyHelper.parseValue(customValue, widgetConfig.customDatatype);

    let isResponded = value !== undefined || data.affectedPaths['_all'] === true;
    // FIXME Why do we set to true if _all is affected, even if there is no custom value?
    let isCustomResponded = customValue !== undefined || data.affectedPaths['_all'] === true;

    const isMapPoint =
        widgetConfig.inputType === 'mapPoint' ||
        widgetConfig.inputType === 'mapFindPlace' ||
        widgetConfig.inputType === 'mapFindPlacePhotonOsm';
    const pointLastAction = isMapPoint && !_isBlank(value) ? (value as any).properties?.lastAction : undefined;
    const pointHasMoved =
        pointLastAction === 'markerDragged' ||
        pointLastAction === 'mapClicked' ||
        pointLastAction === 'geocoding' ||
        pointLastAction === 'findPlace';
    // set to undefined if it was invisible before, and becomes visible
    //
    // FIXME This `if` includes a lot more cases than the line above explains.
    // Why?  What is the purpose of this exactly? This caused a weird bug where
    // the `isResponded` was reset to false in a case where the value (null) was
    // not the same as the default (undefined) even though the
    // affectedPath['all'] was true and the widget happened to be displayed as
    // valid, even if it was invalid... See
    // https://github.com/chairemobilite/evolution/issues/1130 and the weird
    // commit which solved this single bug, but there's something fishy in this
    // code block
    if (
        isVisible &&
        ((previousStatus && previousStatus.isVisible === false) ||
            value === undefined ||
            (widgetConfig.updateDefaultValueWhenResponded === true && !pointHasMoved))
    ) {
        const defaultValue =
            widgetConfig.useAssignedValueOnHide && !_isBlank(assignedValue)
                ? assignedValue
                : surveyHelper.parse(widgetConfig.defaultValue, data.interview, path, data.user);
        if (value !== defaultValue) {
            surveyHelper.setResponse(data.interview, path, defaultValue);
            data.valuesByPath['response.' + path] = defaultValue;
            value = defaultValue;
            visibleValueUpdated = true;
            isResponded = !_isBlank(defaultValue);
            data.needToUpdate = true;
        }
    }
    if (
        customPath &&
        isVisible &&
        ((previousStatus && previousStatus.isVisible === false) || customValue === undefined)
    ) {
        const customDefaultValue = surveyHelper.parse(widgetConfig.customDefaultValue, data.interview, path, data.user);
        if (customPath && customValue !== customDefaultValue) {
            surveyHelper.setResponse(data.interview, customPath, customDefaultValue);
            data.valuesByPath['response.' + customPath] = customDefaultValue;
            customValue = customDefaultValue;
            visibleValueUpdated = true;
            isCustomResponded = !_isBlank(customDefaultValue);
            data.needToUpdate = true;
        }
    }
    // disable errorMessage on customPath if custom choice is selected but was not before:
    if (
        data.affectedPaths['_all'] !== true &&
        customPath &&
        widgetConfig.customChoice &&
        previousStatus &&
        widgetConfig.customChoice !== previousStatus.value &&
        widgetConfig.customChoice === value
    ) {
        isCustomResponded = false;
        isResponded = false;
    }

    // assign values if conditional fails or if choice conditional changed value:
    if (
        path && // ignore widgets without paths like texts
        (!isVisible || !areSelectedChoicesVisible) &&
        !isEqual(assignedValue, value) &&
        !(assignedValue === null && value === undefined)
    ) {
        surveyHelper.setResponse(data.interview, path, assignedValue);
        data.valuesByPath['response.' + path] = assignedValue;
        surveyHelper.devLog('need to update path', path);
        surveyHelper.devLog('change values', [value, assignedValue]);
        value = assignedValue;
        // Needs to update only if this update was triggered by selected choice visibility change
        visibleValueUpdated = isVisible && !areSelectedChoicesVisible;
        data.needToUpdate = true;
    }

    if (
        !isVisible &&
        customPath &&
        !isEqual(customAssignedValue, customValue) &&
        !(customAssignedValue === null && customValue === undefined)
    ) {
        surveyHelper.setResponse(data.interview, customPath, customAssignedValue);
        data.valuesByPath['response.' + customPath] = customAssignedValue;
        surveyHelper.devLog('need to update custom path', customPath);
        surveyHelper.devLog('change custom values', [customValue, customAssignedValue]);
        customValue = customAssignedValue;
        data.needToUpdate = true;
    }

    const validationCheck = checkValidations(
        widgetConfig.validations,
        value,
        customValue,
        data.interview,
        path,
        customPath
    );
    let isValid = validationCheck[0];
    let errorMessage = validationCheck[1];

    const oldIsValid = surveyHelper.getValidation(data.interview, path);
    if (oldIsValid !== isValid) {
        // If validation status has changed, but this path is not affected by the
        // update, it's an internal value change, the user did not interact with
        // this version of the widget yet, set validation to true
        if (!(data.affectedPaths['_all'] === true || data.affectedPaths['response.' + path] === true)) {
            isValid = true;
            errorMessage = undefined;
        }
        // FIXME Path can be empty if the widget is not a question or group. But in those cases, this function should probably not be called. Confirm this as we type more evolution stuff.
        if (oldIsValid !== isValid && path !== '') {
            surveyHelper.setValidation(data.interview, path, isValid);
            data.valuesByPath['validations.' + path] = isValid;
        }
    }
    if (customPath) {
        const oldIsValidCustom = surveyHelper.getValidation(data.interview, customPath);
        surveyHelper.setValidation(data.interview, customPath, isValid);
        if (oldIsValidCustom !== isValid) {
            data.valuesByPath['validations.' + customPath] = isValid;
        }
    }

    if (!isValid && isVisible) {
        data.interview.allWidgetsValid = false;
    }

    const widgetStatus = {
        path: path,
        customPath: customPath,
        isVisible,
        isDisabled: false, // todo, allow function
        isCollapsed: false, // save collapsed status in db?
        isEmpty: customPath ? _isBlank(value) && _isBlank(customValue) : _isBlank(value),
        isCustomEmpty: _isBlank(customValue),
        isValid,
        isResponded,
        isCustomResponded,
        errorMessage,
        groupedObjectId: parentGroupedObjectId,
        value,
        customValue,
        currentUpdateKey:
            (data.updateKey && data.affectedPaths['response.' + path] === true) || visibleValueUpdated
                ? (previousStatus?.currentUpdateKey || 0) + 1
                : previousStatus?.currentUpdateKey || 0
    };

    if (isVisible) {
        data.interview.visibleWidgets.push(path);
        if (customPath) {
            data.interview.visibleWidgets.push(customPath);
        }
    }

    // Set the widgeStatus to the appropriate object in the interview
    if (widgetData.groupShortname) {
        _set(
            data.interview,
            `groups.${widgetData.groupShortname}.${parentGroupedObjectId}.${widgetShortname}`,
            widgetStatus
        );
    } else {
        data.interview.widgets[widgetShortname] = widgetStatus;
    }
};

const prepareWidgets = function (data: CurrentPreparationData, widgetPrepData: WidgetPreparationData) {
    for (let i = 0, count = widgetPrepData.widgets.length; i < count; i++) {
        const widgetShortname = widgetPrepData.widgets[i];
        const widgetConfig = applicationConfiguration.widgets[widgetShortname];
        if (_isBlank(widgetConfig)) {
            continue;
        }
        const componentType = widgetConfig.type;
        const path =
            typeof widgetConfig.path === 'string'
                ? widgetPrepData.parentPath && widgetPrepData.parentPath.length > 0
                    ? [widgetPrepData.parentPath, surveyHelper.interpolatePath(data.interview, widgetConfig.path)].join(
                        '.'
                    )
                    : surveyHelper.interpolatePath(data.interview, widgetConfig.path)
                : '';

        if (componentType === 'group') {
            prepareGroupWidgets(data, widgetConfig, widgetShortname, path);
        } else {
            prepareSimpleWidget(data, widgetPrepData, widgetConfig, widgetShortname, path);
        }
    }
};

/**
 * Prepare the widgets of the current section of the interview, running the
 * validations and conditionals. This is where the widgets that have
 * side-effects on other will be updated.
 *
 * @param {string} sectionShortname The current section shortname
 * @param {UserRuntimeInterviewAttributes} interview The interview object
 * @param {{ [path: string]: boolean }} affectedPaths All paths affected by the
 * update
 * @param {{ [path: string]: unknown }} valuesByPath The values by path that
 * have changed since the last update. This object will be updated with the new
 * values updated as a side-effect of the update.
 * @param {boolean} [updateKey=false] Whether to update the key of the widget
 * status, used to force a re-render of the widget
 * @param {CliUser} [user] The optional user object
 * @returns An object with the updatedInterview, containing the current runtime
 * data to update the section, the updateValuesByPath, augmenting the original
 * values by path changes with side-effects from the update and the `needUpdate`
 * indicating if the interview needs to be updated.
 *
 * // FIXME Better understand and document the needUpdate boolean return value:
 * what does it mean?
 */
export const prepareSectionWidgets = function (
    sectionShortname: string,
    interview: UserRuntimeInterviewAttributes,
    affectedPaths: { [path: string]: boolean },
    valuesByPath: { [path: string]: unknown },
    updateKey = false,
    user?: CliUser
): {
    updatedInterview: UserRuntimeInterviewAttributes;
    updatedValuesByPath: { [path: string]: unknown };
    needUpdate: boolean;
} {
    interview.previousWidgets = _cloneDeep(interview.widgets || {});
    interview.previousGroups = _cloneDeep(interview.groups || {});
    interview.widgets = {};
    interview.groups = {};
    interview.visibleWidgets = [];
    interview.allWidgetsValid = true;

    if (applicationConfiguration.sections[sectionShortname] === undefined) {
        console.error('prepareSectionWidgets: Section not found:', sectionShortname);
    }
    const sectionConfig = applicationConfiguration.sections[sectionShortname] || {};
    const sectionWidgets = sectionConfig.widgets;

    if (sectionWidgets === undefined) {
        // FIXME Previously this code path was returning empty valuesByPath, but
        // when in the validationOnePager section, there may not be widgets
        // defined, but we want to keep the valuesByPath to update validity or
        // completion.  Why was it returning empty valuesByPath instead of the
        // original? See if it should be `valuesByPath` instead.
        return {
            updatedInterview: interview,
            updatedValuesByPath: sectionShortname === 'validationOnePager' ? valuesByPath : {},
            needUpdate: false
        };
    }
    const widgetPrepData = {
        affectedPaths,
        valuesByPath,
        interview,
        needToUpdate: false,
        updateKey,
        user
    };
    prepareWidgets(widgetPrepData, {
        widgets: sectionWidgets,
        parentPath: ''
    });

    return {
        updatedInterview: widgetPrepData.interview,
        updatedValuesByPath: widgetPrepData.valuesByPath,
        needUpdate: widgetPrepData.needToUpdate
    };
};
