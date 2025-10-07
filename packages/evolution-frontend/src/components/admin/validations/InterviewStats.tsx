/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { JSX } from 'react';
//import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons/faUserCircle';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons/faArrowRight';
import { faCar } from '@fortawesome/free-solid-svg-icons/faCar';
import { faCarSide } from '@fortawesome/free-solid-svg-icons/faCarSide';
import { faBicycle } from '@fortawesome/free-solid-svg-icons/faBicycle';
import { faBus } from '@fortawesome/free-solid-svg-icons/faBus';
import { faIdCard } from '@fortawesome/free-solid-svg-icons/faIdCard';
import { faDollarSign } from '@fortawesome/free-solid-svg-icons/faDollarSign';
import steeringWheelSvg from '../../../assets/images/admin/steering-wheel-solid.svg';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { secondsSinceMidnightToTimeStr } from 'chaire-lib-common/lib/utils/DateTimeUtils';
//import { SurveyContext } from '../../../contexts/SurveyContext';
import ValidationErrors from './ValidationErrors';
import KeepDiscard from './KeepDiscard';
import {
    StartUpdateInterview,
    UserRuntimeInterviewAttributes
} from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { SurveyObjectsWithAudits } from 'evolution-common/lib/services/audits/types';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { Segment } from 'evolution-common/lib/services/baseObjects/Segment';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { Optional } from 'evolution-common/lib/types/Optional.type';
import { VisitedPlaceDecorator } from '../../../services/surveyObjectDecorators/VisitedPlaceDecorator';

// Temporarily replaces the calls to the old demoSurveyHelpers that was validating with previous validation results.
// TODO This component should be replaced by the v2 audits that come from the server and uses an object to validate the survey.
const emptyErrorResults = {
    errors: [],
    warnings: [],
    audits: []
};

export type InterviewStatsProps = {
    startUpdateInterview: StartUpdateInterview;
    interview: UserRuntimeInterviewAttributes;
    surveyObjectsAndAudits?: SurveyObjectsWithAudits;
    user: CliUser;
    activeTripUuid?: string;
    selectPlace: (path: string | undefined) => void;
    selectTrip: (uuid: string | undefined) => void;
    activePlacePath?: string;
};

