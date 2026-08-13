/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';

import config from 'chaire-lib-common/lib/config/shared/project.config';
import { devLog } from 'evolution-common/lib/utils/helpers';
import { withSurveyContext, WithSurveyContextProps } from '../hoc/WithSurveyContextHoc';
import { Widget } from '../survey/Widget';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { SectionProps, useSectionTemplate } from '../hooks/useSectionTemplate';
import SectionProgressBar from './SectionProgressBar';
import { getRandomOrderedWidgets } from 'evolution-common/lib/services/questionnaire/randomOrderQuestions';

export const Section: React.FC<SectionProps & WithSurveyContextProps> = (
    props: SectionProps & WithSurveyContextProps
) => {
    const { preloaded } = useSectionTemplate(props);

    // Scroll to top when the section is rendered
    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, [props.shortname]);

    // The random order is drawn once at interview creation, so it only changes
    // with the interview itself
    const sortedWidgetShortnames = React.useMemo(
        () => getRandomOrderedWidgets(props.interview, props.sectionConfig.widgets),
        [props.sectionConfig.widgets, props.interview.id]
    );

    if (!preloaded) {
        return <LoadingPage />;
    }

    const sortedWidgetsComponents: React.ReactNode[] = [];

    devLog('%c rendering section ' + props.shortname, 'background: rgba(0,0,255,0.1);');
    for (let i = 0, count = sortedWidgetShortnames.length; i < count; i++) {
        const widgetShortname = sortedWidgetShortnames[i];
        sortedWidgetsComponents.push(
            <Widget
                key={widgetShortname}
                currentWidgetShortname={widgetShortname}
                nextWidgetShortname={sortedWidgetShortnames[i + 1]}
                sectionName={props.shortname}
                interview={props.interview}
                errors={props.errors}
                user={props.user}
                loadingState={props.loadingState}
                startUpdateInterview={props.startUpdateInterview}
                startAddGroupedObjects={props.startAddGroupedObjects}
                startRemoveGroupedObjects={props.startRemoveGroupedObjects}
                startNavigate={props.startNavigate}
            />
        );
    }

    return (
        <section className={`survey-section survey-section-shortname-${props.shortname}`}>
            <div className="survey-section__content">
                {props?.sectionConfig?.title && config?.hasSectionProgressBar === true && (
                    <React.Fragment>
                        <SectionProgressBar
                            title={props.sectionConfig.title}
                            interview={props.interview}
                            sectionName={props.shortname}
                            sections={props.surveyContext.sections}
                        />
                    </React.Fragment>
                )}
                <div>{sortedWidgetsComponents}</div>
            </div>
        </section>
    );
};

export default withSurveyContext(Section);
