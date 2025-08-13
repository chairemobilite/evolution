/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { JSX } from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons/faArrowRight';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { Widget } from '../Widget';
import { GroupedObject } from '../GroupWidgets';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { withSurveyContext, WithSurveyContextProps } from '../../hoc/WithSurveyContextHoc';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { SectionProps, useSectionTemplate } from '../../hooks/useSectionTemplate';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import * as helpers from 'evolution-common/lib/utils/helpers';
import { secondsSinceMidnightToTimeStrWithSuffix } from '../../../services/display/frontendHelper';
import { loopActivities } from 'evolution-common/lib/services/odSurvey/types';
import { VisitedPlace } from 'evolution-common/lib/services/questionnaire/types';
import { getActivityMarkerIcon } from 'evolution-common/lib/services/questionnaire/sections/visitedPlaces/activityIconMapping';

export const SegmentsSection: React.FC<SectionProps & WithTranslation & WithSurveyContextProps> = (
    props: SectionProps & WithTranslation & WithSurveyContextProps
) => {
    const { preloaded } = useSectionTemplate(props);
    const iconPathsByMode = React.useMemo(() => {
        const iconPathsByMode = {};
        const modes = props.surveyContext.widgets['segmentMode'].choices;
        for (let i = 0, count = modes.length; i < count; i++) {
            const mode = modes[i].value;
            const iconPath = modes[i].iconPath;
            iconPathsByMode[mode] = iconPath;
        }
        return iconPathsByMode;
    }, []);

    const selectTrip = (tripUuid: string, e) => {
        if (e) {
            e.preventDefault();
        }
        props.startUpdateInterview({
            sectionShortname: 'segments',
            valuesByPath: { ['response._activeTripId']: tripUuid }
        });
    };

    if (!preloaded) {
        return <LoadingPage />;
    }

    helpers.devLog('%c rendering section ' + props.shortname, 'background: rgba(0,0,255,0.1);');
    const widgetsComponentsByShortname = {};
    // FIXME We need to make sure a widget by that name exists in the survey context
    const personTripsConfig = props.surveyContext.widgets['personTrips'];

    // Get the trips of the active journey/person
    const person = odSurveyHelper.getActivePerson({ interview: props.interview });
    if (person === null) {
        throw new Error('SegmentsSection: active person not found');
    }
    const journeys = odSurveyHelper.getJourneysArray({ person });
    if (journeys.length === 0) {
        throw new Error('SegmentsSection: there are no journeys');
    }
    const currentJourney = journeys[0];

    const trips = currentJourney.trips || {};
    const tripsList: JSX.Element[] = [];

    const visitedPlaces = currentJourney.visitedPlaces || {};
    const selectedTrip = odSurveyHelper.getActiveTrip({ interview: props.interview, journey: currentJourney });
    const selectedTripId = selectedTrip ? selectedTrip._uuid : undefined;

    // setup widgets

    // FIXME It seems that the trips section widgets should be hard-coded. As it
    // is, they can be defined in the survey, but we need them by name later.
    // The whole widget configuration of the trips section should be revised.
    for (let i = 0, count = props.sectionConfig.widgets.length; i < count; i++) {
        const widgetShortname = props.sectionConfig.widgets[i];

        widgetsComponentsByShortname[widgetShortname] = (
            <Widget
                key={widgetShortname}
                currentWidgetShortname={widgetShortname}
                nextWidgetShortname={props.sectionConfig.widgets[i + 1]}
                sectionName={props.shortname}
                interview={props.interview}
                errors={props.errors}
                user={props.user}
                loadingState={props.loadingState}
                startUpdateInterview={props.startUpdateInterview}
                startAddGroupedObjects={props.startAddGroupedObjects}
                startRemoveGroupedObjects={props.startRemoveGroupedObjects}
                startNavigate={props.startNavigate}
            />
        );
    }

    let tripSequence = 1;
    for (let i = 0, count = Object.keys(trips).length; i < count; i++) {
        const trip = trips[Object.keys(trips)[i]];
        const origin = trip._originVisitedPlaceUuid ? visitedPlaces[trip._originVisitedPlaceUuid] : null;
        const destination = trip._destinationVisitedPlaceUuid
            ? visitedPlaces[trip._destinationVisitedPlaceUuid]
            : undefined;
        if (!origin || !destination) {
            // We should not have a trip without origin or destination at this point
            throw new Error('SegmentsSection: origin or destination not found');
        }

        const actualOrigin = origin.shortcut
            ? (getResponse(props.interview, origin.shortcut, origin) as VisitedPlace)
            : origin;
        const actualDestination = destination.shortcut
            ? (getResponse(props.interview, destination.shortcut, destination) as VisitedPlace)
            : destination;
        // ignore all but the first trip if the origin is a loop activity. When loop activity is the first, we still need to ask the segments for it
        if (origin && origin._sequence !== 1 && loopActivities.includes(origin.activity || '')) {
            continue;
        }
        const isOnTheRoadOrLeisureStrollTrip = destination && loopActivities.includes(destination.activity || '');

        const tripPath = `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.trips.${trip._uuid}`;

        // for isOnTheRoadOrLeisureStrollTrip, we need next trip destination:
        const nextDestination = isOnTheRoadOrLeisureStrollTrip
            ? odSurveyHelper.getNextVisitedPlace({
                visitedPlaceId: trip._destinationVisitedPlaceUuid!,
                journey: currentJourney
            })
            : undefined;

        const modeIcons: JSX.Element[] = [];

        if (!_isBlank(trip.segments)) {
            for (const segmentId in trip.segments) {
                const segment = trip.segments[segmentId];
                if (segment.mode) {
                    modeIcons.push(
                        <React.Fragment key={segment._uuid}>
                            <img
                                src={iconPathsByMode[segment.mode]}
                                style={{ height: '1.5em', marginLeft: '0.3em' }}
                                alt={props.t(`segments:mode:short:${segment.mode}`)}
                            />
                        </React.Fragment>
                    );
                }
            }
        }

        // FIXME Extract the tripItem part to its own component
        const tripItem = (
            <li
                className={`no-bullet survey-trip-item survey-trip-item-name${
                    trip._uuid === selectedTripId ? ' survey-trip-item-selected' : ''
                }`}
                key={`survey-trip-item__${i}`}
            >
                <span className="survey-trip-item-element survey-trip-item-sequence-and-icon">
                    <em>{props.t('survey:trip:tripSeq', { seq: tripSequence })}</em>
                </span>
                <span className="survey-trip-item-element survey-trip-item-buttons">
                    <FontAwesomeIcon icon={faClock} style={{ marginRight: '0.3rem', marginLeft: '0.6rem' }} />
                    {origin && origin.departureTime && secondsSinceMidnightToTimeStrWithSuffix(origin.departureTime)}
                    <FontAwesomeIcon icon={faArrowRight} style={{ marginRight: '0.3rem', marginLeft: '0.3rem' }} />
                    {destination &&
                        destination.arrivalTime &&
                        secondsSinceMidnightToTimeStrWithSuffix(destination.arrivalTime)}
                    {!selectedTripId && props.loadingState === 0 && (
                        <button
                            type="button"
                            className={'survey-section__button button blue small'}
                            onClick={(e) => selectTrip(trip._uuid!, e)}
                            style={{ marginLeft: '0.5rem' }}
                            title={props.t('survey:trip:editTrip')}
                        >
                            <FontAwesomeIcon icon={faPencilAlt} className="" />
                        </button>
                    )}
                </span>
            </li>
        );
        tripsList.push(tripItem);
        if (origin && destination) {
            tripsList.push(
                <li
                    className={`no-bullet survey-trip-item survey-trip-item-description${
                        trip._uuid === selectedTripId ? ' survey-trip-item-selected' : ''
                    }`}
                    key={`survey-trip-item-origin-destination__${i}`}
                >
                    <span className="survey-trip-item-element survey-trip-item-origin-description">
                        <img
                            src={getActivityMarkerIcon(origin.activity)}
                            style={{ height: '4rem' }}
                            alt={props.t(`visitedPlaces/activities/${origin.activity}`)}
                        />
                        <span>
                            {props.t(`survey:visitedPlace:activities:${origin.activity}`)}
                            {actualOrigin.name && (
                                <React.Fragment>
                                    <br />
                                    <em>&nbsp;• {actualOrigin.name}</em>
                                </React.Fragment>
                            )}
                        </span>
                    </span>
                    <span className="survey-trip-item-element survey-trip-item-arrow">
                        <FontAwesomeIcon icon={faArrowRight} style={{ marginRight: '0.3rem', marginLeft: '0.3rem' }} />
                    </span>
                    <span className="survey-trip-item-element survey-trip-item-destination-description">
                        <img
                            src={getActivityMarkerIcon(destination.activity)}
                            style={{ height: '4rem' }}
                            alt={props.t(`visitedPlaces/activities/${destination.activity}`)}
                        />
                        <span>
                            {props.t(`survey:visitedPlace:activities:${destination.activity}`)}
                            {actualDestination.name && (
                                <React.Fragment>
                                    <br />
                                    <em>&nbsp;• {actualDestination.name}</em>
                                </React.Fragment>
                            )}
                        </span>
                    </span>
                    {isOnTheRoadOrLeisureStrollTrip && nextDestination && (
                        <React.Fragment>
                            <span className="survey-trip-item-element survey-trip-item-arrow">
                                <FontAwesomeIcon
                                    icon={faArrowRight}
                                    style={{ marginRight: '0.3rem', marginLeft: '0.3rem' }}
                                />
                            </span>
                            <span className="survey-trip-item-element survey-trip-item-destination-description">
                                <img
                                    src={getActivityMarkerIcon(nextDestination.activity)}
                                    style={{ height: '4rem' }}
                                    alt={props.t(`visitedPlaces/activities/${nextDestination.activity}`)}
                                />
                                <span>
                                    {props.t(`survey:visitedPlace:activities:${nextDestination.activity}`)}
                                    {nextDestination.name && (
                                        <React.Fragment>
                                            <br />
                                            <em>&nbsp;• {nextDestination.name}</em>
                                        </React.Fragment>
                                    )}
                                </span>
                            </span>
                        </React.Fragment>
                    )}
                </li>
            );
            tripsList.push(
                <li
                    className={`no-bullet survey-trip-item survey-trip-item-mode-icons${
                        trip._uuid === selectedTripId ? ' survey-trip-item-selected' : ''
                    }`}
                    key={`survey-trip-item-origin-mode-icon__${i}`}
                >
                    {modeIcons}
                </li>
            );
        }
        tripSequence++;

        // For the selected trip, add the segments questions.
        if (selectedTripId && trip._uuid === selectedTripId) {
            const parentObjectIds = {};
            parentObjectIds['personTrips'] = trip._uuid;
            // FIXME The personTripsConfig is probably part of the
            // widgetsComponentsByShortname with a `Group` Widget, because
            // it is one of the widgets of the section. See if there's a way
            // to get it from there, or it at least avoid duplicating its
            // content. Maybe when the segments's section is completely
            // configurable, some of the widgets can actually be forced.
            tripsList.push(
                <li className="no-bullet" style={{ marginTop: '-0.4rem' }} key={`survey-trip-item-selected__${i}`}>
                    <GroupedObject
                        widgetConfig={personTripsConfig}
                        path={tripPath}
                        shortname="personTrips"
                        loadingState={props.loadingState}
                        objectId={trip._uuid}
                        parentObjectIds={parentObjectIds}
                        key={`survey-trip-item-selected-${trip._uuid}`}
                        sequence={trip['_sequence']}
                        section={'segments'}
                        interview={props.interview}
                        user={props.user}
                        errors={props.errors}
                        startUpdateInterview={props.startUpdateInterview}
                        startAddGroupedObjects={props.startAddGroupedObjects}
                        startRemoveGroupedObjects={props.startRemoveGroupedObjects}
                        startNavigate={props.startNavigate}
                    />
                </li>
            );
        }
    }
    return (
        <section className={`survey-section survey-section-shortname-${props.shortname}`}>
            <div className="survey-section__content">
                {widgetsComponentsByShortname['activePersonTitle']}
                {widgetsComponentsByShortname['buttonSwitchPerson']}
                <div className="survey-trips-list-and-map-container">
                    <ul className={`survey-trips-list ${selectedTripId ? 'full-width' : ''}`}>
                        <li className="no-bullet" key="survey-trips-list-person-trip-title">
                            {widgetsComponentsByShortname['personTripsTitle']}
                        </li>
                        {tripsList}
                        <li className="no-bullet" key="survey-trips-list-confirm-button">
                            {!selectedTripId && widgetsComponentsByShortname['buttonConfirmNextSection']}
                        </li>
                    </ul>
                    {!selectedTripId && (
                        <div className={'survey-trips-map'}>
                            {widgetsComponentsByShortname['personVisitedPlacesMap']}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default withTranslation()(withSurveyContext(SegmentsSection));
