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

export type SectionConfig = {
    widgets: string[];
    previousSection: string | null;
    nextSection: string | null;
    title?: I18nData;
    menuName?: I18nData;
    preload?: SectionPreload;
    template?: React.ComponentType;
    /**
     * If set, this section is a sub-section of the parent section. It will not
     * be displayed in the section navigation.
     */
    parentSection?: string;
    // FIXME Type this
    customStyle?: any;
    enableConditional?: boolean | ParsingFunction<boolean>;
    completionConditional?: boolean | ParsingFunction<boolean>;
};
export type SurveySections = { [sectionName: string]: SectionConfig };
export type SurveyWidgets = {
    [widgetName: string]: WidgetConfig;
};
