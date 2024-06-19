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

import {
    devLog,
    InterviewUpdateCallbacks,
    parseBoolean,
    parseString,
    translateString
} from 'evolution-common/lib/utils/helpers';
import { withSurveyContext, WithSurveyContextProps } from '../hoc/WithSurveyContextHoc';
import Text from './Text';
import Button from './Button';
import Question from './Question';
import InfoMap from './InfoMap';
import { checkConditional } from '../../actions/utils/Conditional';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { WidgetStatus } from '../../services/interviews/interview';
import { GroupConfig } from 'evolution-common/lib/services/widgets/WidgetConfig';
import DeleteGroupedObjectButton from './widgets/DeleteGroupedObjectButton';

type GroupedObjectProps = InterviewUpdateCallbacks & {
    interview: UserInterviewAttributes;
    user: CliUser;
    path: string;
    label?: string;
    section: string;
    shortname: string;
    groupConfig: GroupConfig;
    groupsConfig: { [groupName: string]: GroupConfig };
    loadingState: number;
    /** Associates a widget shortname with the parent UUID */
    parentObjectIds: { [widgetShortname: string]: string };
    objectId: string;
    sequence: number;
};

export const BaseGroupedObject: React.FC<GroupedObjectProps & WithTranslation & WithSurveyContextProps> = (props) => {
    const widgetConfig = props.surveyContext.widgets[props.shortname];
    const groupedObjectShortname = widgetConfig.shortname;
    devLog(
        '%c rendering ' + groupedObjectShortname + ' ' + props.objectId,
        'background: rgba(0,255,0,0.1); font-size: 7px;'
    );
    const path = props.path;
    const groupedObjectId = props.objectId;
    const parentObjectIds = props.parentObjectIds;
    const sectionShortname = props.section;
    parentObjectIds[groupedObjectShortname] = groupedObjectId;
    const widgetsComponents = props.groupConfig.widgets.map((widgetShortname) => {
        const widgetPath = `${path}.${widgetShortname}`;
        const widgetConfig = props.surveyContext.widgets[widgetShortname];
        const customPath = widgetConfig.customPath ? `${path}.${widgetConfig.customPath}` : undefined;
        const widgetStatus = _get(
            props.interview,
            `groups.${props.shortname}.${groupedObjectId}.${widgetShortname}`,
            {}
        ) as WidgetStatus;

        const defaultProps = {
            path: widgetPath,
            customPath: customPath,
            key: widgetPath,
            shortname: widgetShortname,
            loadingState: props.loadingState,
            widgetConfig: widgetConfig,
            widgetStatus: widgetStatus,
            section: sectionShortname,
            groupShortname: props.shortname,
            groupedObjectId: groupedObjectId,
            interview: props.interview,
            user: props.user,
            startUpdateInterview: props.startUpdateInterview,
            startAddGroupedObjects: props.startAddGroupedObjects,
            startRemoveGroupedObjects: props.startRemoveGroupedObjects
        };

        switch (widgetConfig.type) {
        case 'text':
            return <Text {...defaultProps} />;
        case 'infoMap':
            return <InfoMap {...defaultProps} />;
        case 'button':
            return <Button {...defaultProps} />;
        case 'question':
            return <Question {...defaultProps} path={`${path}.${widgetConfig.path}`} />;
        case 'group':
            return (
                <Group
                    {...defaultProps}
                    groupConfig={props.groupsConfig[widgetShortname]}
                    groupsConfig={props.groupsConfig}
                    parentObjectIds={parentObjectIds}
                />
            );
        }
    });

    let title = '';
    const localizedName = widgetConfig.name[props.i18n.language];
    if (typeof localizedName === 'function') {
        title = localizedName(_get(props.interview.responses, path), props.sequence, props.interview, path);
    } else {
        title = localizedName;
    }

    return (
        <div className="survey-group-object">
            <div className="content-container">
                <div className="survey-group-object__content">
                    <h3 className="survey-group-object__title">
                        <Markdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]}>{title}</Markdown>
                    </h3>
                    <DeleteGroupedObjectButton
                        interview={props.interview}
                        groupConfig={props.groupConfig}
                        user={props.user}
                        path={path}
                        shortname={props.shortname}
                        widgetConfig={widgetConfig}
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
    customPath?: string;
    interview: UserInterviewAttributes;
    user: CliUser;
    shortname: string;
    groupConfig: GroupConfig;
    // FIXME Where does this come from, shouldn't it be in the survey context?
    groupsConfig: { [groupName: string]: GroupConfig };
    loadingState: number;
    /** Associates a widget shortname with the parent UUID */
    parentObjectIds: { [widgetShortname: string]: string };
    section: string;
};

