/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router';
import { withTranslation } from 'react-i18next';
import moment              from 'moment-business-days';
import _get                from 'lodash/get';

import config                 from 'chaire-lib-common/lib/config/shared/project.config';
import * as surveyHelperNew   from 'evolution-common/lib/utils/helpers';
import Section                from 'evolution-frontend/lib/components/pageParts/Section';
import SectionNav             from 'evolution-frontend/lib/components/pageParts/SectionNav';
import { withSurveyContext } from 'evolution-frontend/lib/components/hoc/WithSurveyContextHoc';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { startSetSurveyValidateInterview, startUpdateSurveyValidateInterview, startSurveyValidateAddGroupedObjects, startSurveyValidateRemoveGroupedObjects } from 'evolution-frontend/lib/actions/SurveyAdmin';
import { InterviewContext } from 'evolution-frontend/lib/contexts/InterviewContext';
import { withPreferencesHOC } from 'evolution-frontend/lib/components/hoc/WithPreferencesHoc';

export class ValidateSurvey extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
        confirmCompleteBeforeSwitchingOpened: false
    };
    // set language if empty and change locale:
    if (!props.i18n.language || config.languages.indexOf(props.i18n.language) <= -1)
    {
      props.i18n.changeLanguage(config.defaultLocale);
    }
    moment.locale(props.i18n.language);
    this.surveyContext = props.surveyContext;

    this.closeConfirmModal = this.closeConfirmModal.bind(this);
    this.onChangeSection   = this.onChangeSection.bind(this);
    this.onKeyPress        = this.onKeyPress.bind(this);
  }

  closeConfirmModal(e) {
    if (e)
    {
      e.preventDefault();
    }
    this.setState({confirmCompleteBeforeSwitchingOpened: false});
  }

  componentDidMount() {
    const interviewUuid = this.props.interviewUuid;
    this.props.startSetSurveyValidateInterview(interviewUuid);
  }

  onKeyPress(e) {
    if (e.which === 13 && e.target.tagName.toLowerCase() !== 'textarea' /* Enter */)
    {
      e.preventDefault();
    }
  }

  onChangeSection(parentSection, activeSection, allWidgetsValid, e) {
    if (e)
    {
      e.preventDefault();
    }
    //surveyHelperNew.devLog('onChangeSection', parentSection, activeSection);
    if (activeSection === parentSection)
    {
      return null;
    }
    if (allWidgetsValid)
    {
      this.props.startUpdateInterview(activeSection, {
        'responses._activeSection': parentSection
      });
    }
    else
    {
      this.setState(() => ({
        confirmCompleteBeforeSwitchingOpened: true
      }), function() {
        const scrollPosition = _get(document.getElementsByClassName('question-invalid'), '[0].offsetTop', null);
        if (scrollPosition && scrollPosition >= 0)
        {
          window.scrollTo(0,scrollPosition);
        }
      });
    }
  }

  render() {

    if (this.props.interviewLoaded && this.props.interview && this.props.interview.sectionLoaded)
    {
      const activeSection = surveyHelperNew.getResponse(this.props.interview, "_activeSection", null);
      if (activeSection && this.props.interview.sectionLoaded === activeSection)
      {

        surveyHelperNew.devLog(`%c rendering survey with activeSection ${activeSection}`, 'background: rgba(0,0,0,0.2);');

        const sectionShortname = activeSection;
        const sectionConfig    = this.surveyContext.sections[sectionShortname];
        const SectionComponent = sectionConfig.template ? sectionConfig.template : Section;
        let   navActiveSection = activeSection;

        // use parent section name as active section if active section is set to be hidden in navigation:
        if (this.surveyContext.sections[activeSection] && this.surveyContext.sections[activeSection].parentSection !== undefined)
        {
          navActiveSection = this.surveyContext.sections[activeSection].parentSection;
        }

        let customStyle = {};

        if (activeSection && this.surveyContext.sections[activeSection] && this.surveyContext.sections[activeSection].customStyle)
        {
          customStyle = this.surveyContext.sections[activeSection].customStyle;
        }

        let surveyContainerStyle = {};
        if (config.logoPaths)
        {
            surveyContainerStyle = {
                /*backgroundImage: `url(/dist/images/ornaments/ornament_wide_bottom_pale.svg), url(${config.logoPaths[this.props.i18n.language]}), url(/dist/images/ornaments/ornament_flower_points_pale.svg)`,
                backgroundSize: "12rem, 15rem, 6rem",
                backgroundPosition: "center 1.8em, left 1rem bottom 1rem, right 1rem top 100.5%",
                backgroundRepeat: "no-repeat, no-repeat, no-repeat"*/
                backgroundImage: `url(${config.logoPaths[this.props.i18n.language]}), url(/dist/images/ornaments/ornament_flower_points_pale.svg)`,
                backgroundSize: "15rem, 6rem",
                backgroundPosition: "left 1rem bottom 1rem, right 1rem top 100.5%",
                backgroundRepeat: "no-repeat, no-repeat"
            };
        }

        return (
          <div className="survey" style={surveyContainerStyle}>
            <div style={{width: '100%', margin: '0 auto'}}>
              <SectionNav
                sections             = {this.surveyContext.sections}
                onChangeSection      = {this.onChangeSection}
                activeSection        = {activeSection}
                interview            = {this.props.interview}
                allWidgetsValid      = {true}
                user                 = {this.props.user}
              />
              <form onKeyPress={this.onKeyPress} className="apptr__form" id="survey_form" style={customStyle} autoComplete="off">
                <SectionComponent
                  key                         = {sectionShortname}
                  loadingState                = {this.props.loadingState}
                  shortname                   = {sectionShortname}
                  sectionConfig               = {sectionConfig}
                  interview                   = {this.props.interview}
                  errors                      = {this.props.errors}
                  user                        = {this.props.user}
                  startUpdateInterview        = {this.props.startUpdateInterview}
                  startAddGroupedObjects      = {this.props.startAddGroupedObjects}
                  startRemoveGroupedObjects   = {this.props.startRemoveGroupedObjects}
                  location                    = {this.props.location}
                  submitted                   = {this.props.submitted}
                />
              </form>
            </div>
          </div>
        );
      }
    }
    surveyHelperNew.devLog('%c rendering empty survey', 'background: rgba(0,0,0,0.1);');
    return <LoadingPage />;
  }

}

