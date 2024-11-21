/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { FunctionComponent } from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons/faPlusCircle';
import _get from 'lodash/get';
import sortBy from 'lodash/sortBy';
import _cloneDeep from 'lodash/cloneDeep';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { devLog, parseBoolean, translateString } from 'evolution-common/lib/utils/helpers';
import { withSurveyContext, WithSurveyContextProps } from '../hoc/WithSurveyContextHoc';
import { checkConditional } from '../../actions/utils/Conditional';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { GroupConfig, InterviewUpdateCallbacks } from 'evolution-common/lib/services/questionnaire/types';
import DeleteGroupedObjectButton from './widgets/DeleteGroupedObjectButton';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InGroupWidget } from './Widget';

type GroupedObjectProps = InterviewUpdateCallbacks & {
    interview: UserRuntimeInterviewAttributes;
    user: CliUser;
    path: string;
    label?: string;
    /** The name of the widget, to be used as key for translations */
    shortname: string;
    section: string;
    widgetConfig: GroupConfig;
    loadingState: number;
    /** Associates a widget shortname with the parent UUID */
    parentObjectIds: { [widgetShortname: string]: string };
    objectId: string;
    sequence: number;
    /** Server-side errors FIXME Maybe they should not be passed by props, they should be better handled */
    errors?: { [path: string]: string };
};

export const BaseGroupedObject: React.FC<GroupedObjectProps & WithTranslation & WithSurveyContextProps> = (props) => {
    const groupedObjectShortname = props.shortname;
    devLog(
        '%c rendering ' + groupedObjectShortname + ' ' + props.objectId,
        'background: rgba(0,255,0,0.1); font-size: 7px;'
    );
    const path = props.path;
    const groupedObjectId = props.objectId;
    const parentObjectIds = props.parentObjectIds;
    parentObjectIds[groupedObjectShortname] = groupedObjectId;
    const widgetsComponents = props.widgetConfig.widgets.map((widgetShortname, idx) => (
        <InGroupWidget
            key={widgetShortname}
            currentWidgetShortname={widgetShortname}
            nextWidgetShortname={props.widgetConfig.widgets[idx + 1]}
            sectionName={groupedObjectShortname}
            interview={props.interview}
            errors={props.errors}
            user={props.user}
            loadingState={props.loadingState}
            pathPrefix={path}
            widgetStatusPath={`groups.${props.shortname}.${groupedObjectId}`}
            groupedObjectId={groupedObjectId}
            parentObjectIds={parentObjectIds}
            startUpdateInterview={props.startUpdateInterview}
            startAddGroupedObjects={props.startAddGroupedObjects}
            startRemoveGroupedObjects={props.startRemoveGroupedObjects}
        />
    ));

    let title = '';
    const localizedName = props.widgetConfig.name;
    if (typeof localizedName === 'function') {
        title = localizedName(props.t, _get(props.interview.responses, path), props.sequence, props.interview, path);
    } else if (typeof localizedName === 'object') {
        title =
            typeof localizedName[props.i18n.language] === 'string'
                ? localizedName[props.i18n.language]
                : (localizedName[props.i18n.language] as any)(
                    _get(props.interview.responses, path),
                    props.sequence,
                    props.interview,
                    path
                );
    } else {
        title = localizedName || '';
    }

    return (
        <div className="survey-group-object">
            <div className="content-container">
                <div className="survey-group-object__content">
                    {!_isBlank(title) && (
                        <h3 className="survey-group-object__title">
                            <Markdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]}>{title}</Markdown>
                        </h3>
                    )}
                    <DeleteGroupedObjectButton
                        interview={props.interview}
                        user={props.user}
                        path={path}
                        widgetConfig={props.widgetConfig}
                        shortname={props.shortname}
                        startRemoveGroupedObjects={props.startRemoveGroupedObjects}
                        startUpdateInterview={props.startUpdateInterview}
                        startAddGroupedObjects={props.startAddGroupedObjects}
                    />
                    {widgetsComponents}
                </div>
            </div>
        </div>
    );
};
export const GroupedObject = withTranslation()(withSurveyContext(BaseGroupedObject));

type GroupProps = InterviewUpdateCallbacks & {
    path: string;
    /** The name of the widget, to be used as key for translations */
    shortname: string;
    customPath?: string;
    interview: UserRuntimeInterviewAttributes;
    user: CliUser;
    widgetConfig: GroupConfig;
    loadingState: number;
    /** Associates a widget shortname with the parent UUID */
    parentObjectIds: { [widgetShortname: string]: string };
    section: string;
    /** Server-side errors FIXME Maybe they should not be passed by props, they should be better handled */
    errors?: { [path: string]: string };
};

