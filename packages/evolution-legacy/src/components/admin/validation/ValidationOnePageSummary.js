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
import _get from 'lodash.get';
import isEqual from 'lodash.isequal';
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
import { auditInterview } from 'evolution-common/lib/services/interviews/interview';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import  { secondsSinceMidnightToTimeStr } from 'chaire-lib-common/lib/utils/DateTimeUtils';
import Section from '../../survey/Section';
import { withSurveyContext } from 'evolution-frontend/lib/components/hoc/WithSurveyContextHoc';
import FormErrors from 'chaire-lib-frontend/lib/components/pageParts/FormErrors';
import LoadingPage from '../../shared/LoadingPage';
import ValidationLinks from './ValidationLinks';
import { startSetValidateInterview, startUpdateValidateInterview, startResetValidateInterview, startValidateAddGroupedObjects, startValidateRemoveGroupedObjects } from '../../../actions/survey/survey';
import ValidationCommentForm from './ValidationCommentForm'

const surveyProjectHelper = appConfig.projectHelpers;
const parsers = appConfig.getParsers();

let InterviewStats = appConfig.getCustomInterviewStat();
if (InterviewStats === undefined) {
    InterviewStats = require('./InterviewStats').default;
}

let InterviewMap = appConfig.getCustomInterviewMap();
if (InterviewMap === undefined) {
    InterviewMap = require('./InterviewMap').default;
}

let validations = appConfig.getAdminValidations();
console.log('validations', validations);

export class ValidationOnePageSummary extends React.Component {
    static contextType = InterviewContext;

