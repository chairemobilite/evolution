/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { withTranslation, WithTranslation } from 'react-i18next';
import React from 'react';
import { createBrowserHistory } from 'history';
import _get from 'lodash/get';
import _shuffle from 'lodash/shuffle';

import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { withSurveyContext, WithSurveyContextProps } from '../hoc/WithSurveyContextHoc';
import Text from '../survey/Text';
import InfoMap from '../survey/InfoMap';
import Button from '../survey/Button';
import Question from '../survey/Question';
import { Group } from '../survey/GroupWidgets';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { getPathForSection } from '../../services/url';
import { UserFrontendInterviewAttributes } from '../../services/interviews/interview';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { StartUpdateInterview, StartAddGroupedObjects, StartRemoveGroupedObjects, InterviewUpdateCallbacks } from 'evolution-common/lib/utils/helpers';

export type SectionProps = {
    shortname: string;
    widgets: string[];
    interview: UserFrontendInterviewAttributes;
    errors: { [path: string]: string };
    user: CliUser;
    preload: (
        interview: UserFrontendInterviewAttributes,
        startUpdateInterview: StartUpdateInterview,
        startAddGroupedObjects: StartAddGroupedObjects,
        startRemoveGroupedObjects: StartRemoveGroupedObjects,
        callback: (interview: UserFrontendInterviewAttributes) => void,
        user: CliUser
    ) => void;
    allWidgetsValid?: boolean;
    submitted?: boolean;
    loadingState: number;
} & WithTranslation &
    InterviewUpdateCallbacks &
    WithSurveyContextProps;

export type SectionState = {
    preloaded: boolean;
    sortedWidgetShortnames: string[];
};

export class Section extends React.Component<SectionProps, SectionState> {
    constructor(props) {
        super(props);
        this.state = {
            preloaded: false,
            sortedWidgetShortnames: []
        };

        this.getSortedWidgetShortnames = this.getSortedWidgetShortnames.bind(this);
    }

    componentDidMount() {
        const sortedWidgetShortnames = this.getSortedWidgetShortnames();
        if (typeof this.props.preload === 'function') {
            this.props.preload.call(
                this,
                this.props.interview,
                this.props.startUpdateInterview,
                this.props.startAddGroupedObjects,
                this.props.startRemoveGroupedObjects,
                () => {
                    this.setState(() => ({
                        preloaded: true,
                        sortedWidgetShortnames
                    }));
                },
                this.props.user
            );
        } else {
            this.setState(() => ({
                preloaded: true,
                sortedWidgetShortnames
            }));
        }
    }

    componentDidUpdate(_prevProps: SectionProps) {
        if (!this.props.allWidgetsValid && this.props.submitted && this.props.loadingState === 0) {
            const invalidInputs = document.querySelectorAll('.question-invalid input') as NodeListOf<HTMLInputElement>;
            // Not all widgets types focus correclty on all browsers, so we do the
            // actual focus only on text widgets. For the others, we scroll to the
            // position of the first invalid question to make sure it is in view. This
            // works for all widgets types.
            if (invalidInputs.length > 0 && invalidInputs[0].id && invalidInputs[0].type === 'text') {
                // Focus on invalid input if found, it has an ID, and is of type text
                const inputElement = document.getElementById(invalidInputs[0].id);
                if (inputElement) {
                    inputElement.focus();
                }
            } else {
                // Otherwise scroll to the position of the first invalid question
                const scrollPosition = _get(document.getElementsByClassName('question-invalid'), '[0].offsetTop', null);
                if (scrollPosition && scrollPosition >= 0) {
                    window.scrollTo(0, scrollPosition);
                }
            }
        }
    }

    // TODO: This should not be done here. Wrong responsability. Move elsewhere.
    getSortedWidgetShortnames() {
        let hasRandomOrderWidgets = false;
        let randomGroup = undefined;
        const randomGroupsIndexes: { [key: string]: number[] } = {};
        const randomGroupsStartIndexes: { [key: string]: number } = {};
        const sortedShortnames: string[] = [];
        const countWidgets = this.props.widgets.length;
        const unsortedWidgetShortnames: string[] = [];

        // shuffle random groups indexes:
        for (let i = 0; i < countWidgets; i++) {
            const widgetShortname = this.props.widgets[i];
            const widgetConfig = this.props.surveyContext.widgets[widgetShortname];
            unsortedWidgetShortnames.push(widgetShortname);
            if (widgetConfig === undefined) {
                continue;
            }
            if (widgetConfig.randomOrder === true) {
                hasRandomOrderWidgets = true;
                randomGroup = widgetConfig.randomGroup;
                if (randomGroup && !randomGroupsIndexes[randomGroup]) {
                    randomGroupsIndexes[randomGroup] = [];
                    randomGroupsStartIndexes[randomGroup] = i;
                } else if (randomGroup) {
                    randomGroupsIndexes[randomGroup].push(i);
                }
            }
        }
        if (hasRandomOrderWidgets) {
            for (const randomGroup in randomGroupsIndexes) {
                const randomGroupIndexes = _shuffle(randomGroupsIndexes[randomGroup]);
                for (let j = 0, count = randomGroupIndexes.length; j < count; j++) {
                    sortedShortnames[randomGroupsStartIndexes[randomGroup] + j] =
                        unsortedWidgetShortnames[randomGroupIndexes[j]];
                }
            }
        }
        for (let i = 0; i < countWidgets; i++) {
            if (sortedShortnames[i] === undefined) {
                sortedShortnames[i] = unsortedWidgetShortnames[i];
            }
        }
        return sortedShortnames;
    }

