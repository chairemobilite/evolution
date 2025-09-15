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
import { startUpdateSurveyCorrectedInterview } from '../../../actions/SurveyAdmin';
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
    // We need two separate place paths because of deduplication:
    // - activeMapPlacePath: Controls which icon is enlarged on the map (uses representative path for deduplicated places)
    // - activeStatsPlacePath: Controls which visited place is highlighted in stats (uses the actual clicked path)
    // This allows clicking on any duplicate visited place to highlight that specific entry in stats
    // while still properly activating the single deduplicated icon on the map
    const [activeMapPlacePath, setActiveMapPlacePath] = React.useState<string | undefined>(undefined);
    const [activeStatsPlacePath, setActiveStatsPlacePath] = React.useState<string | undefined>(undefined);
    const [activeTripUuid, setActiveTripUuid] = React.useState<string | undefined>(undefined);

    // Debug wrapper for setActiveTripUuid
    const setActiveTripUuidWithDebug = (tripUuid: string | undefined) => {
        setActiveTripUuid(tripUuid);
    };
    const [InterviewStats, setInterviewStats] = useState<React.ComponentType<InterviewStatsProps> | null>(null);
    const [InterviewMap, setInterviewMap] = useState<React.ComponentType<InterviewMapProps> | null>(null);

    // FIXME Admin interview type should be different from participant, with more types
    const interview = useSelector((state: RootState) => state.survey.interview) as any;
    const user = useSelector((state: RootState) => state.auth.user);
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, SurveyAction>>();
    const startUpdateInterview: StartUpdateInterview = (data, callback) =>
        dispatch(startUpdateSurveyCorrectedInterview(data, callback));

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

    // Generate map features with current selection state - regenerate when selection changes
    const { placesCollection, tripsCollection, pathToUniqueKeyMap } = React.useMemo(() => {
        if (!interview)
            return {
                placesCollection: { type: 'FeatureCollection' as const, features: [] },
                tripsCollection: { type: 'FeatureCollection' as const, features: [] },
                pathToUniqueKeyMap: new Map()
            };

        if (appConfig.generateMapFeatures && interview?.surveyObjectsAndAudits) {
            const result = appConfig.generateMapFeatures(interview.surveyObjectsAndAudits);
            return { ...result, pathToUniqueKeyMap: new Map() }; // Custom generators don't have mapping yet
        } else {
            const result = generateMapFeatureFromInterview(interview, {
                activePlacePath: activeMapPlacePath,
                activeTripUuid
            });
            return result;
        }
    }, [interview, activeMapPlacePath, activeTripUuid, interview?.updateCount]);

    // Smart place selection function that maps visited place paths to unique icons
    const selectPlaceWithMapping = React.useCallback(
        (placePath: string | undefined) => {
            if (!placePath) {
                setActiveMapPlacePath(undefined);
                setActiveStatsPlacePath(undefined);
                return;
            }

            // Always set the clicked path for stats display
            setActiveStatsPlacePath(placePath);

            // Try to find the unique key for this path
            const uniqueKey = pathToUniqueKeyMap.get(placePath);
            if (uniqueKey) {
                // Find the first path that maps to this unique key (the representative path for the icon)
                for (const [path, key] of pathToUniqueKeyMap) {
                    if (key === uniqueKey) {
                        setActiveMapPlacePath(path);
                        return;
                    }
                }
            }

            // Fallback: use the original path if no mapping found
            setActiveMapPlacePath(placePath);
        },
        [pathToUniqueKeyMap]
    );

    if (!InterviewStats || !InterviewMap || !user) {
        return <LoadingPage />;
    }

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
                                activeTripUuid={activeTripUuid}
                                activePlacePath={activeMapPlacePath}
                                onTripClick={setActiveTripUuidWithDebug}
                                onPlaceClick={selectPlaceWithMapping}
                            />
                        </AdminErrorBoundary>
                    </div>
                    <div className="admin__stats-container">
                        {
                            <AdminErrorBoundary>
                                <InterviewStats
                                    selectPlace={selectPlaceWithMapping}
                                    selectTrip={setActiveTripUuidWithDebug}
                                    activeTripUuid={activeTripUuid}
                                    interview={interview}
                                    activePlacePath={activeStatsPlacePath}
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
