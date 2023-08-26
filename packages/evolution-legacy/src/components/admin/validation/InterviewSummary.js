/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { withTranslation } from 'react-i18next';

import { _isBlank }     from 'chaire-lib-common/lib/utils/LodashExtensions';
import LoadingPage      from '../../shared/LoadingPage';
import ValidationSurvey from './ValidationSurvey';

class InterviewSummary extends React.Component {
  constructor(props) {
    super(props);
  }

  render(){

    if (_isBlank(this.props.interview))
    {
      return (
        <div className="admin-widget-container"><LoadingPage /></div>
      );
    }

    return (
      <div className="admin-widget-container">
        <ValidationSurvey
          key                          = {this.props.interview.uuid}
          interviewUuid                = {this.props.interview.uuid}
          prevInterviewUuid            = {this.props.prevInterviewUuid}
          nextInterviewUuid            = {this.props.nextInterviewUuid}
          handleInterviewSummaryChange = {this.props.handleInterviewSummaryChange}
          /> {/* key change will force remount the component*/}
      </div>
    );

  }
}

export default withTranslation()(InterviewSummary)
