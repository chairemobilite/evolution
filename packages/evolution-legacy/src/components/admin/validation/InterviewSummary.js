/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';

import LoadingPage      from '../../shared/LoadingPage';
import ValidationOnePageSummary from './ValidationOnePageSummary';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import { startSetValidateInterview, startUpdateValidateInterview, startResetValidateInterview } from '../../../actions/survey/survey';
import { withSurveyContext } from 'evolution-frontend/lib/components/hoc/WithSurveyContextHoc';
import ValidationLinks from 'evolution-frontend/lib/components/admin/validations/ValidationLinks';
import AdminErrorBoundary from 'evolution-frontend/lib/components/admin/AdminErrorBoundary';


class InterviewSummary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loaded: false
    }
  }

  refreshInterview() {
    // FIXME was previously this line, but we are not using the interview from the global state, so we may just call the summary change again
    this.props.startSetValidateInterview(this.props.interview.uuid, (interview) => {
      this.setState({ loaded: true })
    });
    this.props.handleInterviewSummaryChange(this.props.interview.uuid);
  }

  resetInterview() {
    this.props.startResetValidateInterview(this.props.interview.uuid, (interview) => {
      this.props.handleInterviewSummaryChange(interview.uuid);
    });
  }

  componentDidMount() {
    this.refreshInterview();

    //this.forceUpdate();
  }

  updateValuesByPath(valuesByPath, e) {
    if (e && e.preventDefault) {
        e.preventDefault();
    }
    this.props.startUpdateInterview(null, valuesByPath);
  }

  render(){

    if (!(this.props.interview && this.state.loaded)) {
      surveyHelperNew.devLog('%c rendering empty survey', 'background: rgba(0,0,0,0.1);');
      return (
        <div className="admin-widget-container"><LoadingPage /></div>
      );
    }

    return (
      <div className="admin-widget-container">
        <div className="survey validation">
          <div className="admin__stats-container">
            <ValidationLinks
                handleInterviewSummaryChange={this.props.handleInterviewSummaryChange}
                updateValuesByPath={this.updateValuesByPath}
                interviewIsValid={this.props.interview.is_valid}
                interviewIsQuestionable={this.props.interview.is_questionable}
                interviewIsComplete={this.props.interview.is_completed}
                interviewIsValidated={this.props.interview.is_validated}
                interviewUuid={this.props.interview.uuid}
                prevInterviewUuid={this.props.prevInterviewUuid}
                nextInterviewUuid={this.props.nextInterviewUuid}
                refreshInterview={this.refreshInterview}
                resetInterview={this.resetInterview}
                user={this.props.user}
                t={this.props.t}
            />
            { this.props.interview.validationDataDirty && <FormErrors
                errors={[this.props.t(['admin:ValidationDataDirty'])]}
                errorType="Warning"
            />}
          </div>
          <AdminErrorBoundary>
            <ValidationOnePageSummary
              key                          = {this.props.interview.uuid}
              interview                    = {this.props.interview}
              prevInterviewUuid            = {this.props.prevInterviewUuid}
              nextInterviewUuid            = {this.props.nextInterviewUuid}
              handleInterviewSummaryChange = {this.props.handleInterviewSummaryChange}
            /> {/* key change will force remount the component*/}
          </AdminErrorBoundary>
        </div>
      </div>
    );

  }
}


const mapStateToProps = (state, props) => {
  return {
      errors: state.survey.errors,
      submitted: state.survey.submitted,
      user: state.auth.user,
      loadingState: state.loadingState.loadingState
  };
};

const mapDispatchToProps = (dispatch, props) => ({
  startSetValidateInterview: (interviewUuid, callback) => dispatch(startSetValidateInterview(interviewUuid, callback)),
  startUpdateInterview: (sectionShortname, valuesByPath, unsetPaths, interview, callback) => dispatch(startUpdateValidateInterview(sectionShortname, valuesByPath, unsetPaths, interview, callback)),
  startResetValidateInterview: (interviewUuid, callback) => dispatch(startResetValidateInterview(interviewUuid, callback))
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withTranslation()(withSurveyContext(InterviewSummary)));
