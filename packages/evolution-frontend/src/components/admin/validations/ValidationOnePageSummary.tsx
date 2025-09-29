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

    // Debug wrapper for setActiveTripUuid with unselect behavior
    const toggleActiveTripUuid = (tripUuid: string | undefined) => {
        // If clicking on already selected trip, deselect it
        if (activeTripUuid === tripUuid) {
            setActiveTripUuid(undefined);
            return;
        }
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

            // Check if clicking on already selected place - if so, deselect
            if (activeStatsPlacePath === placePath) {
                setActiveMapPlacePath(undefined);
                setActiveStatsPlacePath(undefined);
                return;
            }

            // Also check if clicking on a place that maps to the same unique key as currently selected
            const clickedUniqueKey = pathToUniqueKeyMap.get(placePath);
            const currentUniqueKey = activeStatsPlacePath ? pathToUniqueKeyMap.get(activeStatsPlacePath) : undefined;
            if (clickedUniqueKey && currentUniqueKey && clickedUniqueKey === currentUniqueKey) {
                setActiveMapPlacePath(undefined);
                setActiveStatsPlacePath(undefined);
                return;
            }

            // Always set the clicked path for stats display
            setActiveStatsPlacePath(placePath);

            // Try to find the unique key for this path
            // We select the first path from the non unique location/activity and set it to active.
            // The placePath is the path to the visited place in the interview response. Like
            // `household.persons.123.journeys.456.visitedPlaces.789` or `home`
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
        [pathToUniqueKeyMap, activeStatsPlacePath]
    );

    /**
     * Handle place drag to update coordinates in interview data using valuesByPath
     */
    const handlePlaceDrag = React.useCallback(
        (placePath: string, newCoordinates: [number, number]) => {
            try {
                // Find the visited place to determine its activity type
                const visitedPlace = placesCollection.features.find(
                    (feature) => feature.properties?.path === placePath
                );
                const activity = visitedPlace?.properties?.activity;

                let updatePath: string;

                if (activity === 'home') {
                    // Home places: update response.home.geography.geometry.coordinates
                    updatePath = 'response.home.geography.geometry.coordinates';
                } else if (activity === 'workUsual') {
                    // Usual work places: update person.usualWorkPlace.geography.geometry.coordinates
                    const pathParts = placePath.split('.');
                    const personUuid = pathParts[3];
                    updatePath = `response.household.persons.${personUuid}.usualWorkPlace.geography.geometry.coordinates`;
                } else if (activity === 'schoolUsual') {
                    // Usual school places: update person.usualSchoolPlace.geography.geometry.coordinates
                    const pathParts = placePath.split('.');
                    const personUuid = pathParts[3];
                    updatePath = `response.household.persons.${personUuid}.usualSchoolPlace.geography.geometry.coordinates`;
                } else {
                    // Regular visited places: update visitedPlace.geography.geometry.coordinates
                    updatePath = placePath + '.geography.geometry.coordinates';
                }

                // Update using valuesByPath - only update coordinates to preserve other properties
                startUpdateInterview(
                    {
                        valuesByPath: {
                            [updatePath]: newCoordinates
                        }
                    },
                    (interview) => {
                        if (!interview) {
                            console.error('❌ Failed to update place coordinates');
                        }
                    }
                );
            } catch (error) {
                console.error('❌ Error updating place coordinates:', error);
            }
        },
        [startUpdateInterview, placesCollection]
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
                                onTripClick={toggleActiveTripUuid}
                                onPlaceClick={selectPlaceWithMapping}
                                onPlaceDrag={handlePlaceDrag}
                            />
                        </AdminErrorBoundary>
                    </div>
                    <div className="admin__stats-container">
                        {
                            <AdminErrorBoundary>
                                <InterviewStats
                                    selectPlace={selectPlaceWithMapping}
                                    selectTrip={toggleActiveTripUuid}
                                    activeTripUuid={activeTripUuid}
                                    interview={interview}
                                    surveyObjectsAndAudits={interview?.surveyObjectsAndAudits}
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
