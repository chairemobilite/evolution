/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import moment from 'moment-business-days';
import _get from 'lodash/get';
import {
    lineString as turfLineString,
    distance as turfDistance,
    destination as turfDestination,
    midpoint as turfMidpoint,
    bearing as turfBearing,
    bezierSpline as turfBezierSpline } from '@turf/turf';

import appConfig from 'evolution-frontend/lib/config/application.config';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { InterviewContext } from 'evolution-frontend/lib/contexts/InterviewContext';
import { withSurveyContext } from 'evolution-frontend/lib/components/hoc/WithSurveyContextHoc';
import { startUpdateValidateInterview } from '../../../actions/survey/survey';
import ValidationCommentForm from './ValidationCommentForm';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import AdminErrorBoundary from 'evolution-frontend/lib/components/admin/AdminErrorBoundary';

let InterviewStats = appConfig.getCustomInterviewStat();
if (InterviewStats === undefined) {
    InterviewStats = require('./InterviewStats').default;
}

let InterviewMap = appConfig.getCustomInterviewMap();
if (InterviewMap === undefined) {
    InterviewMap = require('evolution-frontend/lib/components/admin/validations/InterviewMap').default;
}

export class ValidationOnePageSummary extends React.Component {
    static contextType = InterviewContext;

    constructor(props) {
        super(props);
        this.state = {
            confirmModalOpenedShortname: null,
            activePlacePath: null,
            activeTripUuid: null
        };
        // set language if empty and change locale:
        if (!props.i18n.language || config.languages.indexOf(props.i18n.language) <= -1) {
            props.i18n.changeLanguage(config.defaultLocale);
        }
        moment.locale(props.i18n.language);

        this.openConfirmModal = this.openConfirmModal.bind(this);
        this.closeConfirmModal = this.closeConfirmModal.bind(this);
        this.onKeyPress = this.onKeyPress.bind(this);

        this.selectPlace = this.selectPlace.bind(this);
        this.selectTrip = this.selectTrip.bind(this);
    }

    selectPlace(placePath) {
        this.setState({
            activePlacePath: placePath
        });
    }

    selectTrip(tripUuid) {
        this.setState({
            activeTripUuid: tripUuid
        });
    }

    openConfirmModal(confirmModalShortname, e) {
        if (e) {
            e.preventDefault();
        }
        this.setState({ confirmModalOpenedShortname: confirmModalShortname });
    }

    closeConfirmModal(e) {
        if (e) {
            e.preventDefault();
        }
        this.setState({ confirmModalOpenedShortname: null });
    }

    onKeyPress(e) {
        if (e.which === 13 && e.target.tagName.toLowerCase() !== 'textarea' /* Enter */) {
            e.preventDefault();
        }
    }