    render() {
        if (!this.state.preloaded) {
            return <LoadingPage />;
        }
        const history = createBrowserHistory();

        const path = getPathForSection(history.location.pathname, this.props.shortname);
        if (path) {
            history.push(path);
        }

        const widgetsComponentByShortname: { [key: string]: React.ReactNode } = {};

        surveyHelper.devLog('%c rendering section ' + this.props.shortname, 'background: rgba(0,0,255,0.1);');
        for (let i = 0, count = this.props.widgets.length; i < count; i++) {
            const widgetShortname = this.props.widgets[i];
            surveyHelper.devLog('%c rendering widget ' + widgetShortname, 'background: rgba(0,255,0,0.1);');
            const widgetConfig = this.props.surveyContext.widgets[widgetShortname];
            if (widgetConfig === undefined) {
                console.error(`Widget is undefined: ${widgetShortname}`);
                if (this.props.surveyContext.devMode) {
                    widgetsComponentByShortname[widgetShortname] = (
                        <div className="apptr__form-container two-columns question-invalid">{`Widget is undefined: ${widgetShortname}`}</div>
                    );
                }
                continue;
            }

            const path = surveyHelper.interpolatePath(
                this.props.interview,
                widgetConfig.path || `${this.props.shortname}.${widgetShortname}`
            );
            const customPath = widgetConfig.customPath
                ? surveyHelper.interpolatePath(this.props.interview, widgetConfig.customPath)
                : null;
            const widgetStatus = _get(this.props.interview, `widgets.${widgetShortname}`, {}) as any; // TODO: type WidgetStatus
            const [isServerValid, serverErrorMessage] =
                this.props.errors && this.props.errors[path] ? [false, this.props.errors[path]] : [true, undefined];
            // Overwrite widget status with server validation data if invalid
            if (!isServerValid) {
                widgetStatus.isValid = false;
                widgetStatus.errorMessage = widgetStatus.errorMessage || serverErrorMessage;
            }

            // check for joined widgets:
            const nextWidgetShortname = this.props.widgets[i + 1];
            const nextWidgetConfig = this.props.surveyContext.widgets[nextWidgetShortname];
            const nextWidgetStatus = nextWidgetShortname
                ? (_get(this.props.interview, `widgets.${nextWidgetShortname}`, {}) as any)
                : undefined; // TODO: type WidgetStatus
            const join =
                nextWidgetStatus &&
                ((nextWidgetConfig.joinWith === widgetShortname && nextWidgetStatus.isVisible) ||
                    (widgetConfig.joinWith === nextWidgetShortname && nextWidgetStatus.isVisible));

            const defaultProps: any = {
                // TODO: type default props
                path: path,
                customPath: customPath,
                key: path,
                shortname: widgetShortname,
                loadingState: this.props.loadingState,
                groupShortname: null,
                groupedObjectId: null,
                widgetConfig: widgetConfig,
                join: join,
                widgetStatus: widgetStatus,
                section: this.props.shortname,
                interview: this.props.interview,
                user: this.props.user,
                startUpdateInterview: this.props.startUpdateInterview,
                startAddGroupedObjects: this.props.startAddGroupedObjects,
                startRemoveGroupedObjects: this.props.startRemoveGroupedObjects
            };

            switch (widgetConfig.type) {
            case 'text':
                widgetsComponentByShortname[widgetShortname] = <Text {...defaultProps} />;
                break;
            case 'infoMap':
                widgetsComponentByShortname[widgetShortname] = <InfoMap {...defaultProps} />;
                break;
            case 'button':
                widgetsComponentByShortname[widgetShortname] = <Button {...defaultProps} />;
                break;
            case 'question':
                widgetsComponentByShortname[widgetShortname] = <Question {...defaultProps} />;
                break;
            case 'group':
                widgetsComponentByShortname[widgetShortname] = (
                    <Group {...defaultProps} parentObjectIds={{}} shortname={widgetShortname} />
                );
                break;
            }
        }

        const sortedWidgetsComponents: React.ReactNode[] = [];
        for (let i = 0, count = this.state.sortedWidgetShortnames.length; i < count; i++) {
            sortedWidgetsComponents.push(widgetsComponentByShortname[this.state.sortedWidgetShortnames[i]]);
        }

        return (
            <section className={`survey-section survey-section-shortname-${this.props.shortname}`}>
                <div className="survey-section__content">{sortedWidgetsComponents}</div>
            </section>
        );
    }
}

export default withTranslation()(withSurveyContext(Section));
