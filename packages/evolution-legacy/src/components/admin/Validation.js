/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { withTranslation } from 'react-i18next';

import InterviewSummary from './validation/InterviewSummary';
import adminHelper      from '../../helpers/admin/admin.helper';
import InterviewListComponent from 'evolution-frontend/lib/components/pageParts/validations/InterviewListComponent';


class Validation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      validationInterview: null,
      prevInterviewUuid:   null,
      nextInterviewUuid:   null
    };
    this.handleInterviewSummaryChange = this.handleInterviewSummaryChange.bind(this);
  }

  handleInterviewSummaryChange(interviewUuid) {
    if(interviewUuid)
    {
      const listButton = document.getElementById(`interviewButtonList_${interviewUuid}`);
      if (!listButton) {
        // The filter probably changed, reset to null
        this.setState({validationInterview: null, prevInterviewUuid: null, nextInterviewUuid: null});
      }
      let   prevInterviewUuid = null;
      if (listButton.getAttribute('data-prev-uuid'))
      {
        prevInterviewUuid = listButton.getAttribute('data-prev-uuid');
      }
      let   nextInterviewUuid = null;
      if (listButton.getAttribute('data-next-uuid'))
      {
        nextInterviewUuid = listButton.getAttribute('data-next-uuid');
      }

      return adminHelper.getJson(`/api/interviewSummary/${interviewUuid}`).then(function(response) {
        if (response.status === 'success' && response.interview)
        {
          this.setState(function(state) {
            return {
              validationInterview: response.interview,
              prevInterviewUuid,
              nextInterviewUuid
            };
          });
        }
        else
        {
          throw response.error;
        }
      }.bind(this)).catch(function(error) {
        console.log('InterviewSummary', error);
      });
    }
    else
    {
      this.setState(function(state) {
        return { validationInterview: null };
      });
    }

  }

  render() {
    return (
      <div className="survey">
        <div className="admin">
          {
            this.state.validationInterview !== null &&
            <InterviewSummary
              handleInterviewSummaryChange = {this.handleInterviewSummaryChange}
              interview                    = {this.state.validationInterview}
              prevInterviewUuid            = {this.state.prevInterviewUuid}
              nextInterviewUuid            = {this.state.nextInterviewUuid}
            />
          }
          <InterviewListComponent
            onInterviewSummaryChanged={this.handleInterviewSummaryChange}
            initialSortBy={[{id: 'responses.accessCode'}]}
          />

        </div>
      </div>
    );

  }

}

export default withTranslation()(Validation)