/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React                    from 'react';
import _upperFirst from 'lodash/upperFirst';
import _cloneDeep from 'lodash/cloneDeep';
import _get                     from 'lodash/get';
import { WithTranslation, withTranslation }      from 'react-i18next';
import { FontAwesomeIcon }      from '@fortawesome/react-fontawesome';
import { faPencilAlt }          from '@fortawesome/free-solid-svg-icons/faPencilAlt';
import { faClock }              from '@fortawesome/free-solid-svg-icons/faClock';
import { faArrowRight }         from '@fortawesome/free-solid-svg-icons/faArrowRight';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import  { secondsSinceMidnightToTimeStr } from 'chaire-lib-common/lib/utils/DateTimeUtils';
import { withSurveyContext, WithSurveyContextProps } from 'evolution-frontend/lib/components/hoc/WithSurveyContextHoc';
import { GroupedObject } from 'evolution-frontend/lib/components/survey/GroupWidgets';
import { Widget } from 'evolution-frontend/lib/components/survey/Widget';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import helper          from '../helper';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { SectionProps, useSectionTemplate } from 'evolution-frontend/lib/components/hooks/useSectionTemplate';

export const SegmentsSection: React.FC<SectionProps & WithTranslation & WithSurveyContextProps> = (
    props: SectionProps & WithTranslation & WithSurveyContextProps
) => {
    const { preloaded } = useSectionTemplate(props);
    const iconPathsByMode = React.useMemo(() => {
        const iconPathsByMode = {};
        const modes           = props.surveyContext.widgets['segmentMode'].choices;
        for (let i = 0, count = modes.length; i < count; i++)
        {
            const mode     = modes[i].value;
            const iconPath = modes[i].iconPath;
            iconPathsByMode[mode] = iconPath;
        }
        return iconPathsByMode;
    }, []);

    const selectTrip = (tripUuid, e) => {
        if (e)
        {
            e.preventDefault();
        }
        props.startUpdateInterview('segments', {
            [`responses._activeTripId`]: tripUuid
        });
    }


    if (!preloaded)
    {
      return <LoadingPage />;
    }
   
    surveyHelper.devLog('%c rendering section ' + props.shortname, 'background: rgba(0,0,255,0.1);')
    const widgetsComponentsByShortname = {};
    const personTripsConfig            = props.surveyContext.widgets['personTrips'];
    const person                       = helper.getPerson(props.interview);
    const journeys = odSurveyHelper.getJourneysArray({ person });
    const currentJourney = journeys[0];

    const trips      = currentJourney.trips || {};
    const tripsList  = [];

    const visitedPlaces = currentJourney.visitedPlaces || {};
    const selectedTripId  = helper.getActiveTripId(props.interview);
    let   selectedTrip    = selectedTripId ? trips[selectedTripId] : null;

    //console.log('selectedTripId', selectedTripId);

    // setup widgets:

    for (let i = 0, count = props.sectionConfig.widgets.length; i < count; i++)
    {
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
            />
        );
    }
    
    for (let i = 0, count = Object.keys(trips).length; i < count; i++)
    {
      const trip             = trips[Object.keys(trips)[i]];
      const origin           = visitedPlaces[trip._originVisitedPlaceUuid] as any;
      const destination      = visitedPlaces[trip._destinationVisitedPlaceUuid] as any;
      const tripPath         = `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.trips.${trip._uuid}`;
      let   selectedTrip     = null;
      const modeIcons        = [];

      //console.log('trip.segments', trip.segments);

      if (!_isBlank(trip.segments))
      {
        for (const segmentId in trip.segments)
        {
          const segment = trip.segments[segmentId];
          if (segment.mode)
          {
            modeIcons.push(
              <React.Fragment key={segment._uuid}>
                <img src={iconPathsByMode[segment.mode]} style={{height: '1.5em', marginLeft: '0.3em'}} alt={props.t([`customSurvey:segments:mode:${_upperFirst(segment.mode)}`, `segments:mode:${_upperFirst(segment.mode)}`])} />
              </React.Fragment>
            );
          }
        }
      }

      const tripItem         = (
        <li className={`no-bullet survey-trip-item survey-trip-item-name${trip._uuid === selectedTripId ? ' survey-trip-item-selected' : ''}`} key={`survey-trip-item__${i}`}>
          <span className="survey-trip-item-element survey-trip-item-sequence-and-icon">
            <em>{props.t('survey:trip:trip')} {trip['_sequence']}</em>
          </span>
          <span className="survey-trip-item-element survey-trip-item-buttons">
            <FontAwesomeIcon icon={faClock} style={{ marginRight: '0.3rem', marginLeft: '0.6rem'}} />
            {origin && origin.departureTime && secondsSinceMidnightToTimeStr(origin.departureTime)}
            <FontAwesomeIcon icon={faArrowRight} style={{ marginRight: '0.3rem', marginLeft: '0.3rem'}} />
            {destination && destination.arrivalTime && secondsSinceMidnightToTimeStr(destination.arrivalTime)}
            {!selectedTripId && props.loadingState === 0 && <button
              type      = "button"
              className = {`survey-section__button button blue small`}
              onClick   = {(e) => selectTrip(trip._uuid, e)}
              style     = {{marginLeft: '0.5rem'}}
              title     = {props.t('survey:trip:editTrip')}
            >
              <FontAwesomeIcon icon={faPencilAlt} className="" />
            </button>}
          </span>
        </li>
      );
      tripsList.push(tripItem);
      if (origin && destination)
      {
        tripsList.push(
          <li className={`no-bullet survey-trip-item survey-trip-item-description${trip._uuid === selectedTripId ? ' survey-trip-item-selected' : ''}`} key={`survey-trip-item-origin-destination__${i}`}>
            <span className="survey-trip-item-element survey-trip-item-origin-description">
              <img src={`/dist/images/activities_icons/${origin.activity}_marker.svg`} style={{height: '4rem'}} alt={props.t(`visitedPlaces/activities/${origin.activity}`)} />
              <span>
                {props.t(`survey:visitedPlace:activities:${origin.activity}`)}
                { origin.name && (<React.Fragment><br /><em>&nbsp;• {origin.name}</em></React.Fragment>) }
              </span>
            </span>
            <span className="survey-trip-item-element survey-trip-item-arrow">
              <FontAwesomeIcon icon={faArrowRight} style={{ marginRight: '0.3rem', marginLeft: '0.3rem'}} />
            </span>
            <span className="survey-trip-item-element survey-trip-item-destination-description">
              <img src={`/dist/images/activities_icons/${destination.activity}_marker.svg`} style={{height: '4rem'}} alt={props.t(`visitedPlaces/activities/${destination.activity}`)} />
              <span>
                {props.t(`survey:visitedPlace:activities:${destination.activity}`)}
                { destination.name && (<React.Fragment><br /><em>&nbsp;• {destination.name}</em></React.Fragment>) }
              </span>
            </span>
          </li>
        );
        tripsList.push(
          <li className={`no-bullet survey-trip-item survey-trip-item-mode-icons${trip._uuid === selectedTripId ? ' survey-trip-item-selected' : ''}`} key={`survey-trip-item-origin-mode-icon__${i}`}>
            {modeIcons}
          </li>
        );
      }

      if (selectedTripId && trip._uuid === selectedTripId)
      {
        const parentObjectIds = {};
        parentObjectIds['personTrips'] = trip._uuid;
        selectedTrip = (
          <li className="no-bullet" style={{marginTop: "-0.4rem"}} key={`survey-trip-item-selected__${i}`}>
            <GroupedObject
              widgetConfig                = {personTripsConfig}
              shortname                   = 'personTrips'
              path                        = {tripPath}
              loadingState                = {props.loadingState}
              objectId                    = {trip._uuid}
              parentObjectIds             = {parentObjectIds}
              key                         = {`survey-trip-item-selected-${trip._uuid}`}
              sequence                    = {trip['_sequence']}
              section                     = {'segments'}
              interview                   = {props.interview}
              user                        = {props.user}
              errors                      = {props.errors}
              startUpdateInterview        = {props.startUpdateInterview}
              startAddGroupedObjects      = {props.startAddGroupedObjects}
              startRemoveGroupedObjects   = {props.startRemoveGroupedObjects}
            />
          </li>
        );
        tripsList.push(selectedTrip);
      }
    }
    return (
      <section className = {`survey-section survey-section-shortname-${props.shortname}`}>
        <div className="survey-section__content">
          {widgetsComponentsByShortname['activePersonTitle']}
          {widgetsComponentsByShortname['buttonSwitchPerson']}
          <div className="survey-trips-list-and-map-container">
            <ul className={`survey-trips-list ${selectedTripId ? 'full-width' : ''}`}>
              {widgetsComponentsByShortname['personTripsTitle']}
              {tripsList}
              <li className="no-bullet" key='survey-trips-list-confirm-button'>
                {!selectedTripId && widgetsComponentsByShortname['buttonConfirmNextSection']}
              </li>
            </ul>
            {!selectedTripId && <div className={`survey-trips-map`}>
              {widgetsComponentsByShortname['personVisitedPlacesMap']}
            </div>}
          </div>
        </div>
      </section>
    );
};

export default withTranslation()(withSurveyContext(SegmentsSection));