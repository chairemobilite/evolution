/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import appConfig from '../../../config/application.config';
import config from 'evolution-common/lib/config/project.config';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { startUpdateSurveyValidateInterview } from '../../../actions/SurveyAdmin';
import ValidationCommentForm from './ValidationCommentForm';
import AdminErrorBoundary from '../hoc/AdminErrorBoundary';
import { generateMapFeatureFromInterview } from '../../../services/admin/odSurveyAdminHelper';
import { RootState } from '../../../store/configureStore';
import { ThunkDispatch } from 'redux-thunk';
import { SurveyAction } from '../../../store/survey';
import { InterviewMapProps } from './InterviewMap';
import { InterviewStatsProps } from './InterviewStats';
import { StartUpdateInterview } from 'evolution-common/lib/services/questionnaire/types';

const ValidationOnePageSummary = () => {
    const [activePlacePath, setActivePlacePath] = React.useState<string | undefined>(undefined);
    const [activeTripUuid, setActiveTripUuid] = React.useState<string | undefined>(undefined);
    const [InterviewStats, setInterviewStats] = useState<React.ComponentType<InterviewStatsProps> | null>(null);
    const [InterviewMap, setInterviewMap] = useState<React.ComponentType<InterviewMapProps> | null>(null);

    // FIXME Admin interview type should be different from participant, with more types
    const interview = useSelector((state: RootState) => state.survey.interview) as any;
    const user = useSelector((state: RootState) => state.auth.user);
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, SurveyAction>>();
    const startUpdateInterview: StartUpdateInterview = (data, callback) =>
        dispatch(startUpdateSurveyValidateInterview(data, callback));

    useEffect(() => {
        const loadComponents = async () => {
            const InterviewStatsComponent = appConfig.getCustomInterviewStat()
                ? await appConfig.getCustomInterviewStat()
                : (await import('./InterviewStats')).default;
            setInterviewStats(() => InterviewStatsComponent as any);

            const InterviewMapComponent = appConfig.getCustomInterviewMap()
                ? await appConfig.getCustomInterviewMap()
                : (await import('./InterviewMap')).default;
            setInterviewMap(() => InterviewMapComponent as any);
        };

        loadComponents();
    }, []);

    if (!InterviewStats || !InterviewMap || !user) {
        return <LoadingPage />;
    }

    // FIXME The generateMapFeatures should return points with the type requested by the map component
    const { placesCollection, tripsCollection } =
        appConfig.generateMapFeatures && interview?.surveyObjectsAndAudits
            ? appConfig.generateMapFeatures(interview.surveyObjectsAndAudits)
            : generateMapFeatureFromInterview(interview, { activePlacePath, activeTripUuid });

    const mapCenter =
        placesCollection.features.length > 0
            ? (placesCollection.features[0].geometry.coordinates as [number, number])
            : ([config.mapDefaultCenter.lon, config.mapDefaultCenter.lat] as [number, number]);

    return (
        <div className="survey validation">
            <div style={{ width: '100%', margin: '0 auto' }}>
                <div className="admin__interview-map-and-stats-container">
                    <div className="admin__interview-map-container">
                        <AdminErrorBoundary>
                            <InterviewMap
                                places={placesCollection as any}
                                trips={tripsCollection as any}
                                center={mapCenter}
                                updateCount={interview.updateCount}
                            />
                        </AdminErrorBoundary>
                    </div>
                    <div className="admin__stats-container">
                        {
                            <AdminErrorBoundary>
                                <InterviewStats
                                    key={interview.id}
                                    selectPlace={setActivePlacePath}
                                    selectTrip={setActiveTripUuid}
                                    activeTripUuid={activeTripUuid}
                                    interview={interview}
                                    activePlacePath={activePlacePath}
                                    user={user}
                                    startUpdateInterview={startUpdateInterview}
                                />
                            </AdminErrorBoundary>
                        }
                        <ValidationCommentForm interview={interview} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ValidationOnePageSummary;