const BaseGroup: FunctionComponent<GroupProps & WithTranslation & WithSurveyContextProps> = (props) => {
    const widgetConfig = props.widgetConfig;

    const onAddGroupedObject = (sequence: number) => (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();
        props.startAddGroupedObjects(1, sequence, props.path);
    };

    const groupedObjects = () => {
        const { interview, path } = props;
        if (interview && interview.responses) {
            let groupedObjects = {};
            const allGroupedObjects = _get(interview.responses, path, {});
            if (typeof widgetConfig.filter === 'function') {
                groupedObjects = widgetConfig.filter(interview, allGroupedObjects);
            } else {
                groupedObjects = allGroupedObjects;
            }
            return sortBy(Object.values(groupedObjects), ['_sequence']);
        }
        return [];
    };

    if (
        props.widgetConfig.conditional !== undefined &&
        !checkConditional(
            parseBoolean(props.widgetConfig.conditional, props.interview, props.path),
            props.interview,
            props.path,
            props.customPath
        )[0]
    ) {
        return null;
    }

    const widgetsComponents: JSX.Element[] = [];
    const parentObjectIds = _cloneDeep(props.parentObjectIds) || {};
    // FIXME Type the groupedObject
    groupedObjects().forEach((groupedObject: any, index) => {
        // FIXME What are we doing here exactly? Why?
        parentObjectIds[props.shortname] = groupedObject._uuid;
        const path = `${props.path}.${groupedObject._uuid}`;

        for (const parentGroupShortname in parentObjectIds) {
            path.split('{' + parentGroupShortname + '}').join(parentObjectIds[parentGroupShortname]);
        }
        const showThisGroupedObject = parseBoolean(
            props.widgetConfig.groupedObjectConditional,
            props.interview,
            path,
            props.user,
            true
        );
        if (showThisGroupedObject) {
            widgetsComponents.push(
                <GroupedObject
                    widgetConfig={props.widgetConfig}
                    path={path}
                    loadingState={props.loadingState}
                    shortname={props.shortname}
                    objectId={groupedObject._uuid}
                    parentObjectIds={parentObjectIds}
                    key={groupedObject._uuid}
                    sequence={groupedObject['_sequence']}
                    section={props.section}
                    interview={props.interview}
                    user={props.user}
                    errors={props.errors}
                    startUpdateInterview={props.startUpdateInterview}
                    startAddGroupedObjects={props.startAddGroupedObjects}
                    startRemoveGroupedObjects={props.startRemoveGroupedObjects}
                />
            );
        }
    });

    const showTitle = parseBoolean(props.widgetConfig.showTitle, props.interview, props.path, props.user);
    const showAddButton =
        props.loadingState === 0 &&
        parseBoolean(props.widgetConfig.showGroupedObjectAddButton, props.interview, props.path, props.user);
    const addButtonLabel =
        translateString(props.widgetConfig.groupedObjectAddButtonLabel, props.i18n, props.interview, props.path) ||
        props.t(`survey:${props.shortname}:addGroupedObject`);
    const addButtonLocation = props.widgetConfig.addButtonLocation || 'bottom';
    const addButtonSize = props.widgetConfig.addButtonSize || 'large';

    return (
        <section className="survey-group">
            <div className="content-container">
                <div className="survey-group__content">
                    {showTitle && (
                        <h2 className="survey-group__title">
                            {translateString(widgetConfig.title, props.i18n, props.interview, props.path) ||
                                props.t(`survey:${props.shortname}:title`)}
                        </h2>
                    )}
                    {showAddButton && (addButtonLocation === 'top' || addButtonLocation === 'both') && (
                        <div className="center">
                            {showAddButton && (
                                <button
                                    type="button"
                                    className={`button blue center ${addButtonSize}`}
                                    onClick={onAddGroupedObject(1)}
                                >
                                    <FontAwesomeIcon icon={faPlusCircle} className="faIconLeft" />
                                    {addButtonLabel}
                                </button>
                            )}
                        </div>
                    )}
                    {widgetsComponents}
                    {showAddButton &&
                        (addButtonLocation === 'bottom' ||
                            (widgetsComponents.length > 0 && addButtonLocation === 'both')) && (
                        <div className="center">
                            {showAddButton && (
                                <button
                                    type="button"
                                    className={`button blue center ${addButtonSize}`}
                                    onClick={onAddGroupedObject(-1)}
                                >
                                    <FontAwesomeIcon icon={faPlusCircle} className="faIconLeft" />
                                    {addButtonLabel}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export const Group = withTranslation()(withSurveyContext(BaseGroup));