const BaseGroup: FunctionComponent<GroupProps & WithTranslation & WithSurveyContextProps> = (props) => {
    const onAddGroupedObject = (sequence: number) => (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();
        props.startAddGroupedObjects(1, sequence, props.path);
    };

    const groupedObjects = () => {
        const { interview, path, shortname, surveyContext } = props;
        const widgetConfig = surveyContext.widgets[shortname];
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
        props.groupConfig.conditional !== undefined &&
        !checkConditional(
            parseBoolean(props.groupConfig.conditional, props.interview, props.path),
            props.interview,
            props.path,
            props.customPath
        )[0]
    ) {
        return null;
    }

    const widgetsComponents: JSX.Element[] = [];
    const parentObjectIds = _cloneDeep(props.parentObjectIds) || {};
    const widgetConfig = props.surveyContext.widgets[props.shortname];
    // FIXME Type the groupedObject
    groupedObjects().forEach((groupedObject: any, index) => {
        // FIXME What are we doing here exactly? Why?
        parentObjectIds[widgetConfig.shortname] = groupedObject._uuid;
        const path = `${props.path}.${groupedObject._uuid}`;

        for (const parentGroupShortname in parentObjectIds) {
            path.split('{' + parentGroupShortname + '}').join(parentObjectIds[parentGroupShortname]);
        }
        const showThisGroupedObject = parseBoolean(
            props.groupConfig.groupedObjectConditional,
            props.interview,
            path,
            props.user,
            true
        );
        if (showThisGroupedObject) {
            widgetsComponents.push(
                <GroupedObject
                    groupConfig={props.groupConfig}
                    groupsConfig={props.groupsConfig}
                    path={path}
                    shortname={props.shortname}
                    loadingState={props.loadingState}
                    objectId={groupedObject._uuid}
                    parentObjectIds={parentObjectIds}
                    key={groupedObject._uuid}
                    sequence={groupedObject['_sequence']}
                    section={props.section}
                    interview={props.interview}
                    user={props.user}
                    startUpdateInterview={props.startUpdateInterview}
                    startAddGroupedObjects={props.startAddGroupedObjects}
                    startRemoveGroupedObjects={props.startRemoveGroupedObjects}
                />
            );
        }
    });

    const showTitle = parseBoolean(props.groupConfig.showTitle, props.interview, props.path, props.user);
    const showAddButton =
        props.loadingState === 0 &&
        parseBoolean(props.groupConfig.showGroupedObjectAddButton, props.interview, props.path, props.user);
    const addButtonLabel =
        parseString(
            props.groupConfig.groupedObjectAddButtonLabel
                ? props.groupConfig.groupedObjectAddButtonLabel[props.i18n.language] ||
                      props.groupConfig.groupedObjectAddButtonLabel
                : null,
            props.interview,
            props.path
        ) || props.t(`survey:${widgetConfig.shortname}:addGroupedObject`);
    const addButtonLocation = props.groupConfig.addButtonLocation || 'bottom';
    const addButtonSize = props.groupConfig.addButtonSize || 'large';

    return (
        <section className="survey-group">
            <div className="content-container">
                <div className="survey-group__content">
                    {showTitle && (
                        <h2 className="survey-group__title">
                            {translateString(widgetConfig.groupName, props.i18n, props.interview, props.path) || ''}
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
