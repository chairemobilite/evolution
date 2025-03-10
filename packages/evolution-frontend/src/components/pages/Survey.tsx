/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { withTranslation, WithTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import moment from 'moment';
import _get from 'lodash/get';

import config from 'chaire-lib-common/lib/config/shared/project.config';
import appConfig from '../../config/application.config';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import Section from '../pageParts/Section';
import SectionNav from '../pageParts/SectionNav';
import {
    startSetInterview,
    startUpdateInterview,
    startAddGroupedObjects,
    startRemoveGroupedObjects
} from '../../actions/Survey';
import ConfirmModal from 'chaire-lib-frontend/lib/components/modal/ConfirmModal';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { validateAllWidgets } from '../../actions/utils';
import { withPreferencesHOC } from '../hoc/WithPreferencesHoc';
import { overrideConsoleLogs } from '../../services/errorManagement/errorHandling';
import { restoreConsoleLogs } from '../../services/errorManagement/errorHandling';
import { UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { withSurveyContext, WithSurveyContextProps } from '../hoc/WithSurveyContextHoc';
import { InterviewContext, InterviewState } from '../../contexts/InterviewContext';
import { SectionProps } from '../hooks/useSectionTemplate';
import {
    StartAddGroupedObjects,
    StartRemoveGroupedObjects,
    StartUpdateInterview
} from 'evolution-common/lib/services/questionnaire/types';
import { RootState } from '../../store/configureStore';
import { ThunkDispatch } from 'redux-thunk';
import { SurveyAction } from '../../store/survey';

export type SurveyProps = {
    interview: UserRuntimeInterviewAttributes;
    interviewLoaded: boolean;
    errors: { [path: string]: string };
    submitted: boolean;
    user: CliUser;
    loadingState: number;
    sectionShortname?: string;
    // FIXME Only admin should be able to specify UUID. It should be handled differently to avoid having this in the props
    uuid?: string;
    location: Location;
    interviewContext: InterviewState;
    startSetInterview: (
        activeSection: string | null,
        surveyUuid: string | undefined,
        preFilledResponses: { [key: string]: unknown } | undefined
    ) => void;
    startUpdateInterview: StartUpdateInterview;
    startAddGroupedObjects: StartAddGroupedObjects;
    startRemoveGroupedObjects: StartRemoveGroupedObjects;
} & WithTranslation &
    WithSurveyContextProps;

type SurveyState = {
    confirmCompleteBeforeSwitchingOpened: boolean;
};

class Survey extends React.Component<SurveyProps, SurveyState> {
    constructor(props) {
        super(props);
        surveyHelperNew.devLog('params_survey', props.location.search);
        this.state = {
            confirmCompleteBeforeSwitchingOpened: false
        };
        // set language if empty and change locale:
        if (!props.i18n.language || config.languages.indexOf(props.i18n.language) <= -1) {
            props.i18n.changeLanguage(config.defaultLocale);
        }
        moment.locale(props.i18n.language);

        this.closeConfirmModal = this.closeConfirmModal.bind(this);
        this.onChangeSection = this.onChangeSection.bind(this);
    }

    closeConfirmModal(e) {
        if (e) {
            e.preventDefault();
        }
        this.setState({ confirmCompleteBeforeSwitchingOpened: false });
    }

    componentDidMount() {
        const surveyUuid = this.props.uuid;
        const existingActiveSection: string | null = this.props.interview
            ? (surveyHelperNew.getResponse(this.props.interview, '_activeSection', null) as string | null)
            : null;
        const pathSectionShortname: string | null = this.props.sectionShortname || null;
        const pathSectionParentSection: string | null =
            pathSectionShortname && this.props.surveyContext.sections[pathSectionShortname]
                ? (this.props.surveyContext.sections[pathSectionShortname].parentSection as string | null)
                : null;
        this.props.startSetInterview(
            existingActiveSection || pathSectionParentSection,
            surveyUuid,
            this.props.interviewContext.status === 'entering' &&
                Object.keys(this.props.interviewContext.responses).length > 0
                ? this.props.interviewContext.responses
                : undefined
        );

        // Override the window.console functions to log errors and warnings to the server. It is here because it's the top most component with an interview to associate with
        overrideConsoleLogs({ getInterviewId: () => (this.props.interview ? this.props.interview.id : undefined) });
    }

    componentWillUnmount() {
        // Reset the console functions to their original values
        restoreConsoleLogs();
    }

    onChangeSection(
        parentSection: string,
        activeSection: string,
        allWidgetsValid: boolean,
        e?: React.FormEvent<HTMLFormElement>
    ) {
        if (e) {
            e.preventDefault();
        }
        if (activeSection === parentSection) {
            return null;
        }
        if (allWidgetsValid) {
            this.props.startUpdateInterview(activeSection, {
                'responses._activeSection': parentSection
            });
        } else {
            this.setState(
                () => ({
                    confirmCompleteBeforeSwitchingOpened: true
                }),
                () => {
                    const scrollPosition = _get(
                        document.getElementsByClassName('question-invalid'),
                        '[0].offsetTop',
                        null
                    );
                    if (scrollPosition && scrollPosition >= 0) {
                        window.scrollTo(0, scrollPosition);
                    }
                }
            );
        }
    }

    render() {
        if (!this.props.interviewLoaded || !this.props.interview || !this.props.interview.sectionLoaded) {
            surveyHelperNew.devLog('%c rendering empty survey', 'background: rgba(0,0,0,0.1);');
            return <LoadingPage />;
        }

        const allWidgetsValid = this.props.interview ? validateAllWidgets(this.props.interview) : true;

        const activeSection = surveyHelperNew.getResponse(this.props.interview, '_activeSection', null);
        if (!activeSection || this.props.interview.sectionLoaded !== activeSection) {
            surveyHelperNew.devLog('%c rendering empty survey', 'background: rgba(0,0,0,0.1);');
            return <LoadingPage />;
        }

        surveyHelperNew.devLog(
            `%c rendering survey with activeSection ${activeSection}`,
            'background: rgba(0,0,0,0.2);'
        );

        const sectionShortname = activeSection;
        const sectionConfig = this.props.surveyContext.sections[sectionShortname];

        let SectionComponent: React.ComponentType<SectionProps> = Section;
        if (sectionConfig.template) {
            if (appConfig.templateMapping[sectionConfig.template]) {
                SectionComponent = appConfig.templateMapping[sectionConfig.template];
            } else {
                console.error(`Template ${sectionConfig.template} not found in appConfig.templateMapping`);
            }
        }

        //let navActiveSection: string | null = activeSection;

        // use parent section name as active section if active section is set to be hidden in navigation:
        // Right now this is ignored and commented. TODO/FIXME: implement? Find what it should do?
        // if (
        //     this.props.surveyContext.sections[activeSection] &&
        //     this.props.surveyContext.sections[activeSection].parentSection !== undefined
        // ) {
        //     navActiveSection = this.props.surveyContext.sections[activeSection].parentSection as string;
        // }

        let customStyle: React.CSSProperties = {};

        if (
            activeSection &&
            this.props.surveyContext.sections[activeSection] &&
            this.props.surveyContext.sections[activeSection].customStyle
        ) {
            customStyle = this.props.surveyContext.sections[activeSection].customStyle as React.CSSProperties;
        }

        let surveyContainerStyle: React.CSSProperties = {};
        if (config.logoPaths) {
            surveyContainerStyle = {
                backgroundImage: `url(${config.logoPaths[this.props.i18n.language]}), url(/dist/images/ornaments/ornament_flower_points_pale.svg)`,
                backgroundSize: '15rem, 6rem',
                backgroundPosition: 'left 1rem bottom 1rem, right 1rem top 100.5%',
                backgroundRepeat: 'no-repeat, no-repeat'
            };
        }

        return (
            <div className="survey" style={surveyContainerStyle}>
                <div style={{ width: '100%', margin: '0 auto' }}>
                    <SectionNav
                        sections={this.props.surveyContext.sections}
                        onChangeSection={this.onChangeSection}
                        activeSection={activeSection}
                        interview={this.props.interview}
                        allWidgetsValid={config.allowChangeSectionWithoutValidation ? true : allWidgetsValid}
                        user={this.props.user}
                    />
                    {this.state.confirmCompleteBeforeSwitchingOpened && (
                        <div>
                            <ConfirmModal
                                title={'' /* TODO/FIXME: should we use a title? It was omitted in legacy. */}
                                isOpen={true}
                                closeModal={this.closeConfirmModal}
                                text={this.props.t('main:completeSectionBeforeSwitching')}
                                showCancelButton={true}
                                showConfirmButton={false}
                                cancelButtonLabel={this.props.t('main:OK')}
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
                            key={sectionShortname}
                            loadingState={this.props.loadingState}
                            shortname={sectionShortname}
                            sectionConfig={sectionConfig}
                            interview={this.props.interview}
                            errors={this.props.errors}
                            user={this.props.user}
                            startUpdateInterview={this.props.startUpdateInterview}
                            startAddGroupedObjects={this.props.startAddGroupedObjects}
                            startRemoveGroupedObjects={this.props.startRemoveGroupedObjects}
                            submitted={this.props.submitted}
                        />
                    </form>
                    <div dangerouslySetInnerHTML={{ __html: this.props.t(['survey:footer', 'main:footer']) }} />
                </div>
            </div>
        );
    }
}

const MainSurvey = withTranslation()(withSurveyContext(withPreferencesHOC(Survey)));

const SurveyWrapper: React.FC = (props) => {
    const interview = useSelector((state: RootState) => state.survey.interview);
    const interviewLoaded = useSelector((state: RootState) => state.survey.interviewLoaded);
    const errors = useSelector((state: RootState) => state.survey.errors);
    const submitted = useSelector((state: RootState) => state.survey.submitted);
    const user = useSelector((state: RootState) => state.auth.user);
    const loadingState = useSelector((state: RootState) => state.loadingState.loadingState);
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, SurveyAction>>();
    const navigate = useNavigate();
    const location = useLocation();
    const { sectionShortname, uuid } = useParams();
    const { state } = React.useContext(InterviewContext);

    const startSetInterviewAction = (sectionShortname, surveyUuid, preFilledResponses) =>
        dispatch(startSetInterview(sectionShortname, surveyUuid, navigate, preFilledResponses));
    const startUpdateInterviewAction: StartUpdateInterview = (
        sectionShortname,
        valuesByPath,
        unsetPaths,
        interview,
        callback
    ) => dispatch(startUpdateInterview(sectionShortname, valuesByPath, unsetPaths, interview, callback, navigate));
    const startAddGroupedObjectsAction: StartAddGroupedObjects = (
        newObjectsCount,
        insertSequence,
        path,
        attributes,
        callback,
        returnOnly
    ) => dispatch(startAddGroupedObjects(newObjectsCount, insertSequence, path, attributes, callback, returnOnly));
    const startRemoveGroupedObjectsAction: StartRemoveGroupedObjects = (paths, callback, returnOnly) =>
        dispatch(startRemoveGroupedObjects(paths, callback, returnOnly));

    return (
        <MainSurvey
            {...props}
            sectionShortname={sectionShortname}
            uuid={uuid}
            interview={interview}
            interviewLoaded={interviewLoaded}
            errors={errors}
            submitted={submitted}
            user={user}
            loadingState={loadingState}
            location={location}
            interviewContext={state}
            startSetInterview={startSetInterviewAction}
            startUpdateInterview={startUpdateInterviewAction}
            startAddGroupedObjects={startAddGroupedObjectsAction}
            startRemoveGroupedObjects={startRemoveGroupedObjectsAction}
        />
    );
};

export default SurveyWrapper;
