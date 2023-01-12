import _set from 'lodash.set';
import sortBy from 'lodash.sortby';
import isEqual from 'lodash.isequal';
import _cloneDeep from 'lodash.clonedeep';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as surveyHelper from '../../utils/helpers';
import applicationConfiguration from '../../config/application.config';
import { checkConditional, checkChoicesConditional } from './Conditional';
import { checkValidations } from './Validation';
import { UserFrontendInterviewAttributes } from '../../services/interviews/interview';
import { SurveySectionGroup } from '../../services/interviews/interview';
import { FrontendUser } from 'chaire-lib-frontend/lib/services/auth/user';

// Data for the survey, with values to update
type CurrentPreparationData = {
    affectedPaths: { [path: string]: boolean };
    valuesByPath: { [path: string]: unknown };
    interview: UserFrontendInterviewAttributes;
    foundOneOpenedModal: boolean;
    needToUpdate: boolean;
    updateKey: boolean;
    user?: FrontendUser;
};

// Data for a specific widget
type WidgetPreparationData = {
    widgets: string[];
    groupsConfig: { [groupName: string]: SurveySectionGroup };
    groupShortname?: string;
    parentPath?: string;
    parentGroupedObject?: any;
};

const prepareGroupedWidgets = (
    data: CurrentPreparationData,
    widgetData: WidgetPreparationData,
    groupConfig: SurveySectionGroup,
    groupShortname: string,
    widgetConfig: any,
    path: string
) => {
    const allGroupedObjects = surveyHelper.getResponse(data.interview, path, {});
    const groupedObjects =
        typeof widgetConfig.filter === 'function'
            ? widgetConfig.filter(data.interview, allGroupedObjects)
            : allGroupedObjects;
    const sortedGroupedObjects = sortBy(Object.values(groupedObjects), ['_sequence']);

    for (let grObj_i = 0, grpObjCount = sortedGroupedObjects.length; grObj_i < grpObjCount; grObj_i++) {
        const groupedObject = sortedGroupedObjects[grObj_i];
        const groupedObjectPath = `${path}.${groupedObject._uuid}`;
        const groupedObjectWidgets = groupConfig.widgets;
        prepareWidget(data, {
            widgets: groupedObjectWidgets,
            groupsConfig: widgetData.groupsConfig,
            groupShortname,
            parentPath: groupedObjectPath,
            parentGroupedObject: groupedObject
        });
    }
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
    const previousStatus = widgetData.groupShortname
        ? data.interview.previousGroups &&
          data.interview.previousGroups[widgetData.groupShortname] &&
          data.interview.previousGroups[widgetData.groupShortname][parentGroupedObjectId]
            ? data.interview.previousGroups[widgetData.groupShortname][parentGroupedObjectId][widgetShortname]
            : undefined
        : data.interview.previousWidgets
            ? data.interview.previousWidgets[widgetShortname]
            : undefined;

    // verify conditional visibility:
    const [isVisible, invisibleValue, customInvisibleValue] = checkConditional(
        widgetConfig.conditional,
        data.interview,
        path,
        customPath
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
        data.affectedPaths['responses.' + path] !== true &&
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
    value = surveyHelper.parseValue(value, widgetConfig.datatype);
    let visibleValueUpdated = false;
    customValue = surveyHelper.parseValue(customValue, widgetConfig.customDatatype);

    let isResponded = value !== undefined || data.affectedPaths['_all'] === true;
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
    // set to undefined if it was invisible before, and becomes visible:
    if (
        isVisible &&
        ((previousStatus && previousStatus.isVisible === false) ||
            value === undefined ||
            (widgetConfig.updateDefaultValueWhenResponded === true && !pointHasMoved))
    ) {
        const defaultValue = surveyHelper.parse(widgetConfig.defaultValue, data.interview, path, data.user);
        if (value !== defaultValue) {
            surveyHelper.setResponse(data.interview, path, defaultValue);
            data.valuesByPath['responses.' + path] = defaultValue;
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
            data.valuesByPath['responses.' + customPath] = customDefaultValue;
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
        data.valuesByPath['responses.' + path] = assignedValue;
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
        data.valuesByPath['responses.' + customPath] = customAssignedValue;
        surveyHelper.devLog('need to update custom path', customPath);
        surveyHelper.devLog('change custom values', [customValue, customAssignedValue]);
        customValue = customAssignedValue;
        data.needToUpdate = true;
    }
    let modalIsOpen = false;
    if (isVisible && widgetConfig.isModal && data.foundOneOpenedModal === false) {
        data.foundOneOpenedModal = true;
        modalIsOpen = true;
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
        if (!(data.affectedPaths['_all'] === true || data.affectedPaths['responses.' + path] === true)) {
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
        modalIsOpen,
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
            (data.updateKey && data.affectedPaths['responses.' + path] === true) || visibleValueUpdated
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

const prepareWidget = function (data: CurrentPreparationData, widgetPrepData: WidgetPreparationData) {
    for (let i = 0, count = widgetPrepData.widgets.length; i < count; i++) {
        const widgetShortname = widgetPrepData.widgets[i];
        const widgetConfig = applicationConfiguration.widgets[widgetShortname];
        if (_isBlank(widgetConfig)) {
            continue;
        }
        const componentType = widgetConfig.type;
        const path =
            componentType === 'group' || componentType === 'question'
                ? widgetPrepData.parentPath && widgetPrepData.parentPath.length > 0
                    ? [widgetPrepData.parentPath, surveyHelper.interpolatePath(data.interview, widgetConfig.path)].join(
                        '.'
                    )
                    : surveyHelper.interpolatePath(data.interview, widgetConfig.path)
                : '';

        if (componentType === 'group') {
            prepareGroupedWidgets(
                data,
                widgetPrepData,
                widgetPrepData.groupsConfig[widgetShortname],
                widgetShortname,
                widgetConfig,
                path
            );
        } else {
            prepareSimpleWidget(data, widgetPrepData, widgetConfig, widgetShortname, path);
        }
    }
};

export const prepareWidgets = function (
    sectionShortname: string,
    interview: UserFrontendInterviewAttributes,
    affectedPaths: { [path: string]: boolean },
    valuesByPath: { [path: string]: unknown },
    updateKey = false,
    user?: FrontendUser
): [UserFrontendInterviewAttributes, { [path: string]: unknown }, boolean, boolean] {
    interview.previousWidgets = _cloneDeep(interview.widgets || {});
    interview.previousGroups = _cloneDeep(interview.groups || {});
    interview.widgets = {};
    interview.groups = {};
    interview.visibleWidgets = [];
    interview.allWidgetsValid = true;

    const sectionConfig = applicationConfiguration.sections[sectionShortname] || {};
    const sectionWidgets = sectionConfig.widgets;
    const groupsConfig = sectionConfig.groups || {};

    if (sectionWidgets === undefined) {
        return [interview, {}, false, false];
    }
    const widgetPrepData = {
        affectedPaths,
        valuesByPath,
        interview,
        foundOneOpenedModal: false,
        needToUpdate: false,
        updateKey,
        user
    };
    prepareWidget(widgetPrepData, {
        widgets: sectionWidgets,
        groupsConfig,
        parentPath: ''
    });

    return [
        widgetPrepData.interview,
        widgetPrepData.valuesByPath,
        widgetPrepData.foundOneOpenedModal,
        widgetPrepData.needToUpdate
    ];
};
