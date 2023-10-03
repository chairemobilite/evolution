/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React                          from 'react';
import { withTranslation }            from 'react-i18next';
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

import appConfig        from 'evolution-frontend/lib/config/application.config';
import emptySetSvg      from '../../../assets/images/admin/empty-set-solid.svg';
import wiredPhoneSvg    from '../../../assets/images/admin/phone-with-wire.svg';
import steeringWheelSvg from '../../../assets/images/admin/steering-wheel-solid.svg'
import { _isBlank }     from 'chaire-lib-common/lib/utils/LodashExtensions';
import  { secondsSinceMidnightToTimeStr } from 'chaire-lib-common/lib/utils/DateTimeUtils';
import surveyHelper     from '../../../helpers/survey/survey';
import demoSurveyHelper from '../../../helpers/survey/helper';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import { withSurveyContext } from 'evolution-frontend/lib/components/hoc/WithSurveyContextHoc';
import ValidationErrors from './ValidationErrors';

class KeepDiscardIgnoreImp extends React.Component {
    static KEEP = 'keep'
    static DISCARD = 'discard'
    static IGNORE = 'ignore'

    constructor(props) {
      super(props);

      this.state = {
        choice: props.choice || KeepDiscardIgnoreImp.choice
      };

      this.onChange = (ev) => this.setState({ choice: ev.target.value })
    }

    componentDidUpdate(prevProps, prevState) {
        if ((prevState.choice === this.state.choice) || !this.props.CB) return
        this.props.CB({ choice: this.state.choice, personId: this.props.personId })
    }

    render () {
        return (
            <div className='_member-survey-keeper'>
                <label className='_member-survey-keeper-left' onChange={this.onChange}>
                    <span style={this.state.choice === KeepDiscardIgnoreImp.KEEP ? {background: 'lightgreen'} : {}}>
                      {this.props.t(`admin:interviewMember:${KeepDiscardIgnoreImp.KEEP}`)}
                    </span>
                    <input defaultChecked={this.state.choice === KeepDiscardIgnoreImp.KEEP} type="radio" name={`should-keep-${this.props.personId}`} value={KeepDiscardIgnoreImp.KEEP} />
                </label>

                <label className='_member-survey-keeper-center' onChange={this.onChange}>

                    <span style={this.state.choice === KeepDiscardIgnoreImp.DISCARD ? {background: 'lightcoral'} : {}}>
                      {this.props.t(`admin:interviewMember:${KeepDiscardIgnoreImp.DISCARD}`)}
                    </span>
                    <input defaultChecked={this.state.choice === KeepDiscardIgnoreImp.DISCARD} type="radio" name={`should-keep-${this.props.personId}`} value={KeepDiscardIgnoreImp.DISCARD} />
                </label>

                <label className='_member-survey-keeper-right' onChange={this.onChange}>
                    <span style={this.state.choice === KeepDiscardIgnoreImp.IGNORE ? {background: 'lightgray'} : {}}>
                      {this.props.t(`admin:interviewMember:${KeepDiscardIgnoreImp.IGNORE}`)}
                    </span>
                    <input defaultChecked={this.state.choice === KeepDiscardIgnoreImp.IGNORE} type="radio" name={`should-keep-${this.props.personId}`} value={KeepDiscardIgnoreImp.IGNORE} />
                </label>
            </div>
        )
    }
}

const KeepDiscardIgnore = withTranslation()(KeepDiscardIgnoreImp)

class InterviewStats extends React.Component {

  constructor(props) {
    super(props);
    //this.state = {
    //  parsed: false
    //};
    this.validations = appConfig.getAdminValidations();

    this.KeepDiscardIgnoreChange = ({ choice, personId }) => {
        const valuesByPath = {};
        valuesByPath[`responses.household.persons.${personId}.keepDiscardIgnore`] = choice;
        this.props.startUpdateInterview(undefined, valuesByPath, null, null);
    }
  }

  componentDidMount() {
    
  }

  componentWillUnmount() {
  }

