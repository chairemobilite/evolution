/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React                    from 'react';
import _get                     from 'lodash/get';
import _cloneDeep from 'lodash/cloneDeep';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { withTranslation }      from 'react-i18next';
import { FontAwesomeIcon }      from '@fortawesome/react-fontawesome';
import { faTrashAlt }           from '@fortawesome/free-solid-svg-icons/faTrashAlt';
import { faArrowsAltV }         from '@fortawesome/free-solid-svg-icons/faArrowsAltV';
import { faPencilAlt }          from '@fortawesome/free-solid-svg-icons/faPencilAlt';
import { faPlusCircle }         from '@fortawesome/free-solid-svg-icons/faPlusCircle';
import { faClock }              from '@fortawesome/free-solid-svg-icons/faClock';
import { faArrowRight }         from '@fortawesome/free-solid-svg-icons/faArrowRight';
import { createBrowserHistory } from 'history';
//import HTMLEllipsis from 'react-lines-ellipsis/lib/html';
//import responsiveHOC from 'react-lines-ellipsis/lib/responsiveHOC';

//const ResponsiveEllipsis = responsiveHOC()(HTMLEllipsis);
// activities icons:
//import { faWork } from '@fortawesome/free-solid-svg-icons/faBriefcase';
//import { faMedical } from '@fortawesome/free-solid-svg-icons/faBriefcaseMedical';
//import { faMedical } from '@fortawesome/free-solid-svg-icons/faBriefcaseMedical';

import  { secondsSinceMidnightToTimeStr } from 'chaire-lib-common/lib/utils/DateTimeUtils';
import { withSurveyContext } from 'evolution-frontend/lib/components/hoc/WithSurveyContextHoc';
import sectionTemplate from 'evolution-legacy/lib/components/survey/SectionTemplateHOC';
import Text            from 'evolution-frontend/lib/components/survey/Text';
import InfoMap         from 'evolution-legacy/lib/components/survey/InfoMap';
import Button          from 'evolution-frontend/lib/components/survey/Button';
import Question        from 'evolution-frontend/lib/components/survey/Question';
import Group           from 'evolution-legacy/lib/components/survey/Group';
import GroupedObject   from 'evolution-legacy/lib/components/survey/GroupedObject';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import helper          from '../helper';
import ConfirmModal    from 'chaire-lib-frontend/lib/components/modal/ConfirmModal';
import LoadingPage     from 'evolution-legacy/lib/components/shared/LoadingPage';
import { getPathForSection } from 'evolution-frontend/lib/services/url';

export class VisitedPlacesSection extends React.Component<any, any> {

  constructor(props) {
    super(props);
    this.state = {
      preloaded: (typeof props.preload === 'function' ? false : true)
    };
    this.addVisitedPlace          = this.addVisitedPlace.bind(this);
    this.selectVisitedPlace       = this.selectVisitedPlace.bind(this);
    this.deleteVisitedPlace       = this.deleteVisitedPlace.bind(this);
    this.mergeVisitedPlace       = this.mergeVisitedPlace.bind(this);
  }

  addVisitedPlace(sequence, path, e) {
    if (e)
    {
      e.preventDefault();
    }
    this.props.startAddGroupedObjects(1, sequence, path, [], (function(interview) {
      const person             = helper.getPerson(interview);
      const visitedPlaces      = helper.getVisitedPlaces(person, true);
      const lastVisitedPlace   = visitedPlaces[visitedPlaces.length - 1];
      const updateValuesByPath = {};
      if (lastVisitedPlace && sequence === lastVisitedPlace._sequence) // we are inserting a new visited place at the end
      {
        const beforeLastVisitedPlace     = visitedPlaces[visitedPlaces.length - 2];
        const beforeLastVisitedPlacePath = `household.persons.${person._uuid}.visitedPlaces.${beforeLastVisitedPlace._uuid}`;
        updateValuesByPath[`responses.${beforeLastVisitedPlacePath}.nextPlaceCategory`] = null;
      }
      updateValuesByPath[`responses._activeVisitedPlaceId`] = helper.selectNextVisitedPlaceId(visitedPlaces);
      this.props.startUpdateInterview('visitedPlaces', updateValuesByPath);
    }).bind(this));
  }

