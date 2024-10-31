/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons/faFolderOpen';

import InterviewSummary from './validation/InterviewSummary';
import { startSetValidateInterview } from 'evolution-frontend/lib/actions/SurveyAdmin';
import InterviewListComponent from 'evolution-frontend/lib/components/admin/review/InterviewListComponent';

class Validation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showInterviewList: false,
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

      this.props.startSetValidateInterview(interviewUuid, (interview) => {
        this.setState({
          prevInterviewUuid,
          nextInterviewUuid
        });
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
    return <p>Validation.js legacy (to be replaced)</p>;
    return (
      <div className="survey">
        <div className="admin">
          <div style={{ flexDirection: 'row', flex: '1 1 auto' }}>
            {this.props.interview && !this.state.showInterviewList &&
            <div style={{float: "right", position: "relative", left: "-3rem"}}>
                <button title={this.props.t("admin:ShowInterviewList")} onClick={() => this.handleInterviewListChange(true)}>
                    <FontAwesomeIcon icon={faFolderOpen} />
                </button>
            </div>}
            {this.props.interview &&
            <InterviewSummary
              key                          = {this.props.interview.uuid}
              handleInterviewSummaryChange = {this.handleInterviewSummaryChange}
              interview                    = {this.props.interview}
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
            validationInterview = {this.props.interview}
          />
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state, props) => {
    return {
        interview: state.survey.interview,
        interviewLoaded: state.survey.interviewLoaded,
    };
};

const mapDispatchToProps = (dispatch, props) => ({
    startSetValidateInterview: (interviewUuid, callback) => dispatch(startSetValidateInterview(interviewUuid, callback)),
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(withTranslation(['admin'])(Validation));


