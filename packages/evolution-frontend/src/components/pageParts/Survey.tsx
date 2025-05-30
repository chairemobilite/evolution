/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useContext } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import _get from 'lodash/get';

import config from 'chaire-lib-common/lib/config/shared/project.config';
import appConfig from '../../config/application.config';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import Section from '../pageParts/Section';
import SectionNav from '../pageParts/SectionNav';
import ConfirmModal from 'chaire-lib-frontend/lib/components/modal/ConfirmModal';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { validateAllWidgets } from '../../actions/utils';
import { withPreferencesHOC } from '../hoc/WithPreferencesHoc';
import { overrideConsoleLogs } from '../../services/errorManagement/errorHandling';
import { restoreConsoleLogs } from '../../services/errorManagement/errorHandling';
import { SectionProps } from '../hooks/useSectionTemplate';
import {
    InterviewUpdateCallbacks,
    UserRuntimeInterviewAttributes
} from 'evolution-common/lib/services/questionnaire/types';
import { RootState } from '../../store/configureStore';
import { SurveyContext } from '../../contexts/SurveyContext';

type SurveyProps = InterviewUpdateCallbacks & {
    interview: UserRuntimeInterviewAttributes;
};

const Survey: React.FC<SurveyProps> = (props: SurveyProps) => {
    // Prepare survey state
    const [confirmCompleteBeforeSwitchingOpened, setConfirmCompleteBeforeSwitchingOpened] =
        React.useState<boolean>(false);

    // Get state selectors and other hooks
    const { t, i18n } = useTranslation(['survey', 'main']);
    const { errors, submitted, navigation } = useSelector((state: RootState) => state.survey);
    const user = useSelector((state: RootState) => state.auth.user)!;
    const loadingState = useSelector((state: RootState) => state.loadingState.loadingState);
    const { sections } = useContext(SurveyContext);

    React.useEffect(() => {
        // set language if empty or unavailable and change locale:
        if (!i18n.language || config.languages.indexOf(i18n.language) <= -1) {
            i18n.changeLanguage(config.defaultLocale);
        }
        moment.locale(i18n.language);

        // Override the window.console functions to log errors and warnings to the server. It is here because it's the top most component with an interview to associate with
        overrideConsoleLogs({ getInterviewId: () => props.interview.id });

        return () => {
            // Reset the console functions to their original values
            restoreConsoleLogs();
        };
    }, []);

    React.useEffect(() => {
        // Set the background logo image to the style properties
        if (config.logoPaths) {
            document.documentElement.style.setProperty(
                '--dynamic-logo-image',
                `url(${config.logoPaths[i18n.language]})`
            );
        }
    }, [i18n.language]);

    const onChangeSection = (
        targetSection: string,
        activeSection: string,
        allWidgetsValid: boolean,
        e?: React.FormEvent<HTMLFormElement>
    ) => {
        if (e) {
            e.preventDefault();
        }
        if (activeSection === targetSection) {
            return null;
        }
        if (allWidgetsValid) {
            // Navigate to the requested section
            props.startNavigate({ requestedSection: { sectionShortname: targetSection } });
        } else {
            setConfirmCompleteBeforeSwitchingOpened(true);
            setTimeout(() => {
                console.log('should scroll to first invalid question after rendering');
                const scrollPosition = _get(document.getElementsByClassName('question-invalid'), '[0].offsetTop', null);
                if (scrollPosition && scrollPosition >= 0) {
                    window.scrollTo(0, scrollPosition);
                }
            }, 0);
        }
    };

    const closeConfirmModal: React.MouseEventHandler = (e) => {
        if (e) {
            e.preventDefault();
        }
        setConfirmCompleteBeforeSwitchingOpened(false);
    };

    const allWidgetsValid = validateAllWidgets(props.interview);

    const activeSection = navigation && navigation.currentSection ? navigation.currentSection.sectionShortname : null;
    // FIXME If the sectionLoaded is not the same as the active one, is something somewhere loading it right now? Or should we do something?
    // FIXME Consider using react Suspense instead of this logic for the loading page
    // FIXME Consider putting the LoadingPage on the section only, and displaying the SectionNav, in case there's a bug and one can navigate to a section with the menu
    if (!activeSection || props.interview.sectionLoaded !== activeSection) {
        surveyHelper.devLog('%c rendering empty survey', 'background: rgba(0,0,0,0.1);');
        return <LoadingPage />;
    }

    surveyHelper.devLog(`%c rendering survey with activeSection ${activeSection}`, 'background: rgba(0,0,0,0.2);');

    const sectionShortname = activeSection;
    const sectionConfig = sections[sectionShortname];

    // Determine the section component to use based on the section configuration
    let SectionComponent: React.ComponentType<SectionProps> = Section;
    if (sectionConfig.template) {
        if (appConfig.templateMapping[sectionConfig.template]) {
            SectionComponent = appConfig.templateMapping[sectionConfig.template];
        } else {
            console.error(`Template ${sectionConfig.template} not found in appConfig.templateMapping`);
        }
    }

    let customStyle: React.CSSProperties = {};

    if (activeSection && sections[activeSection] && sections[activeSection].customStyle) {
        customStyle = sections[activeSection].customStyle as React.CSSProperties;
    }

    const surveyContainerClassNames = `survey${config.logoPaths ? ' survey-with-logo' : ''}`;

    return (
        <div className={surveyContainerClassNames}>
            {/* FIXME This style does not appear to have any effect. Either remove or extract to a css class */}
            <div style={{ width: '100%', margin: '0 auto' }}>
                <SectionNav
                    sections={sections}
                    onChangeSection={onChangeSection}
                    activeSection={activeSection}
                    interview={props.interview}
                    allWidgetsValid={config.allowChangeSectionWithoutValidation ? true : allWidgetsValid}
                    user={user}
                />
                {confirmCompleteBeforeSwitchingOpened && (
                    <div>
                        <ConfirmModal
                            title={'' /* TODO/FIXME: should we use a title? It was omitted in legacy. */}
                            isOpen={true}
                            closeModal={closeConfirmModal}
                            text={t('main:completeSectionBeforeSwitching')}
                            showCancelButton={true}
                            showConfirmButton={false}
                            cancelButtonLabel={t('main:OK')}
                            cancelButtonColor={'blue'}
                            containsHtml={false}
                        />
                    </div>
                )}
                <form
                    onSubmit={(e) => e.preventDefault()}
                    className="apptr__form"
                    id="survey_form"
                    style={customStyle}
                    autoComplete="off"
                >
                    <SectionComponent
                        {...props}
                        key={sectionShortname}
                        loadingState={loadingState}
                        shortname={sectionShortname}
                        sectionConfig={sectionConfig}
                        // FIXME See the type of errors, there's a lang extra object in the state, but not in the component
                        errors={errors as any}
                        user={user}
                        submitted={submitted}
                    />
                </form>
                <div dangerouslySetInnerHTML={{ __html: t(['survey:footer', 'main:footer']) }} />
            </div>
        </div>
    );
};

export default withPreferencesHOC(Survey);