  render() {

    //if (!this.state.parsed)
    //{
    //  return null;
    //}
    const interview      = this.props.interview;
    const responses      = interview.responses;
    const household      = _get(responses, 'household');
    const home           = _get(responses, 'home');
    const persons        = demoSurveyHelper.getPersons(interview, false);
    const personsArray   = demoSurveyHelper.getPersons(interview, true);

    const interviewErrors    = demoSurveyHelper.validateInterview(this.validations.interview, this.props.i18n.language, {}, interview, responses, household, home, persons, personsArray);
    const householdErrors    = demoSurveyHelper.validateHousehold(this.validations.household, this.props.i18n.language, {}, interview, responses, household, home, persons, personsArray);

    const formattedTripsDate = responses.tripsDate ? moment(responses.tripsDate).format('LL') : "-";

    const personsStats = [];
    for (const personId in persons)
    {

      const person       = persons[personId];
      const personErrors = demoSurveyHelper.validatePerson(this.validations.person, this.props.i18n.language, {}, interview, responses, household, home, persons, personsArray, person);
      
      const visitedPlacesStats = [];
      const visitedPlaces      = demoSurveyHelper.getVisitedPlaces(person, false);
      const visitedPlacesArray = demoSurveyHelper.getVisitedPlaces(person, true);
      
      for(let i = 0, count = visitedPlacesArray.length; i < count; i++)
      {
        const visitedPlace       = visitedPlacesArray[i];
        const visitedPlaceErrors = demoSurveyHelper.validateVisitedPlace(this.validations.visitedPlace, this.props.i18n.language, {}, interview, responses, household, home, persons, personsArray, person, visitedPlaces, visitedPlacesArray, visitedPlace);
      
        const visitedPlaceId     = visitedPlace._uuid;
        const visitedPlacePath   = `responses.household.persons.${personId}.visitedPlaces.${visitedPlaceId}`;
        const visitedPlaceStats = (
          <div className="" key={visitedPlaceId} onClick={() => this.props.selectPlace(visitedPlacePath)}>
            <span className={`_widget${this.props.activePlacePath === visitedPlacePath ? ' _active' : ''}`}>
              {visitedPlace._sequence}. {demoSurveyHelper.getVisitedPlaceDescription(visitedPlace, true, false)}
              {" "}{visitedPlace.arrivalTime && visitedPlace.departureTime ? '(' + Math.round(10*(visitedPlace.departureTime - visitedPlace.arrivalTime)/3600)/10 + 'h)' : ""}
            </span>
            <ValidationErrors errors={visitedPlaceErrors} />
          </div>
        );
        visitedPlacesStats.push(visitedPlaceStats);
      }

      const tripsStats = [];
      const trips      = demoSurveyHelper.getTrips(person, false);
      const tripsArray = demoSurveyHelper.getTrips(person, true);
      
      for(let i = 0, count = tripsArray.length; i < count; i++)
      {

        const trip                 = tripsArray[i];
        const tripErrors           = demoSurveyHelper.validateTrip(this.validations.trip, this.props.i18n.language, {}, interview, responses, household, home, persons, personsArray, person, visitedPlaces, visitedPlacesArray, trips, tripsArray, trip);
        const tripId               = trip._uuid;
        const origin               = visitedPlaces[trip._originVisitedPlaceUuid];
        const destination          = visitedPlaces[trip._destinationVisitedPlaceUuid];
        const originGeography      = demoSurveyHelper.getGeography(origin, person, interview);
        const destinationGeography = demoSurveyHelper.getGeography(destination, person, interview);
        const startAt              = demoSurveyHelper.getStartAt(trip, visitedPlaces);
        const endAt                = demoSurveyHelper.getEndAt(trip, visitedPlaces);
        const duration             = demoSurveyHelper.getDurationSec(trip, visitedPlaces);
        const distance             = demoSurveyHelper.getBirdDistanceMeters(trip, visitedPlaces, person, interview);
        const birdSpeedMps         = demoSurveyHelper.getBirdSpeedMps(trip, visitedPlaces, person, interview);
        //const tripTransferCategory = helper.getTripTransferCategory(trip);

        const segments       = demoSurveyHelper.getSegments(trip, false);
        const segmentsArray  = demoSurveyHelper.getSegments(trip, true);
        let   segmentsErrors = [];
        const segmentsStats  = [];
        
        for (let j = 0, countJ = segmentsArray.length; j < countJ; j++)
        {
          const segment      = segmentsArray[j];
          segmentsErrors     = segmentsErrors.concat(demoSurveyHelper.validateSegment(this.validations.segment, this.props.i18n.language, {}, interview, responses, household, home, persons, personsArray, person, visitedPlaces, visitedPlacesArray, trips, tripsArray, trip, segments, segmentsArray, segment));
          const segmentId    = segment._uuid;
          const segmentStats = [];
          if (!_isBlank(segment.mode))
          {
            if (segment.mode === 'carDriver')
            {
              segmentStats.push(`(occ: ${segment.vehicleOccupancy ? segment.vehicleOccupancy.toString() : '?'} | stat: ${segment.parkingPaymentType ? segment.parkingPaymentType.toString() : '?'} | routes: ${segment.highways ? segment.highways.join(',') : '?'} | ponts: ${segment.bridgesAndTunnels ? segment.bridgesAndTunnels.join(',') : '?'} | typeVeh: ${segment.vehicleType ? segment.vehicleType.toString() : '?'})`);
            }
            else if (segment.mode === 'carPassenger')
            {
              segmentStats.push(`(cond: ${segment.driver ? segment.driver.toString() : '?'})`);
            }
            else if (segment.mode === 'transitBus')
            {
              segmentStats.push(`(lignes: ${segment.busLines ? segment.busLines.join(',') : '?'})`);
            }
            else if (segment.mode === 'transitSubway')
            {
              segmentStats.push(`(stations: ${segment.subwayStationStart ? segment.subwayStationStart.toString() : '?'} -> ${segment.subwayStationEnd ? segment.subwayStationEnd.toString() : '?'} [${segment.subwayTransferStations ? segment.subwayTransferStations.join(',') : '?'}])`);
            }
            else if (segment.mode === 'transitRail')
            {
              segmentStats.push(`(gares: ${segment.trainStationStart ? segment.trainStationStart.toString() : '?'} -> ${segment.trainStationEnd ? segment.trainStationEnd.toString() : '?'})`);
            }
            else if (segment.mode === 'bicycle')
            {
              segmentStats.push(`(vélopartage: ${segment.usedBikesharing ? segment.usedBikesharing.toString() : '?'})`);
            }
          }
          segmentsStats.push(<span className="" style={{display: 'block'}} key={segment._uuid}><strong>{segment.mode || '?'}</strong>: {segmentStats}</span>);
          
        }
        
        const tripStats = (
          <div className="" key={tripId} onClick={() => this.props.selectTrip(tripId)}>
            <span key="trip" className={`_widget${this.props.activeTripUuid === tripId ? ' _active' : ''}`}>
              {trip._sequence}. <FontAwesomeIcon icon={faClock} className="faIconLeft" />
              {secondsSinceMidnightToTimeStr(startAt)}
              <FontAwesomeIcon icon={faArrowRight} />
              {secondsSinceMidnightToTimeStr(endAt)}
              {" "}({Math.ceil(duration / 60)} min) • ({Math.round((birdSpeedMps*3.6*100)/100)}km/h)
            </span>
            <span key="segments" style={{marginLeft: '1rem'}} className={`_widget${this.props.activeTripUuid === tripId ? ' _active' : ''}`}>
              {segmentsStats}
            </span>
            <ValidationErrors errors={tripErrors} />
            <ValidationErrors errors={segmentsErrors} />
          </div>
        );
        tripsStats.push(tripStats);
      }
      

      const personStats = (
        <div className="_widget_container" key={personId}>
          <KeepDiscardIgnore personId={personId} choice={household.persons[personId].keepDiscardIgnore || KeepDiscardIgnoreImp.KEEP} CB={this.KeepDiscardIgnoreChange} />
          <span className="_widget"><FontAwesomeIcon icon={faUserCircle} className="faIconLeft" />{person.age} ans</span>
          <span className="_widget">{person.gender}</span>
          <span className="_widget">{person.occupation}</span>
          <span className="_widget">{person.whoAnsweredForThisPerson !== person._uuid ? 'proxy' : 'non-proxy'}</span>
          <br />
          {person.usualWorkPlaceIsHome && <span className="_widget _pale _oblique">workAtHome</span>}
          {person.workOnTheRoad        && <span className="_widget _pale _oblique">workOnTheRoad</span>}
          <span className="_widget _pale _oblique">noWorkTrip?:{person.noWorkTripReason}</span>
          <span className="_widget _pale _oblique">noSchoolTrip?:{person.noSchoolTripReason}</span>
          <br />
          
          {person.didTripsOnTripsDate === 'yes' && <span className="_widget _green">DidTrips</span>} 
          {person.didTripsOnTripsDate === 'no' && <span className="_widget _green">noTrips</span>}
          {person.didTripsOnTripsDate === 'dontKnow' && <span className="_widget _red">dontKnowTrips</span>}
          {person.didTripsOnTripsDateKnowTrips === 'no' && <span className="_widget _red">dontKnowTrips</span>}

          {person.drivingLicenseOwner === 'yes'  && <span className="_widget"><FontAwesomeIcon icon={faCheck} /><img src={steeringWheelSvg} /><FontAwesomeIcon icon={faIdCard} /></span>}
          {person.drivingLicenseOwner === 'no' && <span className="_widget"><FontAwesomeIcon icon={faTimes} /><img src={steeringWheelSvg} /><FontAwesomeIcon icon={faIdCard} /></span>}
          {person.drivingLicenseOwner === 'dontKnow' && <span className="_widget">?<img src={steeringWheelSvg} /><FontAwesomeIcon icon={faIdCard} /></span>}
          
          {person.transitPassOwner === 'yes'  && <span className="_widget"><FontAwesomeIcon icon={faCheck} /><FontAwesomeIcon icon={faBus} /><FontAwesomeIcon icon={faIdCard} /></span>}
          {person.transitPassOwner === 'no' && <span className="_widget"><FontAwesomeIcon icon={faTimes} /><FontAwesomeIcon icon={faBus} /><FontAwesomeIcon icon={faIdCard} /></span>}
          {person.transitPassOwner === 'dontKnow' && <span className="_widget">?<FontAwesomeIcon icon={faBus} /><FontAwesomeIcon icon={faIdCard} /></span>}
          
          {person.carsharingMember === 'yes'  && <span className="_widget"><FontAwesomeIcon icon={faCheck} /><FontAwesomeIcon icon={faCarSide} /><FontAwesomeIcon icon={faIdCard} /></span>}
          {person.carsharingMember === 'no' && <span className="_widget"><FontAwesomeIcon icon={faTimes} /><FontAwesomeIcon icon={faCarSide} /><FontAwesomeIcon icon={faIdCard} /></span>}
          {person.carsharingMember === 'dontKnow' && <span className="_widget">?<FontAwesomeIcon icon={faCarSide} /><FontAwesomeIcon icon={faIdCard} /></span>}
          
          {person.bikesharingMember === 'yes'  && <span className="_widget"><FontAwesomeIcon icon={faCheck} /><FontAwesomeIcon icon={faBicycle} /><FontAwesomeIcon icon={faIdCard} /></span>}
          {person.bikesharingMember === 'no' && <span className="_widget"><FontAwesomeIcon icon={faTimes} /><FontAwesomeIcon icon={faBicycle} /><FontAwesomeIcon icon={faIdCard} /></span>}
          {person.bikesharingMember === 'dontKnow' && <span className="_widget">?<FontAwesomeIcon icon={faBicycle} /><FontAwesomeIcon icon={faIdCard} /></span>}
          
          <ValidationErrors errors={personErrors} />

          {visitedPlacesStats.length > 0 && <br />}

          {visitedPlacesStats}

          {tripsStats.length > 0 && <br />}

          {tripsStats}

        </div>
      );
      personsStats.push(personStats);
    }

    const householdIncomeChoice = surveyHelper.getWidgetChoiceFromValue(this.props.surveyContext.widgets.householdIncome, household.income, interview);
    const householdIncomeLabel  = householdIncomeChoice ? surveyHelperNew.parseString(householdIncomeChoice.label[this.props.i18n.language] || householdIncomeChoice.label, interview, householdIncomeChoice.path, this.props.user) : "?";
    let phoneIcon = null;
    switch(household.residentialPhoneType) {
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
          { home && <span className="_widget"><span className="_strong">{home.address ? home.address : ""} {home.apartmentNumber ? ("app" + home.apartmentNumber) : ""} {home.city ? home.city : ""}</span></span>}
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

}





export default withTranslation()(withSurveyContext(InterviewStats))