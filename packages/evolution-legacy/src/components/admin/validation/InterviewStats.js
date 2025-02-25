/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React                          from 'react';
import { useTranslation }            from 'react-i18next';
import moment                         from 'moment-business-days';
import _get                           from 'lodash/get';
import { FontAwesomeIcon }            from '@fortawesome/react-fontawesome';
import { faCheck }                    from '@fortawesome/free-solid-svg-icons/faCheck';
import { faTimes }                    from '@fortawesome/free-solid-svg-icons/faTimes';
import { faUserCircle }               from '@fortawesome/free-solid-svg-icons/faUserCircle';
import { faClock }                    from '@fortawesome/free-solid-svg-icons/faClock';
import { faArrowRight }               from '@fortawesome/free-solid-svg-icons/faArrowRight';
import { faCar }                      from '@fortawesome/free-solid-svg-icons/faCar';
import { faCarSide }                  from '@fortawesome/free-solid-svg-icons/faCarSide';
import { faBicycle }                  from '@fortawesome/free-solid-svg-icons/faBicycle';
import { faBus }                      from '@fortawesome/free-solid-svg-icons/faBus';
import { faIdCard }                   from '@fortawesome/free-solid-svg-icons/faIdCard';
import { faPhone }                    from '@fortawesome/free-solid-svg-icons/faPhone';
import { faPhoneSlash }               from '@fortawesome/free-solid-svg-icons/faPhoneSlash';
import { faPhoneVolume }              from '@fortawesome/free-solid-svg-icons/faPhoneVolume';
import { faMobileAlt }                from '@fortawesome/free-solid-svg-icons/faMobileAlt';
import { faDollarSign }               from '@fortawesome/free-solid-svg-icons/faDollarSign';

import emptySetSvg      from 'evolution-frontend/lib/assets/images/admin/empty-set-solid.svg';
import wiredPhoneSvg    from 'evolution-frontend/lib/assets/images/admin/phone-with-wire.svg';
import steeringWheelSvg from 'evolution-frontend/lib/assets/images/admin/steering-wheel-solid.svg'
import { _isBlank }     from 'chaire-lib-common/lib/utils/LodashExtensions';
import  { secondsSinceMidnightToTimeStr } from 'chaire-lib-common/lib/utils/DateTimeUtils';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { SurveyContext } from 'evolution-frontend/lib/contexts/SurveyContext';
import ValidationErrors from 'evolution-frontend/lib/components/admin/validations/ValidationErrors';
import KeepDiscard from 'evolution-frontend/lib/components/admin/validations/KeepDiscard';
import { getVisitedPlaceDescription } from 'evolution-frontend/lib/services/display/frontendHelper';

// Temporarily replaces the calls to the old demoSurveyHelpers that was validating with previous validation results.
// TODO This component should be replaced by the v2 audits that come from the server and uses an object to validate the survey.
const emptyErrorResults = {
    errors: [],
    warnings: [],
    audits: []
}