const MainSurvey = withTranslation()(withSurveyContext(withPreferencesHOC(ValidateSurvey)));

const ValidateSurveyWrapper = (props) => {
    const interview = useSelector((state) => state.survey.interview);
    const interviewLoaded = useSelector((state) => state.survey.interviewLoaded);
    const errors = useSelector((state) => state.survey.errors);
    const submitted = useSelector((state) => state.survey.submitted);
    const user = useSelector((state) => state.auth.user);
    const loadingState = useSelector((state) => state.loadingState.loadingState);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { sectionShortname, interviewUuid } = useParams();
    const { state } = React.useContext(InterviewContext);

    const startSetInterviewAction = (interviewUuid, callback) =>
        dispatch(startSetSurveyValidateInterview(interviewUuid, callback));
    const startUpdateInterviewAction = (sectionShortname, valuesByPath, unsetPaths, interview, callback) =>
        dispatch(startUpdateSurveyValidateInterview(sectionShortname, valuesByPath, unsetPaths, interview, callback, navigate));
    const startAddGroupedObjectsAction = (newObjectsCount, insertSequence, path, attributes, callback, returnOnly) =>
        dispatch(startSurveyValidateAddGroupedObjects(newObjectsCount, insertSequence, path, attributes, callback, returnOnly));
    const startRemoveGroupedObjectsAction = (paths, callback, returnOnly) =>
        dispatch(startRemoveGroupedObjectsAction(paths, callback, returnOnly));

    return (
        <MainSurvey
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