  selectVisitedPlace(visitedPlaceUuid, e) {
    if (e)
    {
      e.preventDefault();
    }
    this.props.startUpdateInterview('visitedPlaces', {
      [`responses._activeVisitedPlaceId`]: visitedPlaceUuid
    });
  }
  
  deleteVisitedPlace(person, visitedPlacePath, visitedPlace, visitedPlaces, e = undefined) {
    if (e)
    {
      e.preventDefault();
    }
    helper.deleteVisitedPlace(visitedPlacePath, this.props.interview, this.props.startRemoveGroupedObjects, this.props.startUpdateInterview);
  }

  mergeVisitedPlace(person, visitedPlacePath, visitedPlace, visitedPlaces, e = undefined) {
    if (e)
    {
      e.preventDefault();
    }
    helper.mergeVisitedPlace(visitedPlacePath, this.props.interview, this.props.startRemoveGroupedObjects, this.props.startUpdateInterview);
  }

  componentDidMount() {
    if (typeof this.props.preload === 'function')
    {
      this.props.preload.call(this, this.props.interview, this.props.startUpdateInterview, this.props.startAddGroupedObjects, this.props.startRemoveGroupedObjects, function() {
        this.setState(() => ({
          preloaded: true
        }));
      }.bind(this));
    }
  }

  componentDidUpdate(prevProps) {
    if (!this.props.allWidgetsValid)
    {
      const scrollPosition = _get(document.getElementsByClassName('question-invalid'), '[0].offsetTop', null);
      if (scrollPosition && scrollPosition >= 0)
      {
        window.scrollTo(0,scrollPosition);
      }
    }
  }