const InterviewStats = (props) => {

    const { i18n } = useTranslation();
    const surveyContext = React.useContext(SurveyContext);
    const validations = [];

    const keepDiscard = ({ choice, personId }) => {
        const valuesByPath = {};
        valuesByPath[`responses.household.persons.${personId}.keepDiscard`] = choice;
        this.props.startUpdateInterview(undefined, valuesByPath, null, null);
    }

    const interview = props.interview;
    const responses = interview.responses;
    const household = _get(responses, 'household');
    const home = _get(responses, 'home');
    const persons = odSurveyHelper.getPersons({ interview });
    const personsArray = odSurveyHelper.getPersonsArray({ interview });

    const interviewErrors = emptyErrorResults;
    const householdErrors = emptyErrorResults;

    const formattedTripsDate = responses.tripsDate ? moment(responses.tripsDate).format('LL') : "-";

    const personsStats = [];
    for (const personId in persons) {
        const person = persons[personId];
        const personErrors = emptyErrorResults;

        const visitedPlacesStats = [];
        const journey = odSurveyHelper.getJourneysArray({ person })[0];
        const visitedPlaces = journey === undefined ? {} : odSurveyHelper.getVisitedPlaces({ journey });
        const visitedPlacesArray = journey === undefined ? [] : odSurveyHelper.getVisitedPlacesArray({ journey });

        for (let i = 0, count = visitedPlacesArray.length; i < count; i++) {
            const visitedPlace = visitedPlacesArray[i];
            const visitedPlaceErrors = emptyErrorResults;

            const visitedPlaceId = visitedPlace._uuid;
            const visitedPlacePath = `responses.household.persons.${personId}.visitedPlaces.${visitedPlaceId}`;
            const visitedPlaceStats = (
                <div className="" key={visitedPlaceId} onClick={() => props.selectPlace(visitedPlacePath)}>
                    <span className={`_widget${props.activePlacePath === visitedPlacePath ? ' _active' : ''}`}>
                        {visitedPlace._sequence}. {getVisitedPlaceDescription(visitedPlace, true, false)}
                        {" "}{visitedPlace.arrivalTime && visitedPlace.departureTime ? '(' + Math.round(10 * (visitedPlace.departureTime - visitedPlace.arrivalTime) / 3600) / 10 + 'h)' : ""}
                    </span>
                    <ValidationErrors errors={visitedPlaceErrors} />
                </div>
            );
            visitedPlacesStats.push(visitedPlaceStats);
        }

        const tripsStats = [];
        const tripsArray = journey === undefined ? [] : odSurveyHelper.getTripsArray({ journey });

        for (let i = 0, count = tripsArray.length; i < count; i++) {
            const trip = tripsArray[i];
            const tripErrors = emptyErrorResults;
            const tripId = trip._uuid;
            const origin = odSurveyHelper.getOrigin({ trip, visitedPlaces });
            const startAt = origin.departureTime;
            const destination = odSurveyHelper.getDestination({ trip, visitedPlaces });
            const endAt = destination.arrivalTime;
            const duration = !_isBlank(startAt) && !_isBlank(endAt) ? endAt - startAt : undefined;
            const birdSpeedMps = null; // FIXME Calculate

            const segmentsArray = odSurveyHelper.getSegmentsArray({ trip });
            const segmentsErrors = emptyErrorResults;
            const segmentsStats = [];

            for (let j = 0, countJ = segmentsArray.length; j < countJ; j++) {
                const segment = segmentsArray[j];
                const segmentId = segment._uuid;
                const segmentStats = [];
                if (!_isBlank(segment.mode)) {
                    if (segment.mode === 'carDriver') {
                        segmentStats.push(`(occ: ${segment.vehicleOccupancy ? segment.vehicleOccupancy.toString() : '?'} | stat: ${segment.parkingPaymentType ? segment.parkingPaymentType.toString() : '?'} | routes: ${segment.highways ? segment.highways.join(',') : '?'} | ponts: ${segment.bridgesAndTunnels ? segment.bridgesAndTunnels.join(',') : '?'} | typeVeh: ${segment.vehicleType ? segment.vehicleType.toString() : '?'})`);
                    } else if (segment.mode === 'carPassenger') {
                        segmentStats.push(`(cond: ${segment.driver ? segment.driver.toString() : '?'})`);
                    } else if (segment.mode === 'transitBus') {
                        segmentStats.push(`(lignes: ${segment.busLines ? segment.busLines.join(',') : '?'})`);
                    } else if (segment.mode === 'transitSubway') {
                        segmentStats.push(`(stations: ${segment.subwayStationStart ? segment.subwayStationStart.toString() : '?'} -> ${segment.subwayStationEnd ? segment.subwayStationEnd.toString() : '?'} [${segment.subwayTransferStations ? segment.subwayTransferStations.join(',') : '?'}])`);
                    } else if (segment.mode === 'transitRail') {
                        segmentStats.push(`(gares: ${segment.trainStationStart ? segment.trainStationStart.toString() : '?'} -> ${segment.trainStationEnd ? segment.trainStationEnd.toString() : '?'})`);
                    } else if (segment.mode === 'bicycle') {
                        segmentStats.push(`(vélopartage: ${segment.usedBikesharing ? segment.usedBikesharing.toString() : '?'})`);
                    }
                }
                segmentsStats.push(<span className="" style={{ display: 'block' }} key={segment._uuid}><strong>{segment.mode || '?'}</strong>: {segmentStats}</span>);
            }

            const tripStats = (
                <div className="" key={tripId} onClick={() => props.selectTrip(tripId)}>
                    <span key="trip" className={`_widget${props.activeTripUuid === tripId ? ' _active' : ''}`}>
                        {trip._sequence}. <FontAwesomeIcon icon={faClock} className="faIconLeft" />
                        {secondsSinceMidnightToTimeStr(startAt)}
                        <FontAwesomeIcon icon={faArrowRight} />
                        {secondsSinceMidnightToTimeStr(endAt)}
                        {" "}({Math.ceil(duration / 60)} min) • ({Math.round((birdSpeedMps * 3.6 * 100) / 100)}km/h)
                    </span>
                    <span key="segments" style={{ marginLeft: '1rem' }} className={`_widget${props.activeTripUuid === tripId ? ' _active' : ''}`}>
                        {segmentsStats}
                    </span>
                    <ValidationErrors errors={tripErrors} />
                    <ValidationErrors errors={segmentsErrors} />
                </div>
            );
            tripsStats.push(tripStats);
        }

        const personStats = (
            <details open={household.persons[personId].keepDiscard !== 'Discard'} className="_widget_container" key={personId}>
                <KeepDiscard personId={personId} choice={household.persons[personId].keepDiscard} onChange={keepDiscard} />
                <summary>{person.gender} {person.age} ans</summary>
                <span className="_widget"><FontAwesomeIcon icon={faUserCircle} className="faIconLeft" />{person.age} ans</span>
                <span className="_widget">{person.gender}</span>
                <span className="_widget">{person.occupation}</span>
                <span className="_widget">{person.whoAnsweredForThisPerson !== person._uuid ? 'proxy' : 'non-proxy'}</span>
                <br />
                {person.usualWorkPlaceIsHome && <span className="_widget _pale _oblique">workAtHome</span>}
                {person.workOnTheRoad && <span className="_widget _pale _oblique">workOnTheRoad</span>}
                <span className="_widget _pale _oblique">noWorkTrip?:{person.noWorkTripReason}</span>
                <span className="_widget _pale _oblique">noSchoolTrip?:{person.noSchoolTripReason}</span>
                <br />
                {person.didTripsOnTripsDate === 'yes' && <span className="_widget _green">DidTrips</span>}
                {person.didTripsOnTripsDate === 'no' && <span className="_widget _green">noTrips</span>}
                {person.didTripsOnTripsDate === 'dontKnow' && <span className="_widget _red">dontKnowTrips</span>}
                {person.didTripsOnTripsDateKnowTrips === 'no' && <span className="_widget _red">dontKnowTrips</span>}
                {person.drivingLicenseOwner === 'yes' && <span className="_widget"><FontAwesomeIcon icon={faCheck} /><img src={steeringWheelSvg} /><FontAwesomeIcon icon={faIdCard} /></span>}
                {person.drivingLicenseOwner === 'no' && <span className="_widget"><FontAwesomeIcon icon={faTimes} /><img src={steeringWheelSvg} /><FontAwesomeIcon icon={faIdCard} /></span>}
                {person.drivingLicenseOwner === 'dontKnow' && <span className="_widget">?<img src={steeringWheelSvg} /><FontAwesomeIcon icon={faIdCard} /></span>}
                {person.transitPassOwner === 'yes' && <span className="_widget"><FontAwesomeIcon icon={faCheck} /><FontAwesomeIcon icon={faBus} /><FontAwesomeIcon icon={faIdCard} /></span>}
                {person.transitPassOwner === 'no' && <span className="_widget"><FontAwesomeIcon icon={faTimes} /><FontAwesomeIcon icon={faBus} /><FontAwesomeIcon icon={faIdCard} /></span>}
                {person.transitPassOwner === 'dontKnow' && <span className="_widget">?<FontAwesomeIcon icon={faBus} /><FontAwesomeIcon icon={faIdCard} /></span>}
                {person.carsharingMember === 'yes' && <span className="_widget"><FontAwesomeIcon icon={faCheck} /><FontAwesomeIcon icon={faCarSide} /><FontAwesomeIcon icon={faIdCard} /></span>}
                {person.carsharingMember === 'no' && <span className="_widget"><FontAwesomeIcon icon={faTimes} /><FontAwesomeIcon icon={faCarSide} /><FontAwesomeIcon icon={faIdCard} /></span>}
                {person.carsharingMember === 'dontKnow' && <span className="_widget">?<FontAwesomeIcon icon={faCarSide} /><FontAwesomeIcon icon={faIdCard} /></span>}
                {person.bikesharingMember === 'yes' && <span className="_widget"><FontAwesomeIcon icon={faCheck} /><FontAwesomeIcon icon={faBicycle} /><FontAwesomeIcon icon={faIdCard} /></span>}
                {person.bikesharingMember === 'no' && <span className="_widget"><FontAwesomeIcon icon={faTimes} /><FontAwesomeIcon icon={faBicycle} /><FontAwesomeIcon icon={faIdCard} /></span>}
                {person.bikesharingMember === 'dontKnow' && <span className="_widget">?<FontAwesomeIcon icon={faBicycle} /><FontAwesomeIcon icon={faIdCard} /></span>}
                <ValidationErrors errors={personErrors} />
                {visitedPlacesStats.length > 0 && <br />}
                {visitedPlacesStats}
                {tripsStats.length > 0 && <br />}
                {tripsStats}
            </details>
        );
        personsStats.push(personStats);
    }

    const householdIncomeChoice = surveyHelper.getWidgetChoiceFromValue({ widget: surveyContext.widgets.householdIncome, value: household.income, interview: interview, path: 'household.income' });
    const householdIncomeLabel = householdIncomeChoice ? surveyHelper.parseString(householdIncomeChoice.label[i18n.language] || householdIncomeChoice.label, interview, householdIncomeChoice.path, props.user) : "?";
    let phoneIcon = null;
    switch (household.residentialPhoneType) {
        case 'landLine':
            phoneIcon = <span className="_widget" title="Ligne téléphonique fixe"><img src={wiredPhoneSvg} className="faIconLeft" /></span>;
            break;
        case 'ip':
            phoneIcon = <span className="_widget" title="Téléphone résidentiel IP"><FontAwesomeIcon icon={faPhoneVolume} className="faIconLeft" /></span>;
            break;
        case 'cellphone':
            phoneIcon = <span className="_widget" title="Téléphone résidentiel cellulaire partagé"><FontAwesomeIcon icon={faPhone} className="faIconLeft" /><FontAwesomeIcon icon={faMobileAlt} className="faIconLeft" /></span>;
            break;
        case 'none':
            phoneIcon = <span className="_widget" title="Aucune ligne téléphonique résidentielle"><FontAwesomeIcon icon={faPhoneSlash} className="faIconLeft" /></span>;
            break;
        case 'dontKnow':
            phoneIcon = <span className="_widget" title="Téléphone résidentiel inconnu"><FontAwesomeIcon icon={faPhone} className="faIconLeft" />?</span>
            break;
        default:
            phoneIcon = <span className="_widget" title="Téléphone résidentiel non déclaré"><FontAwesomeIcon icon={faPhone} /><img src={emptySetSvg} className="faIconLeft" /></span>
    }

    return (
        <React.Fragment>
            <div className="admin__interview-stats" key="household">
                <h4>Entrevue</h4>
                <span className="_widget">UUID: <span className="_strong">{interview.uuid}</span></span>
                {(interview.username || interview.email) && <span className="_widget">Username/Email: <span className="_strong">{interview.username || interview.email}</span></span>}
                {interview.google_id && <span className="_widget">Google ID: <span className="_strong">{interview.google_id}</span></span>}
                {interview.facebook_id && <span className="_widget">Facebook ID: <span className="_strong">{interview.facebook_id}</span></span>}
                {home && <span className="_widget"><span className="_strong">{home.address ? home.address : ""} {home.apartmentNumber ? ("app" + home.apartmentNumber) : ""} {home.city ? home.city : ""}</span></span>}
                <span className="_widget">Code d'accès: <span className="_strong">{responses.accessCode || 'Aucun'}</span></span>
                <span className="_widget">Langue d'entrevue: <span className="_strong">{responses._language || '?'}</span></span>
                <span className="_widget">Date de déplacements: <span className="_strong">{formattedTripsDate}</span></span>
                <ValidationErrors errors={interviewErrors} />
                <h4>Ménage</h4>
                <span className="_widget"><FontAwesomeIcon icon={faUserCircle} className="faIconLeft" />{household.size}</span>
                <span className="_widget"><FontAwesomeIcon icon={faCar} className="faIconLeft" />{household.carNumber}</span>
                {phoneIcon}
                <span className="_widget"><FontAwesomeIcon icon={faDollarSign} className="faIconLeft" />{householdIncomeLabel}</span>
                <ValidationErrors errors={householdErrors} />
            </div>
            <div className="admin__interview-stats" key="persons">
                <h4>Personnes</h4>
                {personsStats}
            </div>
            <div className="admin__interview-stats" key="comments">
                <h4>Commentaire</h4>
                <p className="_scrollable _oblique _small">{household.commentsOnSurvey || "Aucun commentaire"}</p>
            </div>
        </React.Fragment>
    );
}

export default InterviewStats;
