/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React                    from 'react';
import _get                     from 'lodash/get';
import { useNavigate, useLocation } from 'react-router';
import _cloneDeep from 'lodash/cloneDeep';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { useTranslation }      from 'react-i18next';
import { FontAwesomeIcon }      from '@fortawesome/react-fontawesome';
import { faTrashAlt }           from '@fortawesome/free-solid-svg-icons/faTrashAlt';
import { faArrowsAltV }         from '@fortawesome/free-solid-svg-icons/faArrowsAltV';
import { faPencilAlt }          from '@fortawesome/free-solid-svg-icons/faPencilAlt';
import { faPlusCircle }         from '@fortawesome/free-solid-svg-icons/faPlusCircle';
import { faClock }              from '@fortawesome/free-solid-svg-icons/faClock';
import { faArrowRight }         from '@fortawesome/free-solid-svg-icons/faArrowRight';
//import HTMLEllipsis from 'react-lines-ellipsis/lib/html';
//import responsiveHOC from 'react-lines-ellipsis/lib/responsiveHOC';

//const ResponsiveEllipsis = responsiveHOC()(HTMLEllipsis);
// activities icons:
//import { faWork } from '@fortawesome/free-solid-svg-icons/faBriefcase';
//import { faMedical } from '@fortawesome/free-solid-svg-icons/faBriefcaseMedical';
//import { faMedical } from '@fortawesome/free-solid-svg-icons/faBriefcaseMedical';

import  { secondsSinceMidnightToTimeStr } from 'chaire-lib-common/lib/utils/DateTimeUtils';
import { GroupedObject } from 'evolution-frontend/lib/components/survey/GroupWidgets';
import { Widget } from 'evolution-frontend/lib/components/survey/Widget';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import helper          from '../helper';
import ConfirmModal    from 'chaire-lib-frontend/lib/components/modal/ConfirmModal';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { getPathForSection } from 'evolution-frontend/lib/services/url';
import { SectionProps, useSectionTemplate } from 'evolution-frontend/lib/components/hooks/useSectionTemplate';
import { SurveyContext } from 'evolution-frontend/lib/contexts/SurveyContext';
import { getVisitedPlaceDescription } from 'evolution-frontend/lib/services/display/frontendHelper';

