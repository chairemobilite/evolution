/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { withTranslation, WithTranslation } from 'react-i18next';
import React from 'react';
import _get from 'lodash/get';

import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import Text from '../survey/Text';
import InfoMap from '../survey/InfoMap';
import Button from '../survey/Button';
import Question from '../survey/Question';
import { Group } from '../survey/GroupWidgets';
import { withSurveyContext, WithSurveyContextProps } from '../hoc/WithSurveyContextHoc';
import { UserRuntimeInterviewAttributes, WidgetStatus } from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { WidgetConfig } from 'evolution-common/lib/services/questionnaire/types';
import { InterviewUpdateCallbacks } from 'evolution-common/lib/services/questionnaire/types';

export type WidgetProps = {
    currentWidgetShortname: string;
    nextWidgetShortname?: string;
    sectionName: string;
    interview: UserRuntimeInterviewAttributes;
    errors?: { [path: string]: string };
    user: CliUser;
    loadingState: number;
};

export type InGroupWidgetProps = WidgetProps & {
    /** The path where to get the widget status for this widget. Defaults to `widgets`, but can be other in case the widget is for a group */
    widgetStatusPath: string;
    /** Path to prepend to the widget path, for example in groups */
    pathPrefix: string;
    groupedObjectId: string;
    parentObjectIds: { [shortname: string]: string };
};

type SingleWidgetProps = WidgetProps & {
    path?: string;
    customPath?: string;
    widgetStatus: WidgetStatus;
    groupedObjectId: string;
    parentObjectIds: { [shortname: string]: string };
};

// BaseWidget is a wrapper around the SingleWidget component that is responsible
// for setting the default values of some fields when the widget is not part of
// a group
const BaseWidget: React.FC<WidgetProps & WithTranslation & InterviewUpdateCallbacks & WithSurveyContextProps> = (
    props: WidgetProps & WithTranslation & InterviewUpdateCallbacks & WithSurveyContextProps
) => {
    const widgetConfig = props.surveyContext.widgets[props.currentWidgetShortname] as WidgetConfig;
    const widgetStatus = _get(props.interview, `widgets.${props.currentWidgetShortname}`, {}) as WidgetStatus;
    return (
        <SingleWidget
            {...props}
            path={widgetConfig?.path}
            customPath={(widgetConfig as any)?.customPath}
            widgetStatus={widgetStatus}
            groupedObjectId=""
            parentObjectIds={{}}
        />
    );
};

// BaseInGroupWidget is a wrapper around the SingleWidget component that is
// responsible for setting the default values of some fields when the widget is
// part of a group
const BaseInGroupWidget: React.FC<
    InGroupWidgetProps & WithTranslation & InterviewUpdateCallbacks & WithSurveyContextProps
> = (props: InGroupWidgetProps & WithTranslation & InterviewUpdateCallbacks & WithSurveyContextProps) => {
    const widgetConfig = props.surveyContext.widgets[props.currentWidgetShortname] as WidgetConfig;
    const widgetStatus = _get(
        props.interview,
        `${props.widgetStatusPath}.${props.currentWidgetShortname}`,
        {}
    ) as WidgetStatus;
    // Get the paths with prefix if it exists
    const widgetPath = props.pathPrefix && widgetConfig?.path ? `${props.pathPrefix}.${widgetConfig.path}` : undefined;
    const widgetCustomPath =
        props.pathPrefix && (widgetConfig as any)?.customPath
            ? `${props.pathPrefix}.${(widgetConfig as any).customPath}`
            : undefined;
    return (
        <SingleWidget
            {...props}
            path={widgetPath}
            customPath={widgetCustomPath}
            widgetStatus={widgetStatus}
            groupedObjectId={props.groupedObjectId}
            parentObjectIds={props.parentObjectIds}
        />
    );
};

/**
 * This is a single widget with all necessary properties to render it.
 */
const BaseSingleWidget: React.FC<
    SingleWidgetProps & WithTranslation & InterviewUpdateCallbacks & WithSurveyContextProps
> = (props: SingleWidgetProps & WithTranslation & InterviewUpdateCallbacks & WithSurveyContextProps) => {
    const widgetShortname = props.currentWidgetShortname;
    surveyHelper.devLog('%c rendering widget ' + widgetShortname, 'background: rgba(0,255,0,0.1);');
    const widgetConfig = props.surveyContext.widgets[widgetShortname] as WidgetConfig;
    if (widgetConfig === undefined) {
        console.error(`Widget is undefined: ${widgetShortname}`);
        if (props.surveyContext.devMode) {
            return (
                <div className="apptr__form-container two-columns question-invalid">{`Widget is undefined: ${widgetShortname}`}</div>
            );
        }
        return null;
    }

    const path = props.path
        ? surveyHelper.interpolatePath(props.interview, props.path)
        : `${props.sectionName}.${widgetShortname}`;
    const customPath = props.customPath ? surveyHelper.interpolatePath(props.interview, props.customPath) : undefined;
    // FIXME This should be typed and correctly got from the interview
    // FIXME 2 This component should be responsible to check the isVisible status and return null instead of each widget individually
    const widgetStatus = props.widgetStatus;
    const [isServerValid, serverErrorMessage] =
        props.errors && props.errors[path] ? [false, props.errors[path]] : [true, undefined];
    // Overwrite widget status with server validation data if invalid
    if (!isServerValid) {
        widgetStatus.isValid = false;
        widgetStatus.errorMessage = widgetStatus.errorMessage || serverErrorMessage;
    }

    const widgetProps: any = {
        // TODO: type default props
        path: path,
        customPath: customPath,
        key: path,
        shortname: widgetShortname,
        loadingState: props.loadingState,
        groupedObjectId: props.groupedObjectId,
        widgetConfig: widgetConfig,
        widgetStatus: widgetStatus,
        section: props.sectionName,
        interview: props.interview,
        user: props.user,
        startUpdateInterview: props.startUpdateInterview,
        startAddGroupedObjects: props.startAddGroupedObjects,
        startRemoveGroupedObjects: props.startRemoveGroupedObjects,
        startNavigate: props.startNavigate
    };

    switch (widgetConfig.type) {
    case 'text':
        return <Text {...widgetProps} />;
    case 'infoMap':
        return <InfoMap {...widgetProps} />;
    case 'button':
        return <Button {...widgetProps} />;
    case 'question': {
        // check for joined widgets:
        const nextWidgetConfig = props.nextWidgetShortname
            ? props.surveyContext.widgets[props.nextWidgetShortname]
            : undefined;
        const nextWidgetStatus = nextWidgetConfig
            ? (_get(props.interview, `widgets.${props.nextWidgetShortname}`, {}) as any)
            : undefined;
        const join =
                nextWidgetStatus &&
                ((nextWidgetConfig.joinWith === widgetShortname && nextWidgetStatus.isVisible) ||
                    (widgetConfig.joinWith === props.nextWidgetShortname && nextWidgetStatus.isVisible));
        widgetProps.join = join;
        return <Question {...widgetProps} />;
    }
    case 'group':
        return (
            <Group
                {...widgetProps}
                parentObjectIds={props.parentObjectIds}
                shortname={widgetShortname}
                errors={props.errors}
            />
        );
    }
};

export const Widget = withTranslation()(withSurveyContext(BaseWidget));

export const InGroupWidget = withTranslation()(withSurveyContext(BaseInGroupWidget));

const SingleWidget = withTranslation()(withSurveyContext(BaseSingleWidget));
