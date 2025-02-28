/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import _get from 'lodash/get';

import appConfig from 'evolution-frontend/lib/config/application.config';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { startUpdateSurveyValidateInterview } from 'evolution-frontend/lib/actions/SurveyAdmin';
import ValidationCommentForm from 'evolution-frontend/lib/components/admin/validations/ValidationCommentForm';
import AdminErrorBoundary from 'evolution-frontend/lib/components/admin/hoc/AdminErrorBoundary';
import { generateMapFeatureFromInterview } from 'evolution-frontend/lib/services/admin/odSurveyAdminHelper';

let InterviewStats = appConfig.getCustomInterviewStat();
if (InterviewStats === undefined) {
    InterviewStats = require('evolution-frontend/lib/components/admin/validations/InterviewStats').default;
}

// FIXME There shouldn't be any need for custom maps now, but keeping this for compatibility with older surveys
let InterviewMap = appConfig.getCustomInterviewMap();
if (InterviewMap === undefined) {
    InterviewMap = require('evolution-frontend/lib/components/admin/validations/InterviewMap').default;
}

export const ValidationOnePageSummary = (props) => {
    const [activePlacePath, setActivePlacePath] = React.useState(null);
    const [activeTripUuid, setActiveTripUuid] = React.useState(null);

    const { placesCollection, tripsCollection, modesCollection } = appConfig.generateMapFeatures && props.interview?.surveyObjectsAndAudits 
        ? appConfig.generateMapFeatures(props.interview.surveyObjectsAndAudits) 
        : generateMapFeatureFromInterview(props.interview, { activePlacePath, activeTripUuid });

    const mapCenter = placesCollection.features.length > 0 ? placesCollection.features[0].geometry.coordinates : [config.mapDefaultCenter.lon, config.mapDefaultCenter.lat];

    return (
        <div className="survey validation">
            <div style={{ width: '100%', margin: '0 auto' }}>
                <div className="admin__interview-map-and-stats-container">
                    <div className="admin__interview-map-container">
                        <AdminErrorBoundary>
                            <InterviewMap
                                user={props.user}
                                interview={props.interview}
                                places={placesCollection}
                                trips={tripsCollection}
                                center={mapCenter}
                                selectPlace={setActivePlacePath}
                                activePlacePath={activePlacePath}
                                selectTrip={setActiveTripUuid}
                                startUpdateInterview={props.startUpdateInterview}
                            />
                        </AdminErrorBoundary>
                    </div>
                    <div className="admin__stats-container">
                        {<AdminErrorBoundary><InterviewStats
                            key={props.interview.id}
                            selectPlace={setActivePlacePath}
                            selectTrip={setActiveTripUuid}
                            activeTripUuid={activeTripUuid}
                            interview={props.interview}
                            activePlacePath={activePlacePath}
                            user={props.user}
                            startUpdateInterview={props.startUpdateInterview}
                        /></AdminErrorBoundary>}
                        <ValidationCommentForm
                            interview={props.interview}
                        />
                    </div>
                </div>
            </div>
        </div>
    );

};

const mapStateToProps = (state, props) => {
    return {
        interview: state.survey.interview,
        interviewLoaded: state.survey.interviewLoaded,
        errors: state.survey.errors,
        submitted: state.survey.submitted,
        user: state.auth.user,
        loadingState: state.loadingState.loadingState
    };
};

const mapDispatchToProps = (dispatch, props) => ({
    startUpdateInterview: (sectionShortname, valuesByPath, unsetPaths, interview, callback) => dispatch(startUpdateSurveyValidateInterview('validationOnePager', valuesByPath, unsetPaths, interview, callback)),
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(withTranslation()(ValidationOnePageSummary));