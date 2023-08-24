/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { withTranslation } from 'react-i18next';

import InterviewSummary from './validation/InterviewSummary';
import adminHelper from '../../helpers/admin/admin.helper';
import InterviewListComponent from 'evolution-frontend/lib/components/pageParts/validations/InterviewListComponent';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder } from '@fortawesome/free-solid-svg-icons/faFolder';
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons/faFolderOpen';

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
    this.handleInterviewListChange = (bool) => this.setState(() => ({ showInterviewList: bool }))
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
          {
            this.state.validationInterview !== null &&
            <InterviewSummary
              handleInterviewSummaryChange = {this.handleInterviewSummaryChange}
              interview                    = {this.state.validationInterview}
              prevInterviewUuid            = {this.state.prevInterviewUuid}
              nextInterviewUuid            = {this.state.nextInterviewUuid}
            />
          }
          {(!this.state.validationInterview || this.state.showInterviewList)
          ? <div>
              {this.state.validationInterview !== null &&
              <button onClick={() => this.handleInterviewListChange(false)}>
                {this.state.showInterviewList &&
                <FontAwesomeIcon
                  title={this.props.t("admin:HideInterviewList")}
                  icon={faFolder}
                />}
              </button>
            }
              <InterviewListComponent
                onInterviewSummaryChanged={this.handleInterviewSummaryChange}
                initialSortBy={[{id: 'responses.accessCode'}]}
              />
            </div>
          : <button
              style={{position: "relative", top: "1rem", left: "-5rem"}}
              onClick={() => this.handleInterviewListChange(true)}
            >
              <FontAwesomeIcon
                title={this.props.t("admin:ShowInterviewList")}
                icon={faFolderOpen}
              />
            </button>
          }
        </div>
      </div>
    );
  }
}

export default withTranslation(['admin'])(Validation)