export const VisitedPlacesSection: React.FC<SectionProps> = (
    props: SectionProps
) => {
    const { preloaded } = useSectionTemplate(props);
    const [ confirmDeleteVisitedPlace, setConfirmDeleteVisitedPlace ] = React.useState<string | null>(null)
    const navigate = useNavigate();
    const location = useLocation();
    const surveyContext = React.useContext(SurveyContext);
    const { t, i18n } = useTranslation('survey');

    const addVisitedPlace = (sequence, path, e) => {
        if (e)
        {
            e.preventDefault();
        }
        props.startAddGroupedObjects(1, sequence, path, [], (function(interview) {
        const person             = odSurveyHelper.getPerson({ interview }) as any;
        const journeys           = odSurveyHelper.getJourneysArray({ person });
        const currentJourney     = journeys[0];
        const visitedPlaces      = odSurveyHelper.getVisitedPlacesArray({ journey: currentJourney });
        const lastVisitedPlace   = visitedPlaces[visitedPlaces.length - 1];
        const updateValuesByPath = {};

        const path = getPathForSection(location.pathname, props.shortname);
        if (path) {
            navigate(path);
        }
        if (lastVisitedPlace && sequence === lastVisitedPlace._sequence) // we are inserting a new visited place at the end
        {
            const beforeLastVisitedPlace     = visitedPlaces[visitedPlaces.length - 2];
            const beforeLastVisitedPlacePath = `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${beforeLastVisitedPlace._uuid}`;
            updateValuesByPath[`response.${beforeLastVisitedPlacePath}.nextPlaceCategory`] = null;
        }
        updateValuesByPath[`response._activeVisitedPlaceId`] = helper.selectNextVisitedPlaceId(visitedPlaces);
        props.startUpdateInterview({ sectionShortname: 'visitedPlaces', valuesByPath: updateValuesByPath });
        }));
    }

    const selectVisitedPlace = (visitedPlaceUuid, e) => {
        if (e)
        {
            e.preventDefault();
        }
        props.startUpdateInterview({
            sectionShortname: 'visitedPlaces', 
            valuesByPath: {[`response._activeVisitedPlaceId`]: visitedPlaceUuid }
        });
    }
  
    const deleteVisitedPlace = (person, visitedPlacePath, visitedPlace, visitedPlaces, e = undefined) => {
        if (e)
        {
            e.preventDefault();
        }
        helper.deleteVisitedPlace(visitedPlacePath, props.interview, props.startRemoveGroupedObjects, props.startUpdateInterview);
    }

    if (!preloaded)
    {
      return <LoadingPage />;
    }

    surveyHelper.devLog('%c rendering section ' + props.shortname, 'background: rgba(0,0,255,0.1);')
    const widgetsComponentsByShortname = {};
    const personVisitedPlacesConfig    = surveyContext.widgets['personVisitedPlaces'];
    const person                       = odSurveyHelper.getPerson({ interview: props.interview });
    const journeys = odSurveyHelper.getJourneysArray({ person });
    const currentJourney = journeys[0];
    const householdSize                = surveyHelper.getResponse(props.interview, 'household.size', null);
    const isAlone                      = householdSize === 1;

    // setup schedules:

    const widgetsSchedules         = [];
    const percentLengthOfOneSecond = 100.0 / (28 * 3600);
    const persons                  = odSurveyHelper.getPersons({ interview: props.interview });
    let   activePersonSchedule     = null;
    const selectedVisitedPlaceId = odSurveyHelper.getActiveVisitedPlace({ interview: props.interview, journey: currentJourney })?._uuid;
    for (let _personId in persons)
    {
      const _person                         = persons[_personId];
      let   atLeastOneCompletedVisitedPlace = false;
      const _journeys = odSurveyHelper.getJourneysArray({ person: _person});
      const _currentJourney = _journeys[0];
      const visitedPlaces = _currentJourney !== undefined ? odSurveyHelper.getVisitedPlacesArray({ journey: _currentJourney }) : [];
      const personVisitedPlacesSchedules    = [];
      for (let i = 0, count = visitedPlaces.length; i < count; i++)
      {
        const visitedPlace  = visitedPlaces[i];
        const visitedPlaceDescription = getVisitedPlaceDescription(visitedPlace, true, false);
        let   departureTime           = i === count - 1 ? 28*3600 : null;
        let   arrivalTime             = i === 0 ? 0 : null;
        if (visitedPlace.departureTime)
        {
          departureTime = visitedPlace.departureTime;
        }
        if (visitedPlace.arrivalTime)
        {
          arrivalTime   = visitedPlace.arrivalTime;
        }
        if (visitedPlace.activity && !_isBlank(departureTime) && !_isBlank(arrivalTime))
        {
          atLeastOneCompletedVisitedPlace = true;
        }
        else
        {
          continue;
        }
        const startAtPercent       = Math.round(arrivalTime   * percentLengthOfOneSecond);
        const width                = Math.round(departureTime * percentLengthOfOneSecond - startAtPercent);
        const visitedPlaceSchedule = (
          <div 
            className = {`survey-visited-places-schedule-visited-place${person._uuid === _personId && !selectedVisitedPlaceId ? ' hand-cursor-on-hover' : ''}`}
            key       = {visitedPlace._uuid}
            style     = {{left: startAtPercent.toString() + '%', width: width.toString() + '%'}}
            title     = {visitedPlaceDescription}
            onClick   = {props.interview.allWidgetsValid && person._uuid === _personId && !selectedVisitedPlaceId ? (e) => selectVisitedPlace(visitedPlace._uuid, e) : null}
          >
            <div className="survey-visited-places-schedule-visited-place-icon">
              <img src={`/dist/images/activities_icons/${visitedPlace.activity}_plain.svg`} style={{height: '2em'}} alt={visitedPlace.activity ? t(`survey:visitedPlace:activities:${visitedPlace.activity}`) : ''} />
              <p>
                <FontAwesomeIcon icon={faClock} style={{ marginRight: '0.3rem', marginLeft: '0.6rem'}} />
                {visitedPlace.arrivalTime && secondsSinceMidnightToTimeStr(visitedPlace.arrivalTime)}
                {visitedPlace.departureTime && <FontAwesomeIcon icon={faArrowRight} style={{ marginRight: '0.3rem', marginLeft: '0.3rem'}} />}
                {visitedPlace.departureTime && secondsSinceMidnightToTimeStr(visitedPlace.departureTime)}
              </p>
            </div>
          </div>
        );
        personVisitedPlacesSchedules.push(visitedPlaceSchedule);
        
      }
      if (atLeastOneCompletedVisitedPlace)
      {
        const personSchedule = (
          <div className="survey-visited-places-schedule-person-container" key={_personId}>
            {!isAlone && <p className={_personId === person._uuid ? ' _orange' : ''}>{t('survey:person:dayScheduleFor')} <span className="_strong">{_person.nickname}</span></p>}
            {isAlone  && <p className='_orange'>{t('survey:person:yourDaySchedule')}</p>}
            <div className="survey-visited-places-schedule-person">
              {personVisitedPlacesSchedules}
            </div>
          </div>
        );
        if (person._uuid === _personId)
        {
          activePersonSchedule = personSchedule;
        }
        else
        {
          widgetsSchedules.push(personSchedule);
        }
      }
    }
    if (activePersonSchedule)
    {
      widgetsSchedules.push(activePersonSchedule);
    }

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
                startNavigate={props.startNavigate}
            />
        );
    }

    // setup visited places:

    const visitedPlaces          = odSurveyHelper.getVisitedPlacesArray({ journey: currentJourney});
    const lastVisitedPlace       = visitedPlaces.length > 0 ? visitedPlaces[visitedPlaces.length - 1] : null;
    const visitedPlacesList      = [];

    for (let i = 0, count = visitedPlaces.length; i < count; i++)
    {
      const visitedPlace         = visitedPlaces[i] as any;
      const activity             = visitedPlace.activity;
      const visitedPlacePath     = `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${visitedPlace._uuid}`;
      const visitedPlaceItem     = (
        <li className={`no-bullet survey-visited-place-item${visitedPlace._uuid === selectedVisitedPlaceId ? ' survey-visited-place-item-selected' : ''}`} key={`survey-visited-place-item__${i}`}>
          <span className="survey-visited-place-item-element survey-visited-place-item-sequence-and-icon">
            {visitedPlace['_sequence']}. {activity && <img src={`/dist/images/activities_icons/${activity}_marker.svg`} style={{height: '4rem'}} alt={activity ? t(`survey:visitedPlace:activities:${activity}`) : ""} />}
          </span>
          <span className="survey-visited-place-item-element survey-visited-place-item-description text-box-ellipsis">
            <span className={visitedPlace._uuid === selectedVisitedPlaceId ? '_strong' : ''}>
              {activity && t(`survey:visitedPlace:activities:${activity}`)}
              {visitedPlace.name && <em>&nbsp;• {visitedPlace.name}</em>}
            </span>
          </span>
          
          {!selectedVisitedPlaceId && 
          <span className="survey-visited-place-item-element survey-visited-place-item-buttons">
            <FontAwesomeIcon icon={faClock} style={{ marginRight: '0.3rem', marginLeft: '0.6rem'}} />
            {visitedPlace.arrivalTime && secondsSinceMidnightToTimeStr(visitedPlace.arrivalTime)}
            {visitedPlace.departureTime && <FontAwesomeIcon icon={faArrowRight} style={{ marginRight: '0.3rem', marginLeft: '0.3rem'}} />}
            {visitedPlace.departureTime && secondsSinceMidnightToTimeStr(visitedPlace.departureTime)}
            {!selectedVisitedPlaceId/*state.editActivated*/ && props.loadingState === 0 && <button
              type      = "button"
              className = {`survey-section__button button blue small`}
              onClick   = {(e) => selectVisitedPlace(visitedPlace._uuid, e)}
              style     = {{marginLeft: '0.5rem'}}
              title     = {t('survey:visitedPlace:editVisitedPlace')}
            >
              <FontAwesomeIcon icon={faPencilAlt} className="" />
              {/*props.t('survey:visitedPlace:editVisitedPlace')*/}
            </button>}
            {!selectedVisitedPlaceId/*state.editActivated*/ && props.loadingState === 0 && visitedPlaces.length > 1 && <button
              type      = "button"
              className = {`survey-section__button button red small`}
              onClick   = {(e) => setConfirmDeleteVisitedPlace(visitedPlacePath)}
              title     = {t('survey:visitedPlace:deleteVisitedPlace')}
            >
              <FontAwesomeIcon icon={faTrashAlt} className="" />
              {/*props.t('survey:visitedPlace:deleteVisitedPlace')*/}
            </button>}
            { /* confirmPopup below: */ }
            { confirmDeleteVisitedPlace === visitedPlacePath
              && (<div>
                  <ConfirmModal 
                    isOpen        = {true}
                    closeModal    = {() => setConfirmDeleteVisitedPlace(null)}
                    text          = {surveyHelper.parseString(personVisitedPlacesConfig.deleteConfirmPopup.content[i18n.language] || personVisitedPlacesConfig.deleteConfirmPopup.content, props.interview, props.shortname)}
                    title         = {personVisitedPlacesConfig.deleteConfirmPopup.title && personVisitedPlacesConfig.deleteConfirmPopup.title[i18n.language] ? surveyHelper.parseString(personVisitedPlacesConfig.deleteConfirmPopup.title[i18n.language] || personVisitedPlacesConfig.deleteConfirmPopup.title, props.interview, props.shortname) : null}
                    cancelAction  = {null}
                    confirmAction = {() => deleteVisitedPlace(person, visitedPlacePath, visitedPlace, visitedPlaces)}
                    containsHtml  = {personVisitedPlacesConfig.deleteConfirmPopup.containsHtml}
                  />
                </div>)
            }
          </span>}
        </li>
      );

      visitedPlacesList.push(visitedPlaceItem);

      if (selectedVisitedPlaceId && visitedPlace._uuid === selectedVisitedPlaceId)
      {
        const parentObjectIds = {}
        parentObjectIds['personVisitedPlaces'] = visitedPlace._uuid;
        const selectedVisitedPlaceComponent = (
          <li className='no-bullet' style={{marginTop: "-0.4rem"}} key={`survey-visited-place-item-selected__${i}`}>
            <GroupedObject
              widgetConfig                 = {personVisitedPlacesConfig}
              shortname                   = 'personVisitedPlaces'
              path                        = {visitedPlacePath}
              loadingState                = {props.loadingState}
              objectId                    = {visitedPlace._uuid}
              parentObjectIds             = {parentObjectIds}
              key                         = {`survey-visited-place-item-selected-${visitedPlace._uuid}`}
              sequence                    = {visitedPlace['_sequence']}
              section                     = {'visitedPlaces'}
              interview                   = {props.interview}
              user                        = {props.user}
              errors                      = {props.errors}
              startUpdateInterview        = {props.startUpdateInterview}
              startAddGroupedObjects      = {props.startAddGroupedObjects}
              startRemoveGroupedObjects   = {props.startRemoveGroupedObjects}
              startNavigate = {props.startNavigate}
            />
          </li>
        );
        visitedPlacesList.push(selectedVisitedPlaceComponent);
      }

      if (
           !selectedVisitedPlaceId
        && props.loadingState === 0 
        && visitedPlaces.length > 1 
        && (lastVisitedPlace && lastVisitedPlace._uuid !== visitedPlace._uuid || (lastVisitedPlace._uuid === visitedPlace._uuid && visitedPlace.nextPlaceCategory === 'stayedThereUntilTheNextDay'))
      )
      {
        visitedPlacesList.push(
          <li 
            className="no-bullet survey-visited-place-insert"
            key={`survey-visited-place-item-insert-after__${i}`}
            style={{ marginTop: '-0.4em', marginLeft: '2rem', padding: 0}}
          >
            <button
              type      = "button"
              className = "button blue center small"
              onClick   = {(e) => addVisitedPlace(visitedPlace['_sequence'] + 1, `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`, e)}
              title     = {t('survey:visitedPlace:insertVisitedPlace')}
            >
              <FontAwesomeIcon icon={faPlusCircle} className="faIconLeft" />
              {t('survey:visitedPlace:insertVisitedPlace')}
            </button>
          </li>
        );
      }
    }
    return (
      <section className = {`survey-section survey-section-shortname-${props.shortname}`}>
        <div className="survey-section__content">
          {widgetsComponentsByShortname['activePersonTitle']}
          {widgetsComponentsByShortname['buttonSwitchPerson']}
          <div className="survey-visited-places-schedules">
            {widgetsSchedules}
          </div>
          <div className="survey-visited-places-list-and-map-container">
            <ul className={`survey-visited-places-list ${selectedVisitedPlaceId || visitedPlaces.length <= 1 ? 'full-width' : ''}`}>
              {widgetsComponentsByShortname['personVisitedPlacesTitle']}
              {visitedPlacesList}
              {!selectedVisitedPlaceId && (lastVisitedPlace && (lastVisitedPlace as any).nextPlaceCategory !== 'stayedThereUntilTheNextDay' || visitedPlaces.length === 1) && props.loadingState === 0 
              && <button
                type      = "button"
                className = "button blue center large"
                onClick   = {(e) => addVisitedPlace(-1, `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`, e)}
                title     = {t('survey:visitedPlace:addVisitedPlace')}
              >
                <FontAwesomeIcon icon={faPlusCircle} className="faIconLeft" />
                {t('survey:visitedPlace:addVisitedPlace')}
              </button>}
              <li className="no-bullet" key='survey-visited-places-list-last-visited-place-not-home-question'>{widgetsComponentsByShortname['personLastVisitedPlaceNotHome']}</li>
              {visitedPlaces.length > 1 && <li className="no-bullet" key='survey-visited-places-list-confirm-button'>
                {!selectedVisitedPlaceId && widgetsComponentsByShortname['buttonVisitedPlacesConfirmNextSection']}
              </li>}
            </ul>
            {!selectedVisitedPlaceId && visitedPlaces.length > 1 && <div className={`survey-visited-places-map`}>
              {widgetsComponentsByShortname['personVisitedPlacesMap']}
            </div>}
          </div>
        </div>
        { process.env.APP_NAME === 'survey' && props.user
        && (props.user.is_admin === true)
        && (<div className="center"><button
          type      = "button"
          className = "menu-button _oblique _red"
          key       = {`header__nav-reset`}
          onClick   = {function() { 
            const valuesByPath = {
              [`response.household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`]: {},
              [`validations.household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`]: {},
              [`response.household.persons.${person._uuid}.journeys.${currentJourney._uuid}.trips`]: {},
              [`validations.household.persons.${person._uuid}.journeys.${currentJourney._uuid}.trips`]: {},
              [`response._activeSection`]: 'tripsIntro'
            };
            props.startUpdateInterview({ sectionShortname: 'visitedPlaces', valuesByPath });
          }.bind(this)
        }>{t('survey:visitedPlace:resetVisitedPlaces')}</button></div>)}
      </section>
    );
};

export default VisitedPlacesSection;