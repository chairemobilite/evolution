/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { withTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons/faFolderOpen';

import InterviewSummary from './validation/InterviewSummary';
import adminHelper from '../../helpers/admin/admin.helper';
import InterviewListComponent from 'evolution-frontend/lib/components/pageParts/validations/InterviewListComponent';

class Validation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showInterviewList: false,
      validationInterview: null,
      prevInterviewUuid:   null,
      nextInterviewUuid:   null
    };
    this.handleInterviewSummaryChange = this.handleInterviewSummaryChange.bind(this);
    this.handleInterviewListChange = (showInterviewList) => this.setState({ showInterviewList })
  }

  handleInterviewSummaryChange(interviewUuid) {
    if(interviewUuid)
    {
      const listButton = document.getElementById(`interviewButtonList_${interviewUuid}`);
      if (!listButton) {
        // The filter probably changed, reset to null
        this.setState({validationInterview: null, prevInterviewUuid: null, nextInterviewUuid: null});
      }
      let prevInterviewUuid = null;
      if (listButton.getAttribute('data-prev-uuid'))
      {
        prevInterviewUuid = listButton.getAttribute('data-prev-uuid');
      }
      let nextInterviewUuid = null;
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
          <div style={{ flexDirection: 'row', flex: '1 1 auto' }}>
            {this.state.validationInterview !== null && !this.state.showInterviewList &&
            <div style={{float: "right", position: "relative", left: "-3rem"}}>
                <button title={this.props.t("admin:ShowInterviewList")} onClick={() => this.handleInterviewListChange(true)}>
                    <FontAwesomeIcon icon={faFolderOpen} />
                </button>
            </div>}
            {this.state.validationInterview !== null &&
            <InterviewSummary
              key                          = {this.state.validationInterview.uuid}
              handleInterviewSummaryChange = {this.handleInterviewSummaryChange}
              interview                    = {this.state.validationInterview}
              prevInterviewUuid            = {this.state.prevInterviewUuid}
              nextInterviewUuid            = {this.state.nextInterviewUuid}
              interviewListChange          = {this.handleInterviewListChange}
            />
            }
          </div>
          <InterviewListComponent
            onInterviewSummaryChanged={this.handleInterviewSummaryChange}
            initialSortBy={[{id: 'responses.accessCode'}]}
            interviewListChange={this.handleInterviewListChange}
            showInterviewList = {this.state.showInterviewList}
            validationInterview = {this.state.validationInterview}
          />
        </div>
      </div>
    );
  }
}

export default withTranslation(['admin'])(Validation)