  render() {
    if (!this.state.preloaded)
    {
      return <LoadingPage />;
    }
    const history = createBrowserHistory();

    const path = getPathForSection(history.location.pathname, this.props.shortname);
    if (path) {
        history.push(path);
    }

    surveyHelper.devLog('%c rendering section ' + this.props.shortname, 'background: rgba(0,0,255,0.1);')
    const widgetsComponentsByShortname = {};
    const groupConfig                  = this.props.groups['personVisitedPlaces'];
    const person                       = helper.getPerson(this.props.interview);
    const householdSize                = surveyHelper.getResponse(this.props.interview, 'household.size', null);
    const isAlone                      = householdSize === 1;

    // setup schedules:

    const widgetsSchedules         = [];
    const percentLengthOfOneSecond = 100.0 / (28 * 3600);
    const persons                  = helper.getPersons(this.props.interview);
    let   activePersonSchedule     = null;
    const selectedVisitedPlaceId = helper.getActiveVisitedPlaceId(this.props.interview);
    for (let _personId in persons)
    {
      const _person                         = persons[_personId];
      let   atLeastOneCompletedVisitedPlace = false;
      const visitedPlaces                   = helper.getVisitedPlaces(_person);
      const personVisitedPlacesSchedules    = [];
      for (let i = 0, count = visitedPlaces.length; i < count; i++)
      {
        const visitedPlace  = visitedPlaces[i];
        const visitedPlaceDescription = helper.getVisitedPlaceDescription(visitedPlace, true, false);
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
            onClick   = {this.props.interview.allWidgetsValid && person._uuid === _personId && !selectedVisitedPlaceId ? (e) => this.selectVisitedPlace(visitedPlace._uuid, e) : null}
          >
            <div className="survey-visited-places-schedule-visited-place-icon">
              <img src={`/dist/images/activities_icons/${visitedPlace.activity}_plain.svg`} style={{height: '2em'}} alt={visitedPlace.activity ? this.props.t(`survey:visitedPlace:activities:${visitedPlace.activity}`) : ''} />
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
            {!isAlone && <p className={_personId === person._uuid ? ' _orange' : ''}>{this.props.t('survey:person:dayScheduleFor')} <span className="_strong">{_person.nickname}</span></p>}
            {isAlone  && <p className='_orange'>{this.props.t('survey:person:yourDaySchedule')}</p>}
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

    for (let i = 0, count = this.props.widgets.length; i < count; i++)
    {
      const widgetShortname = this.props.widgets[i];
      const widgetStatus    = _get(this.props.interview, `widgets.${widgetShortname}`, {});
      const path            = surveyHelper.interpolatePath(this.props.interview, (this.props.surveyContext.widgets[widgetShortname].path || `${this.props.shortname}.${widgetShortname}`));
      const customPath      = this.props.surveyContext.widgets[widgetShortname].customPath ? surveyHelper.interpolatePath(this.props.interview, this.props.surveyContext.widgets[widgetShortname].customPath) : null;
      let   component;
      const defaultProps = {
        path                           : path,
        customPath                     : customPath,
        key                            : path,
        shortname                      : widgetShortname,
        loadingState                   : this.props.loadingState,
        widgetConfig                   : this.props.surveyContext.widgets[widgetShortname],
        widgetStatus                   : widgetStatus,
        section                        : this.props.shortname,
        interview                      : this.props.interview,
        user                           : this.props.user,
        openQuestionModal              : this.props.openQuestionModal,
        closeQuestionModal             : this.props.closeQuestionModal,
        openConfirmModal               : this.props.openConfirmModal,
        closeConfirmModal              : this.props.closeConfirmModal,
        confirmModalOpenedShortname    : this.props.confirmModalOpenedShortname,
        isInsideModal                  : this.props.isInsideModal,
        questionModalPath              : this.props.questionModalPath,
        startUpdateInterview           : this.props.startUpdateInterview,
        startAddGroupedObjects         : this.props.startAddGroupedObjects,
        startRemoveGroupedObjects      : this.props.startRemoveGroupedObjects
      };
      switch(this.props.surveyContext.widgets[widgetShortname].type)
      {
        case 'text':     component = <Text     {...defaultProps} />; break;
        case 'infoMap':  component = <InfoMap  {...defaultProps} />; break;
        case 'button':   component = <Button   {...defaultProps} />; break;
        case 'question': component = <Question {...defaultProps} />; break;
        case 'group':    component = <Group    {...defaultProps}
          groupConfig     = {this.props.groups[widgetShortname]}
          parentObjectIds = {{}}
        />;
      }
      widgetsComponentsByShortname[widgetShortname] = component;
    }

    // setup visited places:

    const visitedPlaces          = helper.getVisitedPlaces(person);
    const lastVisitedPlace       = helper.getLastVisitedPlace(visitedPlaces);
    const visitedPlacesList      = [];

    for (let i = 0, count = visitedPlaces.length; i < count; i++)
    {
      const visitedPlace         = visitedPlaces[i];
      const activity             = visitedPlace.activity;
      const visitedPlacePath     = `household.persons.${person._uuid}.visitedPlaces.${visitedPlace._uuid}`;
      const visitedPlaceItem     = (
        <li className={`no-bullet survey-visited-place-item${visitedPlace._uuid === selectedVisitedPlaceId ? ' survey-visited-place-item-selected' : ''}`} key={`survey-visited-place-item__${i}`}>
          <span className="survey-visited-place-item-element survey-visited-place-item-sequence-and-icon">
            {visitedPlace['_sequence']}. {activity && <img src={`/dist/images/activities_icons/${activity}_marker.svg`} style={{height: '4rem'}} alt={activity ? this.props.t(`survey:visitedPlace:activities:${activity}`) : ""} />}
          </span>
          <span className="survey-visited-place-item-element survey-visited-place-item-description text-box-ellipsis">
            <span className={visitedPlace._uuid === selectedVisitedPlaceId ? '_strong' : ''}>
              {activity && this.props.t(`survey:visitedPlace:activities:${activity}`)}
              {visitedPlace.name && <em>&nbsp;• {visitedPlace.name}</em>}
            </span>
          </span>
          
          {!selectedVisitedPlaceId && 
          <span className="survey-visited-place-item-element survey-visited-place-item-buttons">
            <FontAwesomeIcon icon={faClock} style={{ marginRight: '0.3rem', marginLeft: '0.6rem'}} />
            {visitedPlace.arrivalTime && secondsSinceMidnightToTimeStr(visitedPlace.arrivalTime)}
            {visitedPlace.departureTime && <FontAwesomeIcon icon={faArrowRight} style={{ marginRight: '0.3rem', marginLeft: '0.3rem'}} />}
            {visitedPlace.departureTime && secondsSinceMidnightToTimeStr(visitedPlace.departureTime)}
            {!selectedVisitedPlaceId/*this.state.editActivated*/ && this.props.loadingState === 0 && <button
              type      = "button"
              className = {`survey-section__button button blue small`}
              onClick   = {(e) => this.selectVisitedPlace(visitedPlace._uuid, e)}
              style     = {{marginLeft: '0.5rem'}}
              title     = {this.props.t('survey:visitedPlace:editVisitedPlace')}
            >
              <FontAwesomeIcon icon={faPencilAlt} className="" />
              {/*this.props.t('survey:visitedPlace:editVisitedPlace')*/}
            </button>}
            {!selectedVisitedPlaceId/*this.state.editActivated*/ && this.props.loadingState === 0 && visitedPlaces.length > 1 && <button
              type      = "button"
              className = {`survey-section__button button red small`}
              onClick   = {(e) => this.props.openConfirmModal(`_confirmDeleteButtonForGroupedObject__${visitedPlacePath}`, e)}
              title     = {this.props.t('survey:visitedPlace:deleteVisitedPlace')}
            >
              <FontAwesomeIcon icon={faTrashAlt} className="" />
              {/*this.props.t('survey:visitedPlace:deleteVisitedPlace')*/}
            </button>}
            {!selectedVisitedPlaceId/*this.state.editActivated*/ && visitedPlace['_sequence'] !== 1 && visitedPlace['_sequence'] !== visitedPlaces.length && visitedPlaces.length > 3 && this.props.user && this.props.user.is_admin === true && this.props.loadingState === 0 && visitedPlaces.length > 1 && <button
              type      = "button"
              className = {`survey-section__button button red small`}
              onClick   = {() => this.mergeVisitedPlace(person, visitedPlacePath, visitedPlace, visitedPlaces)}
              title     = {this.props.t('survey:visitedPlace:mergeVisitedPlace')}
            >
              <FontAwesomeIcon icon={faArrowsAltV} className="" />
            </button>}
            { /* confirmPopup below: */ }
            { this.props.confirmModalOpenedShortname === `_confirmDeleteButtonForGroupedObject__${visitedPlacePath}`
              && (<div>
                  <ConfirmModal 
                    isOpen        = {true}
                    closeModal    = {this.props.closeConfirmModal}
                    text          = {surveyHelper.parseString(groupConfig.deleteConfirmPopup.content[this.props.i18n.language] || groupConfig.deleteConfirmPopup.content, this.props.interview, this.props.path)}
                    title         = {groupConfig.deleteConfirmPopup.title && groupConfig.deleteConfirmPopup.title[this.props.i18n.language] ? surveyHelper.parseString(groupConfig.deleteConfirmPopup.title[this.props.i18n.language] || groupConfig.deleteConfirmPopup.title, this.props.interview, this.props.path) : null}
                    cancelAction  = {null}
                    confirmAction = {() => this.deleteVisitedPlace(person, visitedPlacePath, visitedPlace, visitedPlaces)}
                    containsHtml  = {groupConfig.deleteConfirmPopup.containsHtml}
                  />
                </div>)
            }
          </span>}
        </li>
      );

      visitedPlacesList.push(visitedPlaceItem);

      if (selectedVisitedPlaceId && visitedPlace._uuid === selectedVisitedPlaceId)
      {
        const parentObjectIds = _cloneDeep(this.props.parentObjectIds) || {};
        parentObjectIds['personVisitedPlaces'] = visitedPlace._uuid;
        const selectedVisitedPlaceComponent = (
          <li className='no-bullet' style={{marginTop: "-0.4rem"}} key={`survey-visited-place-item-selected__${i}`}>
            <GroupedObject
              groupConfig                 = {this.props.groups['personVisitedPlaces']}
              groupsConfig                = {this.props.groups}
              path                        = {visitedPlacePath}
              shortname                   = 'personVisitedPlaces'
              loadingState                = {this.props.loadingState}
              objectId                    = {visitedPlace._uuid}
              parentObjectIds             = {parentObjectIds}
              key                         = {`survey-visited-place-item-selected-${visitedPlace._uuid}`}
              sequence                    = {visitedPlace['_sequence']}
              section                     = {'visitedPlaces'}
              interview                   = {this.props.interview}
              user                        = {this.props.user}
              openConfirmModal            = {this.props.openConfirmModal}
              closeConfirmModal           = {this.props.closeConfirmModal}
              confirmModalOpenedShortname = {this.props.confirmModalOpenedShortname}
              startUpdateInterview        = {this.props.startUpdateInterview}
              startAddGroupedObjects      = {this.props.startAddGroupedObjects}
              startRemoveGroupedObjects   = {this.props.startRemoveGroupedObjects}
            />
          </li>
        );
        visitedPlacesList.push(selectedVisitedPlaceComponent);
      }

      if (
           !selectedVisitedPlaceId
        && this.props.loadingState === 0 
        && visitedPlaces.length > 1 
        && (lastVisitedPlace._uuid !== visitedPlace._uuid || (lastVisitedPlace._uuid === visitedPlace._uuid && visitedPlace.nextPlaceCategory === 'stayedThereUntilTheNextDay'))
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
              onClick   = {(e) => this.addVisitedPlace(visitedPlace['_sequence'] + 1, `household.persons.${person._uuid}.visitedPlaces`, e)}
              title     = {this.props.t('survey:visitedPlace:insertVisitedPlace')}
            >
              <FontAwesomeIcon icon={faPlusCircle} className="faIconLeft" />
              {this.props.t('survey:visitedPlace:insertVisitedPlace')}
            </button>
          </li>
        );
      }
    }
    return (
      <section className = {`survey-section survey-section-shortname-${this.props.shortname}`}>
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
              {!selectedVisitedPlaceId && (lastVisitedPlace && lastVisitedPlace.nextPlaceCategory !== 'stayedThereUntilTheNextDay' || visitedPlaces.length === 1) && this.props.loadingState === 0 
              && <button
                type      = "button"
                className = "button blue center large"
                onClick   = {(e) => this.addVisitedPlace(-1, `household.persons.${person._uuid}.visitedPlaces`, e)}
                title     = {this.props.t('survey:visitedPlace:addVisitedPlace')}
              >
                <FontAwesomeIcon icon={faPlusCircle} className="faIconLeft" />
                {this.props.t('survey:visitedPlace:addVisitedPlace')}
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
        { process.env.APP_NAME === 'survey' && this.props.user
        && (this.props.user.is_admin === true || this.props.user.is_test  === true)
        && (<div className="center"><button
          type      = "button"
          className = "menu-button _oblique _red"
          key       = {`header__nav-reset`}
          onClick   = {function() { 
            const valuesByPath = {
              [`responses.household.persons.${person._uuid}.visitedPlaces`]: {},
              [`validations.household.persons.${person._uuid}.visitedPlaces`]: {},
              [`responses.household.persons.${person._uuid}.trips`]: {},
              [`validations.household.persons.${person._uuid}.trips`]: {},
              [`responses._activeSection`]: 'tripsIntro'
            };
            this.props.startUpdateInterview('visitedPlaces', valuesByPath);
          }.bind(this)
        }>{this.props.t('survey:visitedPlace:resetVisitedPlaces')}</button></div>)}
      </section>
    );
  }
};

export default withTranslation()(sectionTemplate(withSurveyContext(VisitedPlacesSection)))