    render() {
        
        const interview = this.props.interview;
        const responses = interview.responses;
        const persons = odSurveyHelper.getPersonsArray({ interview });
        const household = odSurveyHelper.getHousehold({ interview });


        let mapCenter = [config.mapDefaultCenter.lon, config.mapDefaultCenter.lat];
        const places = [];
        const tripShapes = [];
        const roundedCoordinatesPairsCount = {};
        // get home:
        const home = getResponse(interview, 'home', null);
        const homeGeography = home ? home.geography : null;
        if (homeGeography) {
            mapCenter = homeGeography.geometry.coordinates;
            const path = 'responses.home.geography.geometry.coordinates';
            const place = {
                type: 'Feature',
                geometry: homeGeography.geometry,
                properties: {
                    path: path,
                    activity: 'home',
                    active: (path === this.state.activePlacePath).toString()
                }
            };
            places.push(Object.assign({}, place));
        }

        // TODO Previous was: get usual places, visited places and trips, we should get them from the journey, commenting for now as these concept are not completely in evolution yet
        /*for (const personUuid in persons) {
            const person = persons[personUuid];
            const personPath = `responses.household.persons.${personUuid}`;
            const visitedPlaces = surveyProjectHelper.getVisitedPlaces(person, null, false);
            const trips = surveyProjectHelper.getTrips(person, false);
            const usualWorkPlace = person.usualWorkPlace;
            const usualSchoolPlace = person.usualSchoolPlace;
            const coordinatesByVisitedPlaceUuid = {};
            if (usualWorkPlace) {
                const coordinates = _get(usualWorkPlace, 'geometry.coordinates', null);
                if (coordinates) {
                    const path = `${personPath}.usualWorkPlace.geometry.coordinates`;
                    const place = {
                        path,
                        activity: 'workUsual',
                        active: (path === this.state.activePlacePath).toString(),
                        name: person.usualWorkPlaceName,
                        coordinates,
                        personUuid,
                    };
                    places.push(place);
                }
            }
            if (usualSchoolPlace) {
                const coordinates = _get(usualSchoolPlace, 'geometry.coordinates', null);
                if (coordinates) {
                    const path = `${personPath}.usualSchoolPlace.geometry.coordinates`;
                    const place = {
                        path,
                        activity: 'schoolUsual',
                        active: (path === this.state.activePlacePath).toString(),
                        coordinates,
                        name: person.usualSchoolPlaceName,
                        personUuid
                    };
                    places.push(place);
                }
            }

            for (const visitedPlaceUuid in visitedPlaces) {
                const visitedPlace = visitedPlaces[visitedPlaceUuid];
                const visitedPlacePath = `${personPath}.visitedPlaces.${visitedPlaceUuid}`;
                const geography = surveyProjectHelper.getGeography(visitedPlace, person, interview, true);
                const coordinates = _get(geography, 'geometry.coordinates', null);
                if (coordinates) {
                    const path = `${visitedPlacePath}.geography.geometry.coordinates`;
                    coordinatesByVisitedPlaceUuid[visitedPlaceUuid] = coordinates;
                    const place = {
                        path,
                        lastAction: _get(visitedPlace, 'geography.properties.lastAction', '?'),
                        activity: visitedPlace.activity,
                        active: (path === this.state.activePlacePath).toString(),
                        coordinates,
                        name: visitedPlace.name,
                        personUuid,
                        visitedPlaceUuid
                    };
                    places.push(place);
                }
            }
            for (const tripUuid in trips) {
                const trip = trips[tripUuid];
                const tripPath = `${personPath}.trips.${tripUuid}`;
                //const origin                      = visitedPlaces[trip._originVisitedPlaceUuid];
                const originCoordinates = coordinatesByVisitedPlaceUuid[trip._originVisitedPlaceUuid];
                //const destination                 = visitedPlaces[trip._destinationVisitedPlaceUuid];
                const destinationCoordinates = coordinatesByVisitedPlaceUuid[trip._destinationVisitedPlaceUuid];
                const transferLocation = trip.junctionGeography || null;
                const transferLocationCoordinates = _get(transferLocation, 'geometry.coordinates', null);
                if (transferLocationCoordinates) {
                    const path = `${tripPath}.junctionGeography.geometry.coordinates`;
                    const place = {
                        path,
                        lastAction: _get(trip, 'junctionGeography.properties.lastAction', '?'),
                        activity: 'default',
                        coordinates: transferLocationCoordinates,
                        active: (path === this.state.activePlacePath).toString(),
                        personUuid,
                        tripUuid
                    };
                    places.push(place);
                }
                if (originCoordinates && destinationCoordinates) {
                    const roundedCoordinatesPair = (Math.round(originCoordinates[0] * 1000) / 1000).toString() + ',' + (Math.round(destinationCoordinates[0] * 1000) / 1000).toString();
                    if (!roundedCoordinatesPairsCount[roundedCoordinatesPair]) {
                        roundedCoordinatesPairsCount[roundedCoordinatesPair] = 1;
                    }
                    else {
                        roundedCoordinatesPairsCount[roundedCoordinatesPair]++;
                    }

                    const superposedSequence = roundedCoordinatesPairsCount[roundedCoordinatesPair];

                    let tripCurve = null;
                    const distance = surveyProjectHelper.getBirdDistanceMeters(trip, visitedPlaces, person, interview);
                    const duration = surveyProjectHelper.getDurationSec(trip, visitedPlaces);
                    const birdSpeedMps = surveyProjectHelper.getBirdSpeedMps(trip, visitedPlaces, person, interview);

                    const midpoint = turfMidpoint(originCoordinates, destinationCoordinates);
                    const bearing = turfBearing(originCoordinates, destinationCoordinates);
                    const bezierBearing = bearing + 90;
                    const offsetMidPointCoordinates = turfDestination(midpoint, (0.10 + (superposedSequence - 1) * 0.025) * distance / 1000, bezierBearing).geometry.coordinates;
                    const bezierLine = turfLineString([originCoordinates, offsetMidPointCoordinates, destinationCoordinates]);
                    if (transferLocationCoordinates) {
                        const firstDistance = turfDistance(originCoordinates, transferLocationCoordinates, { units: 'meters' });
                        const firstMidpoint = turfMidpoint(originCoordinates, transferLocationCoordinates);
                        const firstBearing = turfBearing(originCoordinates, transferLocationCoordinates);
                        const firstBezierBearing = firstBearing + 90;
                        const firstOffsetMidPointCoordinates = turfDestination(firstMidpoint, (0.10 + (superposedSequence - 1) * 0.025) * firstDistance / 1000, firstBezierBearing).geometry.coordinates;
                        const firstBezierLine = turfLineString([originCoordinates, firstOffsetMidPointCoordinates, transferLocationCoordinates]);
                        const secondDistance = turfDistance(transferLocationCoordinates, destinationCoordinates, { units: 'meters' });
                        const secondMidpoint = turfMidpoint(transferLocationCoordinates, destinationCoordinates);
                        const secondBearing = turfBearing(transferLocationCoordinates, destinationCoordinates);
                        const secondBezierBearing = secondBearing + 90;
                        const secondOffsetMidPointCoordinates = turfDestination(secondMidpoint, (0.10 + (superposedSequence - 1) * 0.025) * secondDistance / 1000, secondBezierBearing).geometry.coordinates;
                        const secondBezierLine = turfLineString([transferLocationCoordinates, secondOffsetMidPointCoordinates, destinationCoordinates]);
                        tripCurve = turfBezierSpline(firstBezierLine, { sharpness: 1.5 });
                        tripCurve.geometry.coordinates = tripCurve.geometry.coordinates.concat(turfBezierSpline(secondBezierLine, { sharpness: 1.5 }).geometry.coordinates);
                    }
                    else {
                        tripCurve = turfBezierSpline(bezierLine, { sharpness: 1.5 });
                    }

                    tripCurve.properties = {
                        birdDistance: distance,
                        startAt: secondsSinceMidnightToTimeStr(surveyProjectHelper.getStartAt(trip, visitedPlaces)),
                        endAt: secondsSinceMidnightToTimeStr(surveyProjectHelper.getEndAt(trip, visitedPlaces)),
                        durationSec: duration,
                        durationMin: duration / 60,
                        birdSpeedMps: birdSpeedMps,
                        birdSpeedKmh: birdSpeedMps * 3.6,
                        modes: Object.values(trip && trip.segments ? trip.segments : {}).map(function (segment) {
                            return segment.mode;
                        }),
                        segmentUuids: Object.keys(trip && trip.segments ? trip.segments : {}),
                        sequence: trip._sequence,
                        active: (this.state.activeTripUuid === tripUuid).toString(),
                        bearing,
                        personUuid,
                        tripUuid,
                        color: person._color
                    };
                    tripShapes.push(tripCurve);
                }
            }
        } */
        return (
            <div className="survey validation">
                <div style={{ width: '100%', margin: '0 auto' }}>
                    <div className="admin__interview-map-and-stats-container">
                        <div className="admin__interview-map-container">
                            <AdminErrorBoundary>
                                <InterviewMap
                                    user={this.props.user}
                                    interview={this.props.interview}
                                    places={{type: 'FeatureCollection', features: places}}
                                    trips={{type: 'FeatureCollection', features: tripShapes}}
                                    center={mapCenter}
                                    selectPlace={this.selectPlace}
                                    activePlacePath={this.state.activePlacePath}
                                    selectTrip={this.selectTrip}
                                    startUpdateInterview={this.props.startUpdateInterview}
                                />
                            </AdminErrorBoundary>
                        </div>
                        <div className="admin__stats-container">
                            {household && <AdminErrorBoundary><InterviewStats
                                key={this.props.interview.id}
                                selectPlace={this.selectPlace}
                                selectTrip={this.selectTrip}
                                activeTripUuid={this.state.activeTripUuid}
                                interview={this.props.interview}
                                user={this.props.user}
                                refreshInterview={this.refreshInterview}
                                startUpdateInterview={this.props.startUpdateInterview}
                            /></AdminErrorBoundary>}
                            <ValidationCommentForm
                                interview={this.props.interview}
                                startUpdateInterview={this.props.startUpdateInterview}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

}

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
    startUpdateInterview: (sectionShortname, valuesByPath, unsetPaths, interview, callback) => dispatch(startUpdateValidateInterview(sectionShortname, valuesByPath, unsetPaths, interview, callback)),
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(withTranslation()(withSurveyContext(ValidationOnePageSummary)));