const InterviewStats = (props: InterviewStatsProps) => {
    const keepDiscard = ({ choice, personId }) => {
        const valuesByPath = {};
        valuesByPath[`response.household.persons.${personId}.keepDiscard`] = choice;
        props.startUpdateInterview({ valuesByPath });
    };

    // Use unserialized objects - show error if not available
    const surveyObjects = props.surveyObjectsAndAudits;
    //const surveyContext = React.useContext(SurveyContext);

    // Debug logging

    if (!surveyObjects) {
        console.error('❌ InterviewStats - No survey objects available');
        return (
            <div className="admin__interview-stats">
                <h4>Error</h4>
                <p className="_red">
                    Survey objects not available. Please ensure the interview has been properly processed.
                </p>
            </div>
        );
    }

    const interview = surveyObjects.interview;
    const household: Optional<Household> = surveyObjects.household;
    const home: Optional<Home> = surveyObjects.home;

    if (!interview) {
        return (
            <div className="admin__interview-stats">
                <h4>Error</h4>
                <p className="_red">
                    Interview not available. Please ensure the interview has been properly processed.
                </p>
            </div>
        );
    }

    if (!household) {
        return (
            <div className="admin__interview-stats">
                <h4>Error</h4>
                <p className="_red">
                    Household not available. Please ensure the interview has been properly processed.
                </p>
            </div>
        );
    }

    if (!home) {
        return (
            <div className="admin__interview-stats">
                <h4>Error</h4>
                <p className="_red">Home not available. Please ensure the interview has been properly processed.</p>
            </div>
        );
    }

    const persons: { [key: string]: Person } = household?.members
        ? household.members.reduce(
            (acc, person) => {
                acc[person._uuid!] = person;
                return acc;
            },
            {} as { [key: string]: Person }
        )
        : {};

    const interviewErrors = emptyErrorResults;
    const householdErrors = emptyErrorResults;

    const formattedTripsDate = interview?.assignedDate ? moment(interview.assignedDate).format('LL') : '-';

    const personsStats: JSX.Element[] = [];
    for (const personId in persons) {
        const person: Person = persons[personId];
        const personErrors = emptyErrorResults;

        const visitedPlacesStats: JSX.Element[] = [];

        // Use unserialized journey objects
        let journey: Optional<Journey>;
        let visitedPlacesArray: VisitedPlace[] = [];

        // Find the corresponding unserialized person
        const unserializedPerson = household?.members?.find((p) => p._uuid === personId);
        if (unserializedPerson?.journeys && unserializedPerson.journeys.length > 0) {
            journey = unserializedPerson.journeys[0];
            if (journey.visitedPlaces) {
                visitedPlacesArray = journey.visitedPlaces;
            }
        }

        for (let i = 0, count = visitedPlacesArray.length; i < count; i++) {
            const visitedPlace: VisitedPlace = visitedPlacesArray[i];
            const visitedPlaceDecorator = new VisitedPlaceDecorator(visitedPlace);
            const visitedPlaceErrors = emptyErrorResults;

            const visitedPlaceId = visitedPlace.uuid;
            const visitedPlacePath = `response.household.persons.${personId}.journeys.${journey?.uuid}.visitedPlaces.${visitedPlaceId}`;
            const visitedPlaceStats = (
                <div className="" key={visitedPlaceId} onClick={() => props.selectPlace(visitedPlacePath)}>
                    <span className={`_widget${props.activePlacePath === visitedPlacePath ? ' _active' : ''}`}>
                        {i + 1}. {visitedPlaceDecorator.getDescription(true)}{' '}
                        {visitedPlace.startTime && visitedPlace.endTime
                            ? '(' +
                            Math.round((10 * (visitedPlace.endTime - visitedPlace.startTime)) / 3600) / 10 +
                            'h)'
                            : ''}
                    </span>
                    <ValidationErrors errors={visitedPlaceErrors} />
                </div>
            );
            visitedPlacesStats.push(visitedPlaceStats);
        }

        const tripsStats: JSX.Element[] = [];
        const tripsArray: Trip[] = journey?.trips || [];

        for (let i = 0, count = tripsArray.length; i < count; i++) {
            const trip: Trip = tripsArray[i];
            const tripErrors = emptyErrorResults;
            const tripId = trip._uuid!;
            const origin = trip.origin;
            const destination = trip.destination;
            if (origin && destination) {
                const startAt = origin!.endTime as number;
                const endAt = destination!.startTime as number;
                const duration = !_isBlank(startAt) && !_isBlank(endAt) ? endAt! - startAt! : undefined;
                const birdSpeedMps = null; // FIXME Calculate

                const segmentsArray: Segment[] = trip.segments || [];
                const segmentsErrors = emptyErrorResults;
                const segmentsStats: JSX.Element[] = [];

                for (let j = 0, countJ = segmentsArray.length; j < countJ; j++) {
                    const segment: Segment = segmentsArray[j];
                    const segmentStats: string[] = [];
                    if (!_isBlank(segment.mode)) {
                        if (segment.mode === 'carDriver') {
                            segmentStats.push(
                                `(occ: ${segment.vehicleOccupancy ? segment.vehicleOccupancy.toString() : '?'} | stat: ${segment.paidForParking ? segment.paidForParking.toString() : '?'}`
                            );
                        } else if (segment.mode === 'carPassenger') {
                            segmentStats.push(`(cond: ${segment.driverType ? segment.driverType.toString() : '?'})`);
                        } else if (segment.mode === 'transitBus') {
                            segmentStats.push(`(lignes: ${segment.busLines ? segment.busLines.join(',') : '?'})`);
                        }
                    }
                    segmentsStats.push(
                        <span className="" style={{ display: 'block' }} key={segment._uuid}>
                            <strong>{segment.mode || '?'}</strong>: {segmentStats}
                        </span>
                    );
                }

                const tripStats = (
                    <div className="" key={tripId} onClick={() => props.selectTrip(tripId)}>
                        <span key="trip" className={`_widget${props.activeTripUuid === tripId ? ' _active' : ''}`}>
                            {i + 1}. <FontAwesomeIcon icon={faClock} className="faIconLeft" />
                            {secondsSinceMidnightToTimeStr(startAt)}
                            <FontAwesomeIcon icon={faArrowRight} />
                            {secondsSinceMidnightToTimeStr(endAt)} ({Math.ceil(duration! / 60)} min) • (
                            {Math.round((birdSpeedMps! * 3.6 * 100) / 100)}km/h)
                        </span>
                        <span
                            key="segments"
                            style={{ marginLeft: '1rem' }}
                            className={`_widget${props.activeTripUuid === tripId ? ' _active' : ''}`}
                        >
                            {segmentsStats}
                        </span>
                        <ValidationErrors errors={tripErrors} />
                        <ValidationErrors errors={segmentsErrors} />
                    </div>
                );
                tripsStats.push(tripStats);
            } else {
                console.warn('❌ InterviewStats - Trip for person uuid has no origin or destination', person.uuid, trip);
            }
        }

        const personStats = (
            <details
                open={person.customAttributes.keepDiscard !== 'Discard'}
                className="_widget_container"
                key={personId}
            >
                <summary>
                    {person.gender} {person.age} ans
                    <KeepDiscard
                        personId={personId}
                        choice={person.customAttributes.keepDiscard as KeepDiscard}
                        onChange={keepDiscard}
                    />
                </summary>
                <span className="_widget">
                    <FontAwesomeIcon icon={faUserCircle} className="faIconLeft" />
                    {person.age} ans
                </span>
                <span className="_widget">{person.gender}</span>
                <span className="_widget">{person.occupation}</span>
                <span className="_widget">
                    {person.whoWillAnswerForThisPerson !== person._uuid ? 'proxy' : 'non-proxy'}
                </span>
                <br />
                {journey?.noWorkTripReason && <span className="_widget _pale _oblique">noWorkTripReason</span>}
                {journey?.noSchoolTripReason && <span className="_widget _pale _oblique">noSchoolTripReason</span>}
                <span className="_widget _pale _oblique">noWorkTrip?:{journey?.noWorkTripReason}</span>
                <span className="_widget _pale _oblique">noSchoolTrip?:{journey?.noSchoolTripReason}</span>
                <br />
                {journey?.didTrips === 'yes' && <span className="_widget _green">DidTrips</span>}
                {journey?.didTrips === 'no' && <span className="_widget _green">noTrips</span>}
                {journey?.didTrips === 'dontKnow' && <span className="_widget _red">dontKnowTrips</span>}
                {person.drivingLicenseOwnership === 'yes' && (
                    <span className="_widget">
                        <FontAwesomeIcon icon={faCheck} />
                        <img src={steeringWheelSvg} />
                        <FontAwesomeIcon icon={faIdCard} />
                    </span>
                )}
                {person.drivingLicenseOwnership === 'no' && (
                    <span className="_widget">
                        <FontAwesomeIcon icon={faTimes} />
                        <img src={steeringWheelSvg} />
                        <FontAwesomeIcon icon={faIdCard} />
                    </span>
                )}
                {person.drivingLicenseOwnership === 'dontKnow' && (
                    <span className="_widget">
                        ?<img src={steeringWheelSvg} />
                        <FontAwesomeIcon icon={faIdCard} />
                    </span>
                )}
                {person.transitPassOwnership === 'yes' && (
                    <span className="_widget">
                        <FontAwesomeIcon icon={faCheck} />
                        <FontAwesomeIcon icon={faBus} />
                        <FontAwesomeIcon icon={faIdCard} />
                    </span>
                )}
                {person.transitPassOwnership === 'no' && (
                    <span className="_widget">
                        <FontAwesomeIcon icon={faTimes} />
                        <FontAwesomeIcon icon={faBus} />
                        <FontAwesomeIcon icon={faIdCard} />
                    </span>
                )}
                {person.transitPassOwnership === 'dontKnow' && (
                    <span className="_widget">
                        ?<FontAwesomeIcon icon={faBus} />
                        <FontAwesomeIcon icon={faIdCard} />
                    </span>
                )}
                {person.carsharingMember === 'yes' && (
                    <span className="_widget">
                        <FontAwesomeIcon icon={faCheck} />
                        <FontAwesomeIcon icon={faCarSide} />
                        <FontAwesomeIcon icon={faIdCard} />
                    </span>
                )}
                {person.carsharingMember === 'no' && (
                    <span className="_widget">
                        <FontAwesomeIcon icon={faTimes} />
                        <FontAwesomeIcon icon={faCarSide} />
                        <FontAwesomeIcon icon={faIdCard} />
                    </span>
                )}
                {person.carsharingMember === 'dontKnow' && (
                    <span className="_widget">
                        ?<FontAwesomeIcon icon={faCarSide} />
                        <FontAwesomeIcon icon={faIdCard} />
                    </span>
                )}
                {person.bikesharingMember === 'yes' && (
                    <span className="_widget">
                        <FontAwesomeIcon icon={faCheck} />
                        <FontAwesomeIcon icon={faBicycle} />
                        <FontAwesomeIcon icon={faIdCard} />
                    </span>
                )}
                {person.bikesharingMember === 'no' && (
                    <span className="_widget">
                        <FontAwesomeIcon icon={faTimes} />
                        <FontAwesomeIcon icon={faBicycle} />
                        <FontAwesomeIcon icon={faIdCard} />
                    </span>
                )}
                {person.bikesharingMember === 'dontKnow' && (
                    <span className="_widget">
                        ?<FontAwesomeIcon icon={faBicycle} />
                        <FontAwesomeIcon icon={faIdCard} />
                    </span>
                )}
                <ValidationErrors errors={personErrors} />
                {visitedPlacesStats.length > 0 && <br />}
                {visitedPlacesStats}
                {tripsStats.length > 0 && <br />}
                {tripsStats}
            </details>
        );
        personsStats.push(personStats);
    }

    return (
        <React.Fragment>
            <div className="admin__interview-stats" key="household">
                <h4>Entrevue</h4>
                <span className="_widget">
                    UUID: <span className="_strong">{interview?._uuid}</span>
                </span>
                {/*{(interview.username || interview.email) && (
                    <span className="_widget">
                        Username/Email:{' '}
                        <span className="_strong">{(interview as any).username || (interview as any).email}</span>
                    </span>
                )}
                {interview.google_id && (
                    <span className="_widget">
                        Google ID: <span className="_strong">{(interview as any).google_id}</span>
                    </span>
                )}
                {interview.facebook_id && (
                    <span className="_widget">
                        Facebook ID: <span className="_strong">{(interview as any).facebook_id}</span>
                    </span>
                )}*/}
                {home && (
                    <span className="_widget">
                        <span className="_strong">
                            {home.address?.fullAddress ||
                                `${home.address?.municipalityName || ''} ${home.address?.region || ''} ${home.address?.country || ''} ${home.address?.postalCode || ''}`.trim() ||
                                ''}{' '}
                            {home.address?.unitNumber ? 'app' + home.address?.unitNumber : ''}{' '}
                            {home.address?.municipalityName ? home.address?.municipalityName : ''}
                        </span>
                    </span>
                )}
                <span className="_widget">
                    Code d&apos;accès: <span className="_strong">{interview.accessCode || 'Aucun'}</span>
                </span>
                <span className="_widget">
                    Langue d&apos;entrevue: <span className="_strong">{interview.languages?.[0] || '?'}</span>
                </span>
                <span className="_widget">
                    Date de déplacements: <span className="_strong">{formattedTripsDate}</span>
                </span>
                <ValidationErrors errors={interviewErrors} />
                <h4>Ménage</h4>
                <span className="_widget">
                    <FontAwesomeIcon icon={faUserCircle} className="faIconLeft" />
                    {household?.attributes?.size}
                </span>
                <span className="_widget">
                    <FontAwesomeIcon icon={faCar} className="faIconLeft" />
                    {household?.attributes?.carNumber}
                </span>
                <span className="_widget">
                    <FontAwesomeIcon icon={faDollarSign} className="faIconLeft" />
                    {household.incomeLevel}
                </span>
                <ValidationErrors errors={householdErrors} />
            </div>
            <div className="admin__interview-stats" key="persons">
                <h4>Personnes</h4>
                {personsStats}
            </div>
            <div className="admin__interview-stats" key="comments">
                <h4>Commentaire</h4>
                <p className="_scrollable _oblique _small">{interview.respondentComments || 'Aucun commentaire'}</p>
            </div>
        </React.Fragment>
    );
};

export default InterviewStats;
