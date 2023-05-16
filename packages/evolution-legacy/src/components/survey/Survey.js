/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { connect }         from 'react-redux';
import { withTranslation } from 'react-i18next';
import moment              from 'moment-business-days';
import _get                from 'lodash.get';

import config                                                                                         from 'chaire-lib-common/lib/config/shared/project.config';
import Preferences from 'chaire-lib-common/lib/config/Preferences';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import Section                                                                                        from './Section';
import SectionNav                                                                                     from './SectionNav';
import { startSetInterview, startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects } from '../../actions/survey/survey';
import ConfirmModal                                                                                   from './modal/ConfirmModal';
import LoadingPage                                                                                    from '../shared/LoadingPage';
import { validateAllWidgets } from 'evolution-frontend/lib/actions/utils';
import { InterviewContext } from 'evolution-frontend/lib/contexts/InterviewContext';
import { withSurveyContext } from 'evolution-frontend/lib/components/hoc/WithSurveyContextHoc';

export class Survey extends React.Component {
  static contextType = InterviewContext;

  constructor(props) {
    super(props);
    surveyHelperNew.devLog('params_survey', props.location.search)
    this.state = {
      confirmModalOpenedShortname: null,
      preferencesLoaded: false
    };
    // set language if empty and change locale:
    if (!props.i18n.language || config.languages.indexOf(props.i18n.language) <= -1)
    {
      props.i18n.changeLanguage(config.defaultLocale);
    }
    moment.locale(props.i18n.language);
    this.surveyContext = props.surveyContext;

    this.openConfirmModal  = this.openConfirmModal.bind(this);
    this.closeConfirmModal = this.closeConfirmModal.bind(this);
    this.onChangeSection   = this.onChangeSection.bind(this);
    this.onKeyPress        = this.onKeyPress.bind(this);
  }

  openConfirmModal(confirmModalShortname, e) {
    if (e)
    {
      e.preventDefault();
    }
    this.setState({confirmModalOpenedShortname: confirmModalShortname});
  }

  closeConfirmModal(e) {
    if (e)
    {
      e.preventDefault();
    }
    this.setState({confirmModalOpenedShortname: null});
  }

  componentDidMount() {
    const surveyUuid = _get(this.props.match, 'params.uuid', null);
    const existingActiveSection    = this.props.interview ? surveyHelperNew.getResponse(this.props.interview, '_activeSection', null) : null;
    const pathSectionShortname     = _get(this.props.match, 'params.sectionShortname', null);
    const pathSectionParentSection = pathSectionShortname && this.surveyContext.sections[pathSectionShortname] ? this.surveyContext.sections[pathSectionShortname].parentSection : null;
    const { state } = this.context;
    this.props.startSetInterview(existingActiveSection || pathSectionParentSection, surveyUuid, state.status === 'entering' && Object.keys(state.responses).length > 0 ? state.responses : undefined);
    Preferences.load().then(() => {
        this.setState({ preferencesLoaded: true })
    });
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
        confirmModalOpenedShortname: 'confirmModalCompleteSectionBeforeSwitching'
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
      const allWidgetsValid = this.props.interview ? validateAllWidgets(this.props.interview) : true;

      const activeSection = surveyHelperNew.getResponse(this.props.interview, "_activeSection", null);
      if (activeSection && this.props.interview.sectionLoaded === activeSection)
      {

        surveyHelperNew.devLog(`%c rendering survey with activeSection ${activeSection}`, 'background: rgba(0,0,0,0.2);');
        
        const sectionShortname = activeSection;
        const sectionConfig    = this.surveyContext.sections[sectionShortname];
        const SectionComponent = sectionConfig.template ? sectionConfig.template : Section;
        let   navActiveSection = activeSection;

        // use parent section name as active section if active section is set to be hidden in navigation:
        if (this.surveyContext.sections[activeSection] && this.surveyContext.sections[activeSection].hiddenInNav)
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
                allWidgetsValid      = {config.allowChangeSectionWithoutValidation ? true : allWidgetsValid}
                loadingState         = {this.props.loadingState}
                startUpdateInterview = {this.props.startUpdateInterview}
                user                 = {this.props.user}
              />
              {this.state.confirmModalOpenedShortname === 'confirmModalCompleteSectionBeforeSwitching' && (<div>
                <ConfirmModal
                  isOpen             = {true}
                  closeModal         = {this.closeConfirmModal}
                  text               = {this.props.t("main:completeSectionBeforeSwitching")}
                  showCancelButton   = {true}
                  showConfirmButton  = {false}
                  cancelButtonLabel  = {this.props.t("main:OK")}
                  cancelButtonColor  = {'blue'}
                  containsHtml       = {false}
                />
              </div>)}
              <form onKeyPress={this.onKeyPress} className="apptr__form" id="survey_form" style={customStyle} autoComplete="off">
                <SectionComponent
                  key                         = {sectionShortname}
                  loadingState                = {this.props.loadingState}
                  shortname                   = {sectionShortname}
                  previousSection             = {sectionConfig.previousSection}
                  nextSection                 = {sectionConfig.nextSection}
                  widgets                     = {sectionConfig.widgets}
                  preload                     = {sectionConfig.preload}
                  groups                      = {sectionConfig.groups}
                  interview                   = {this.props.interview}
                  errors                      = {this.props.errors}
                  user                        = {this.props.user}
                  startUpdateInterview        = {this.props.startUpdateInterview}
                  startAddGroupedObjects      = {this.props.startAddGroupedObjects}
                  startRemoveGroupedObjects   = {this.props.startRemoveGroupedObjects}
                  confirmModalOpenedShortname = {this.state.confirmModalOpenedShortname}
                  openConfirmModal            = {this.openConfirmModal}
                  closeConfirmModal           = {this.closeConfirmModal}
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

const mapStateToProps = (state, props) => {
  return {
    interview      : state.survey.interview,
    interviewLoaded: state.survey.interviewLoaded,
    errors         : state.survey.errors,
    submitted      : state.survey.submitted,
    user           : state.auth.user,
    loadingState   : state.loadingState.loadingState
  };
};

const mapDispatchToProps = (dispatch, props) => ({
  startSetInterview        : (sectionShortname, surveyUuid, preFilledResponses)                        => dispatch(startSetInterview(sectionShortname, surveyUuid, props.history, preFilledResponses)),
  startUpdateInterview     : (sectionShortname, valuesByPath, unsetPaths, interview, callback)         => dispatch(startUpdateInterview(sectionShortname, valuesByPath, unsetPaths, interview, callback, props.history)),
  startAddGroupedObjects   : (newObjectsCount, insertSequence, path, attributes, callback, returnOnly) => dispatch(startAddGroupedObjects(newObjectsCount, insertSequence, path, attributes, callback, returnOnly)),
  startRemoveGroupedObjects: (paths, callback, returnOnly)                                             => dispatch(startRemoveGroupedObjects(paths, callback, returnOnly))
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withTranslation()(withSurveyContext(Survey)));