    constructor(props) {
        super(props);
        this.state = {
            confirmModalOpenedShortname: null,
            activePlacePath: null,
            activeTripUuid: null,
            parsed: false
        };
        // set language if empty and change locale:
        if (!props.i18n.language || config.languages.indexOf(props.i18n.language) <= -1) {
            props.i18n.changeLanguage(config.defaultLocale);
        }
        moment.locale(props.i18n.language);

        this.openConfirmModal = this.openConfirmModal.bind(this);
        this.closeConfirmModal = this.closeConfirmModal.bind(this);
        this.onKeyPress = this.onKeyPress.bind(this);
        this.updateValuesByPath = this.updateValuesByPath.bind(this);
        this.selectPlace = this.selectPlace.bind(this);
        this.selectTrip = this.selectTrip.bind(this);
        this.refreshInterview = this.refreshInterview.bind(this);
        this.resetInterview = this.resetInterview.bind(this);
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

    refreshInterview() {
        this.props.startSetValidateInterview(this.props.interviewUuid, function (interview) {

            const valuesByPath = {};

            const responses = interview.responses;
            const household = _get(responses, 'household');
            const home = _get(responses, 'home');
            const persons = surveyProjectHelper.getPersons(interview, false);
            const personsArray = surveyProjectHelper.getPersons(interview, true);

            for (let i = 0, count = parsers.length; i < count; i++) {
                const parser = parsers[i];
                console.log('Parsing using', parser.name[this.props.i18n.language]);
                for (const path in parser.parsers.interview) {
                    const newValue = parser.parsers.interview[path]({}, interview, responses, household, home, persons, personsArray);
                    const absolutePath = path;
                    const oldValue = _get(interview, absolutePath);
                    if (!isEqual(newValue, oldValue)) {
                        console.log('parsing changed interview path ' + path, newValue, oldValue);
                        valuesByPath[path] = newValue;
                    }
                }
                for (const path in parser.parsers.household) {
                    if (household) {
                        const newValue = parser.parsers.household[path]({}, interview, responses, household, home, persons, personsArray);
                        const absolutePath = 'responses.household.' + path;
                        const oldValue = _get(interview, absolutePath);
                        if (!isEqual(newValue, _get(household, path))) {
                            console.log('parsing changed household path ' + path, newValue, oldValue);
                            valuesByPath[absolutePath] = newValue;
                        }
                    }

                }
                for (const personId in persons) {
                    const person = persons[personId];
                    for (const path in parser.parsers.person) {
                        const newValue = parser.parsers.person[path]({}, interview, responses, household, home, persons, personsArray, person);
                        const absolutePath = `responses.household.persons.${personId}.` + path;
                        const oldValue = _get(interview, absolutePath);
                        if (!isEqual(newValue, oldValue)) {
                            console.log('parsing changed person path ' + path, newValue, oldValue);
                            valuesByPath[absolutePath] = newValue;
                        }
                    }

                    const visitedPlaces = surveyProjectHelper.getVisitedPlaces(person, null, false);
                    const visitedPlacesArray = surveyProjectHelper.getVisitedPlaces(person, null, true);
                    for (const visitedPlaceId in visitedPlaces) {
                        const visitedPlace = visitedPlaces[visitedPlaceId];
                        for (const path in parser.parsers.visitedPlace) {
                            const newValue = parser.parsers.visitedPlace[path]({}, interview, responses, household, home, persons, personsArray, person, visitedPlaces, visitedPlacesArray, visitedPlace);
                            const absolutePath = `responses.household.persons.${personId}.visitedPlaces.${visitedPlaceId}.` + path;
                            const oldValue = _get(interview, absolutePath);
                            if (!isEqual(newValue, oldValue)) {
                                console.log('parsing changed visitedPlace path ' + path, newValue, oldValue);
                                valuesByPath[absolutePath] = newValue;
                            }
                        }
                    }

                    const trips = surveyProjectHelper.getTrips(person, false);
                    const tripsArray = surveyProjectHelper.getTrips(person, true);
                    for (const tripId in trips) {
                        const trip = trips[tripId];
                        for (const path in parser.parsers.trip) {
                            const newValue = parser.parsers.trip[path]({}, interview, responses, household, home, persons, personsArray, person, trips, tripsArray, trip);
                            const absolutePath = `responses.household.persons.${personId}.trips.${tripId}.` + path;
                            const oldValue = _get(interview, absolutePath);
                            if (!isEqual(newValue, oldValue)) {
                                console.log('parsing changed trip path ' + path, newValue, oldValue);
                                valuesByPath[absolutePath] = newValue;
                            }
                        }

                        const segments = surveyProjectHelper.getSegments(trip, false);
                        const segmentsArray = surveyProjectHelper.getSegments(trip, true);
                        for (const segmentId in segments) {
                            const segment = segments[segmentId];
                            for (const path in parser.parsers.segment) {
                                const newValue = parser.parsers.segment[path]({}, interview, responses, household, home, persons, personsArray, person, trips, tripsArray, trip, segments, segmentsArray, segment);
                                const absolutePath = `responses.household.persons.${personId}.trips.${tripId}.segments.${segmentId}.` + path;
                                const oldValue = _get(interview, absolutePath);
                                if (!isEqual(newValue, oldValue)) {
                                    console.log('parsing changed segment path ' + path, newValue, oldValue);
                                    valuesByPath[absolutePath] = newValue;
                                }
                            }
                        }
                    }
                }
            }
            if (Object.keys(valuesByPath).length > 0) {
                this.props.startUpdateInterview(null, valuesByPath, null, null, function () {
                    if (validations) {
                        this.props.startUpdateInterview(null, {
                            audits: auditInterview(interview.responses, interview._responses, interview, validations, surveyProjectHelper)
                        }, null, null, function () {
                            this.setState({
                                parsed: true
                            });
                        }.bind(this));
                    } else {
                        this.setState({
                            parsed: true
                        });
                    }

                }.bind(this));
            }
            else {
                if (validations) {
                    this.props.startUpdateInterview(null, {
                        audits: auditInterview(interview.responses, interview._responses, interview, validations, surveyProjectHelper)
                    }, null, null, function () {
                        this.setState({
                            parsed: true
                        });
                    }.bind(this));
                } else {
                    this.setState({
                        parsed: true
                    });
                }
            }
        }.bind(this));
    }

    resetInterview() {
        this.props.startResetValidateInterview(this.props.interviewUuid, function (interview) {

            const valuesByPath = {};

            const responses = interview.responses;
            const household = _get(responses, 'household');
            const home = _get(responses, 'home');
            const persons = surveyProjectHelper.getPersons(interview, false);
            const personsArray = surveyProjectHelper.getPersons(interview, true);

            for (let i = 0, count = parsers.length; i < count; i++) {
                const parser = parsers[i];
                console.log('Parsing using', parser.name[this.props.i18n.language]);
                for (const path in parser.parsers.interview) {
                    const newValue = parser.parsers.interview[path]({}, interview, responses, household, home, persons, personsArray);
                    const absolutePath = path;
                    const oldValue = _get(interview, absolutePath);
                    if (!isEqual(newValue, oldValue)) {
                        console.log('parsing changed interview path ' + path, newValue, oldValue);
                        valuesByPath[path] = newValue;
                    }
                }
                for (const path in parser.parsers.household) {
                    if (household) {
                        const newValue = parser.parsers.household[path]({}, interview, responses, household, home, persons, personsArray);
                        const absolutePath = 'responses.household.' + path;
                        const oldValue = _get(interview, absolutePath);
                        if (!isEqual(newValue, _get(household, path))) {
                            console.log('parsing changed household path ' + path, newValue, oldValue);
                            valuesByPath[absolutePath] = newValue;
                        }
                    }

                }
                for (const personId in persons) {
                    const person = persons[personId];
                    for (const path in parser.parsers.person) {
                        const newValue = parser.parsers.person[path]({}, interview, responses, household, home, persons, personsArray, person);
                        const absolutePath = `responses.household.persons.${personId}.` + path;
                        const oldValue = _get(interview, absolutePath);
                        if (!isEqual(newValue, oldValue)) {
                            console.log('parsing changed person path ' + path, newValue, oldValue);
                            valuesByPath[absolutePath] = newValue;
                        }
                    }
                    const visitedPlaces = surveyProjectHelper.getVisitedPlaces(person, null, false);
                    const visitedPlacesArray = surveyProjectHelper.getVisitedPlaces(person, null, true);
                    for (const visitedPlaceId in visitedPlaces) {
                        const visitedPlace = visitedPlaces[visitedPlaceId];
                        for (const path in parser.parsers.visitedPlace) {
                            const newValue = parser.parsers.visitedPlace[path]({}, interview, responses, household, home, persons, personsArray, person, visitedPlaces, visitedPlacesArray, visitedPlace);
                            const absolutePath = `responses.household.persons.${personId}.visitedPlaces.${visitedPlaceId}.` + path;
                            const oldValue = _get(interview, absolutePath);
                            if (!isEqual(newValue, oldValue)) {
                                console.log('parsing changed visitedPlace path ' + path, newValue, oldValue);
                                valuesByPath[absolutePath] = newValue;
                            }
                        }
                    }

                    const trips = surveyProjectHelper.getTrips(person, false);
                    const tripsArray = surveyProjectHelper.getTrips(person, true);
                    for (const tripId in trips) {
                        const trip = trips[tripId];
                        for (const path in parser.parsers.trip) {
                            const newValue = parser.parsers.trip[path]({}, interview, responses, household, home, persons, personsArray, person, trips, tripsArray, trip);
                            const absolutePath = `responses.household.persons.${personId}.trips.${tripId}.` + path;
                            const oldValue = _get(interview, absolutePath);
                            if (!isEqual(newValue, oldValue)) {
                                console.log('parsing changed trip path ' + path, newValue, oldValue);
                                valuesByPath[absolutePath] = newValue;
                            }
                        }

                        const segments = surveyProjectHelper.getSegments(trip, false);
                        const segmentsArray = surveyProjectHelper.getSegments(trip, true);
                        for (const segmentId in segments) {
                            const segment = segments[segmentId];
                            for (const path in parser.parsers.segment) {
                                const newValue = parser.parsers.segment[path]({}, interview, responses, household, home, persons, personsArray, person, trips, tripsArray, trip, segments, segmentsArray, segment);
                                const absolutePath = `responses.household.persons.${personId}.trips.${tripId}.segments.${segmentId}.` + path;
                                const oldValue = _get(interview, absolutePath);
                                if (!isEqual(newValue, oldValue)) {
                                    console.log('parsing changed segment path ' + path, newValue, oldValue);
                                    valuesByPath[absolutePath] = newValue;
                                }
                            }
                        }
                    }
                }
            }
            if (Object.keys(valuesByPath).length > 0) {
                this.props.startUpdateInterview(null, valuesByPath, null, null, function () {
                    this.setState({
                        parsed: true
                    });
                }.bind(this));
            }
            else {
                this.setState({
                    parsed: true
                });
            }
        }.bind(this));
    }

    componentDidMount() {
        this.refreshInterview();

        //this.forceUpdate();
    }

    onKeyPress(e) {
        if (e.which === 13 && e.target.tagName.toLowerCase() !== 'textarea' /* Enter */) {
            e.preventDefault();
        }
    }

    updateValuesByPath(valuesByPath, e) {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        this.props.startUpdateInterview(null, valuesByPath);
    }

    render() {
        if (this.props.interviewLoaded && this.props.interview && this.state.parsed) {
            const interview = this.props.interview;
            const responses = interview.responses;
            const household = responses.household;
            const persons = surveyProjectHelper.getPersons(interview, false);
            const sectionShortname = 'validationOnePager';
            const sectionConfig = this.props.surveyContext.sections[sectionShortname];
            const SectionComponent = sectionConfig.template ? sectionConfig.template : Section;

            let mapCenter = [config.mapDefaultCenter.lon, config.mapDefaultCenter.lat];
            const places = [];
            const tripShapes = [];
            const roundedCoordinatesPairsCount = {};
            // get home:
            const home = _get(responses, 'home', null);
            const homeCoordinates = _get(home, 'geography.geometry.coordinates', null);
            if (homeCoordinates) {
                mapCenter = homeCoordinates;
                const path = 'responses.home.geography.geometry.coordinates';
                const place = {
                    path: path,
                    coordinates: homeCoordinates,
                    activity: 'home',
                    active: (path === this.state.activePlacePath).toString()
                };
                places.push(Object.assign({}, place));
            }

            // get usual places, visited places and trips:
            for (const personUuid in persons) {
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
            }
            return (
                <div className="survey validation">
                    <div style={{ width: '100%', margin: '0 auto' }}>
                        <div className="admin__interview-map-and-stats-container">
                            <div className="admin__interview-map-container">
                                <InterviewMap
                                    user={this.props.user}
                                    interview={this.props.interview}
                                    places={places}
                                    tripShapes={tripShapes}
                                    center={mapCenter}
                                    selectPlace={this.selectPlace}
                                    activePlacePath={this.state.activePlacePath}
                                    selectTrip={this.selectTrip}
                                    startUpdateInterview={this.props.startUpdateInterview}
                                />
                            </div>
                            <div className="admin__stats-container">
                                <ValidationLinks
                                    handleInterviewSummaryChange={this.props.handleInterviewSummaryChange}
                                    updateValuesByPath={this.updateValuesByPath}
                                    interviewIsValid={this.props.interview.is_valid}
                                    interviewIsQuestionable={this.props.interview.is_questionable}
                                    interviewIsComplete={this.props.interview.is_completed}
                                    interviewIsValidated={this.props.interview.is_validated}
                                    interviewUuid={this.props.interview.uuid}
                                    prevInterviewUuid={this.props.prevInterviewUuid}
                                    nextInterviewUuid={this.props.nextInterviewUuid}
                                    refreshInterview={this.refreshInterview}
                                    resetInterview={this.resetInterview}
                                    user={this.props.user}
                                    t={this.props.t}
                                />
                                { this.props.interview.validationDataDirty && <FormErrors
                                    errors={[this.props.t(['admin:ValidationDataDirty'])]}
                                    errorType="Warning"
                                />}
                                {household && <InterviewStats
                                    key={this.props.interview.id}
                                    selectPlace={this.selectPlace}
                                    selectTrip={this.selectTrip}
                                    activeTripUuid={this.state.activeTripUuid}
                                    interview={this.props.interview}
                                    user={this.props.user}
                                    startUpdateInterview={this.props.startUpdateInterview}
                                />}
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
        surveyHelperNew.devLog('%c rendering empty survey', 'background: rgba(0,0,0,0.1);');
        return <LoadingPage />;
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
    startSetValidateInterview: (interviewUuid, callback) => dispatch(startSetValidateInterview(interviewUuid, callback)),
    startUpdateInterview: (sectionShortname, valuesByPath, unsetPaths, interview, callback) => dispatch(startUpdateValidateInterview(sectionShortname, valuesByPath, unsetPaths, interview, callback)),
    startResetValidateInterview: (interviewUuid, callback) => dispatch(startResetValidateInterview(interviewUuid, callback)),
    startAddGroupedObjects: (newObjectsCount, insertSequence, path, attributes, callback, returnOnly) => dispatch(startValidateAddGroupedObjects(newObjectsCount, insertSequence, path, attributes, callback, returnOnly)),
    startRemoveGroupedObjects: (paths, callback, returnOnly) => dispatch(startValidateRemoveGroupedObjects(paths, callback, returnOnly))
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(withTranslation()(withSurveyContext(ValidationOnePageSummary)));