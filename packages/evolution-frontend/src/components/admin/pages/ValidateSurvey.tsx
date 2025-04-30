/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { useLocation, useParams } from 'react-router';
import { WithTranslation, withTranslation } from 'react-i18next';
import moment from 'moment';
import _get from 'lodash/get';

import config from 'chaire-lib-common/lib/config/shared/project.config';
import appConfig from '../../../config/application.config';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import Section from '../../pageParts/Section';
import SectionNav from '../../pageParts/SectionNav';
import { withSurveyContext, WithSurveyContextProps } from '../../hoc/WithSurveyContextHoc';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import {
    startSetSurveyValidateInterview,
    startUpdateSurveyValidateInterview,
    startSurveyValidateAddGroupedObjects,
    startSurveyValidateRemoveGroupedObjects
} from '../../../actions/SurveyAdmin';
import { InterviewContext } from '../../../contexts/InterviewContext';
import { withPreferencesHOC } from '../../hoc/WithPreferencesHoc';
import {
    StartAddGroupedObjects,
    StartRemoveGroupedObjects,
    StartUpdateInterview,
    UserRuntimeInterviewAttributes
} from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { InterviewState } from '../../../contexts/InterviewContext';
import { RootState } from '../../../store/configureStore';
import { SurveyAction } from '../../../store/survey';
import { SectionProps } from '../../hooks/useSectionTemplate';

type StartSetInterview = (surveyUuid: string, callback?: (interview: UserRuntimeInterviewAttributes) => void) => void;

export type SurveyProps = {
    interview: UserRuntimeInterviewAttributes;
    interviewLoaded: boolean;
    errors: { [path: string]: string };
    submitted: boolean;
    user: CliUser;
    loadingState: number;
    sectionShortname?: string;
    interviewUuid: string;
    location: Location;
    interviewContext: InterviewState;
    // FIXME This is the only difference with the Survey component props. Different name and arguments
    startSetSurveyValidateInterview: StartSetInterview;
    startUpdateInterview: StartUpdateInterview;
    startAddGroupedObjects: StartAddGroupedObjects;
    startRemoveGroupedObjects: StartRemoveGroupedObjects;
} & WithTranslation &
    WithSurveyContextProps;

type SurveyState = {
    confirmCompleteBeforeSwitchingOpened: boolean;
};

/**
 * FIXME See if we can factor out the differences between the Survey and
 * ValidateSurvey components and send them as prop to a single common Survey
 * component.
 */
export class ValidateSurvey extends React.Component<SurveyProps, SurveyState> {
    constructor(props) {
        super(props);
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
        this.onKeyPress = this.onKeyPress.bind(this);
    }

    closeConfirmModal(e) {
        if (e) {
            e.preventDefault();
        }
        this.setState({ confirmCompleteBeforeSwitchingOpened: false });
    }

    componentDidMount() {
        const interviewUuid = this.props.interviewUuid;
        this.props.startSetSurveyValidateInterview(interviewUuid);
    }

    onKeyPress(e) {
        if (e.which === 13 && e.target.tagName.toLowerCase() !== 'textarea' /* Enter */) {
            e.preventDefault();
        }
    }

    onChangeSection(parentSection, activeSection, allWidgetsValid, e) {
        if (e) {
            e.preventDefault();
        }
        //surveyHelperNew.devLog('onChangeSection', parentSection, activeSection);
        if (activeSection === parentSection) {
            return null;
        }
        if (allWidgetsValid) {
            this.props.startUpdateInterview({
                sectionShortname: activeSection,
                valuesByPath: { 'responses._activeSection': parentSection }
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

        let customStyle = {};

        if (
            activeSection &&
            this.props.surveyContext.sections[activeSection] &&
            this.props.surveyContext.sections[activeSection].customStyle
        ) {
            customStyle = this.props.surveyContext.sections[activeSection].customStyle;
        }

        let surveyContainerStyle = {};
        if (config.logoPaths) {
            surveyContainerStyle = {
                /*backgroundImage: `url(/dist/images/ornaments/ornament_wide_bottom_pale.svg), url(${config.logoPaths[this.props.i18n.language]}), url(/dist/images/ornaments/ornament_flower_points_pale.svg)`,
                backgroundSize: "12rem, 15rem, 6rem",
                backgroundPosition: "center 1.8em, left 1rem bottom 1rem, right 1rem top 100.5%",
                backgroundRepeat: "no-repeat, no-repeat, no-repeat"*/
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
                        allWidgetsValid={true}
                        user={this.props.user}
                    />
                    <form
                        onKeyPress={this.onKeyPress}
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
                </div>
            </div>
        );
    }
}

const MainValidateSurvey = withTranslation()(withSurveyContext(withPreferencesHOC(ValidateSurvey)));

const ValidateSurveyWrapper = (props) => {
    const interview = useSelector((state: RootState) => state.survey.interview);
    const interviewLoaded = useSelector((state: RootState) => state.survey.interviewLoaded);
    const errors = useSelector((state: RootState) => state.survey.errors);
    const submitted = useSelector((state: RootState) => state.survey.submitted);
    const user = useSelector((state: RootState) => state.auth.user);
    const loadingState = useSelector((state: RootState) => state.loadingState.loadingState);
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, SurveyAction>>();
    const location = useLocation();
    const { sectionShortname, interviewUuid } = useParams();
    const { state } = React.useContext(InterviewContext);

    const startSetInterviewAction: StartSetInterview = (interviewUuid, callback) =>
        dispatch(startSetSurveyValidateInterview(interviewUuid, callback));
    const startUpdateInterviewAction: StartUpdateInterview = (data, callback) =>
        dispatch(startUpdateSurveyValidateInterview(data, callback));
    const startAddGroupedObjectsAction: StartAddGroupedObjects = (
        newObjectsCount,
        insertSequence,
        path,
        attributes,
        callback,
        returnOnly
    ) =>
        dispatch(
            startSurveyValidateAddGroupedObjects(
                newObjectsCount,
                insertSequence,
                path,
                attributes,
                callback,
                returnOnly
            )
        );
    const startRemoveGroupedObjectsAction: StartRemoveGroupedObjects = (paths, callback, returnOnly) =>
        dispatch(startSurveyValidateRemoveGroupedObjects(paths, callback, returnOnly));

    return (
        <MainValidateSurvey
            {...props}
            sectionShortname={sectionShortname}
            interviewUuid={interviewUuid}
            interview={interview}
            interviewLoaded={interviewLoaded}
            errors={errors}
            submitted={submitted}
            user={user}
            loadingState={loadingState}
            location={location}
            interviewContext={state}
            startSetSurveyValidateInterview={startSetInterviewAction}
            startUpdateInterview={startUpdateInterviewAction}
            startAddGroupedObjects={startAddGroupedObjectsAction}
            startRemoveGroupedObjects={startRemoveGroupedObjectsAction}
        />
    );
};

export default ValidateSurveyWrapper;
