/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';

import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import ValidationOnePageSummary from './ValidationOnePageSummary';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import { startSetValidateInterview, startUpdateValidateInterview, startResetValidateInterview } from '../../../actions/survey/survey';
import { withSurveyContext } from 'evolution-frontend/lib/components/hoc/WithSurveyContextHoc';
import ValidationLinks from 'evolution-frontend/lib/components/admin/validations/ValidationLinks';
import AdminErrorBoundary from 'evolution-frontend/lib/components/admin/AdminErrorBoundary';


class InterviewSummary extends React.Component {
  constructor(props) {
    super(props);

  }

  refreshInterview = () => {
    this.props.startSetValidateInterview(this.props.interview.uuid)
  }

  resetInterview = () => {
    this.props.startResetValidateInterview(this.props.interview.uuid);
  }

  updateValuesByPath = (valuesByPath, e) => {
    if (e && e.preventDefault) {
        e.preventDefault();
    }
    this.props.startUpdateInterview(null, valuesByPath);
  }

  render = () => {
    if (!(this.props.interview)) {
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
      interview: state.survey.interview,
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
