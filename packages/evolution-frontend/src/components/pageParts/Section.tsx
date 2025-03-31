/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { withTranslation, WithTranslation } from 'react-i18next';
import React from 'react';
import _get from 'lodash/get';
import _shuffle from 'lodash/shuffle';

import config from 'chaire-lib-common/lib/config/shared/project.config';
import { devLog } from 'evolution-common/lib/utils/helpers';
import { withSurveyContext, WithSurveyContextProps } from '../hoc/WithSurveyContextHoc';
import { Widget } from '../survey/Widget';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { SectionConfig, UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { SectionProps, useSectionTemplate } from '../hooks/useSectionTemplate';
import SectionProgressBar from './SectionProgressBar';

export const Section: React.FC<SectionProps & WithTranslation & WithSurveyContextProps> = (
    props: SectionProps & WithTranslation & WithSurveyContextProps
) => {
    const { preloaded } = useSectionTemplate(props);

    // TODO: This should not be done here. Wrong responsability. Move elsewhere.
    const getSortedWidgetShortnames = () => {
        let hasRandomOrderWidgets = false;
        let randomGroup = undefined;
        const randomGroupsIndexes: { [key: string]: number[] } = {};
        const randomGroupsStartIndexes: { [key: string]: number } = {};
        const sortedShortnames: string[] = [];
        const countWidgets = props.sectionConfig.widgets.length;
        const unsortedWidgetShortnames: string[] = [];

        // shuffle random groups indexes:
        for (let i = 0; i < countWidgets; i++) {
            const widgetShortname = props.sectionConfig.widgets[i];
            const widgetConfig = props.surveyContext.widgets[widgetShortname];
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
    };

    const sortedWidgetShortnames = React.useMemo(() => getSortedWidgetShortnames(), [props.sectionConfig.widgets]);

    if (!preloaded) {
        return <LoadingPage />;
    }

    const widgetsComponentByShortname: { [key: string]: React.ReactNode } = {};

    devLog('%c rendering section ' + props.shortname, 'background: rgba(0,0,255,0.1);');
    for (let i = 0, count = props.sectionConfig.widgets.length; i < count; i++) {
        const widgetShortname = props.sectionConfig.widgets[i];

        widgetsComponentByShortname[widgetShortname] = (
            <Widget
                key={widgetShortname}
                currentWidgetShortname={widgetShortname}
                nextWidgetShortname={props.sectionConfig.widgets[i + 1]}
                sectionName={props.shortname}
                interview={props.interview}
                errors={props.errors}
                user={props.user}
                loadingState={props.loadingState}
                startUpdateInterview={props.startUpdateInterview}
                startAddGroupedObjects={props.startAddGroupedObjects}
                startRemoveGroupedObjects={props.startRemoveGroupedObjects}
            />
        );
    }

    const sortedWidgetsComponents: React.ReactNode[] = [];
    for (let i = 0, count = sortedWidgetShortnames.length; i < count; i++) {
        sortedWidgetsComponents.push(widgetsComponentByShortname[sortedWidgetShortnames[i]]);
    }

    return (
        <section className={`survey-section survey-section-shortname-${props.shortname}`}>
            <div className="survey-section__content">
                {props?.sectionConfig?.title && config?.hasSectionProgressBar === true && (
                    <React.Fragment>
                        <SectionProgressBar
                            title={props.sectionConfig.title}
                            interview={props.interview}
                            shortname={props.shortname}
                            sections={props.surveyContext.sections}
                        />
                    </React.Fragment>
                )}
                <div>{sortedWidgetsComponents}</div>
            </div>
        </section>
    );
};

export default withTranslation()(withSurveyContext(Section));
