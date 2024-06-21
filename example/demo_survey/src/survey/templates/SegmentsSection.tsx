/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React                    from 'react';
import _cloneDeep from 'lodash/cloneDeep';
import _get                     from 'lodash/get';
import { withTranslation }      from 'react-i18next';
import { FontAwesomeIcon }      from '@fortawesome/react-fontawesome';
import { faPencilAlt }          from '@fortawesome/free-solid-svg-icons/faPencilAlt';
import { faClock }              from '@fortawesome/free-solid-svg-icons/faClock';
import { faArrowRight }         from '@fortawesome/free-solid-svg-icons/faArrowRight';
import { createBrowserHistory } from 'history';

//import HTMLEllipsis from 'react-lines-ellipsis/lib/html';
//import responsiveHOC from 'react-lines-ellipsis/lib/responsiveHOC';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import  { secondsSinceMidnightToTimeStr } from 'chaire-lib-common/lib/utils/DateTimeUtils';
import { withSurveyContext } from 'evolution-frontend/lib/components/hoc/WithSurveyContextHoc';
import sectionTemplate from 'evolution-legacy/lib/components/survey/SectionTemplateHOC';
import Text            from 'evolution-frontend/lib/components/survey/Text';
import InfoMap         from 'evolution-frontend/lib/components/survey/InfoMap';
import Button          from 'evolution-frontend/lib/components/survey/Button';
import Question        from 'evolution-frontend/lib/components/survey/Question';
import { Group, GroupedObject } from 'evolution-frontend/lib/components/survey/GroupWidgets';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import LoadingPage     from 'evolution-legacy/lib/components/shared/LoadingPage';
import helper          from '../helper';
import { getPathForSection } from 'evolution-frontend/lib/services/url';

//const ResponsiveEllipsis = responsiveHOC()(HTMLEllipsis);

export class SegmentsSection extends React.Component<any, any> {

  private iconPathsByMode: any;

  constructor(props) {
    super(props);
    this.state = {
      preloaded: (typeof props.preload === 'function' ? false : true)
    };
    this.selectTrip = this.selectTrip.bind(this);
    this.iconPathsByMode = this.getIconPathsByMode();
  }

  getIconPathsByMode() {
    const iconPathsByMode = {};
    const modes           = this.props.surveyContext.widgets['segmentMode'].choices;
    for (let i = 0, count = modes.length; i < count; i++)
    {
      const mode     = modes[i].value;
      const iconPath = modes[i].iconPath;
      iconPathsByMode[mode] = iconPath;
    }
    return iconPathsByMode;
  }

  selectTrip(tripUuid, e) {
    if (e)
    {
      e.preventDefault();
    }
    this.props.startUpdateInterview('segments', {
      [`responses._activeTripId`]: tripUuid
    });
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
    const personTripsConfig            = this.props.surveyContext.widgets['personTrips'];
    const person                       = helper.getPerson(this.props.interview);

    const trips      = helper.getTrips(person);
    const tripsList  = [];

    const visitedPlaces = person ? person.visitedPlaces || {} : {};
    const selectedTripId  = helper.getActiveTripId(this.props.interview);
    let   selectedTrip    = selectedTripId ? trips[selectedTripId] : null;

    //console.log('selectedTripId', selectedTripId);

    // setup widgets:

    for (let i = 0, count = this.props.widgets.length; i < count; i++)
    {
      const widgetShortname = this.props.widgets[i];
      const widgetConfig = this.props.surveyContext.widgets[widgetShortname];
      const widgetStatus    = _get(this.props.interview, `widgets.${widgetShortname}`, {});
      const path            = surveyHelper.interpolatePath(this.props.interview, (widgetConfig.path || `${this.props.shortname}.${widgetShortname}`));
      const customPath      = surveyHelper.interpolatePath(this.props.interview, widgetConfig.customPath);
      let   component;
      const defaultProps = {
        path                           : path,
        customPath                     : customPath,
        key                            : path,
        shortname                      : widgetShortname,
        loadingState                   : this.props.loadingState,
        widgetConfig                   : widgetConfig,
        widgetStatus                   : widgetStatus,
        section                        : this.props.shortname,
        interview                      : this.props.interview,
        user                           : this.props.user,
        startUpdateInterview           : this.props.startUpdateInterview,
        startAddGroupedObjects         : this.props.startAddGroupedObjects,
        startRemoveGroupedObjects      : this.props.startRemoveGroupedObjects
      };
      switch(widgetConfig.type)
      {
        case 'text':     component = <Text     {...defaultProps} />; break;
        case 'infoMap':  component = <InfoMap  {...defaultProps} />; break;
        case 'button':   component = <Button   {...defaultProps} />; break;
        case 'question': component = <Question {...defaultProps} />; break;
        case 'group':    component = <Group    {...defaultProps}
          parentObjectIds = {{}}
        />;
      }
      widgetsComponentsByShortname[widgetShortname] = component;
    }
    
    for (let i = 0, count = trips.length; i < count; i++)
    {
      const trip             = trips[i];
      const origin           = visitedPlaces[trip._originVisitedPlaceUuid];
      const destination      = visitedPlaces[trip._destinationVisitedPlaceUuid];
      const tripPath         = `household.persons.${person._uuid}.trips.${trip._uuid}`;
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
                <img src={this.iconPathsByMode[segment.mode]} style={{height: '1.5em', marginLeft: '0.3em'}} alt={this.props.t(`survey:trip:modes:${segment.mode}`)} />
              </React.Fragment>
            );
          }
        }
      }

      const tripItem         = (
        <li className={`no-bullet survey-trip-item survey-trip-item-name${trip._uuid === selectedTripId ? ' survey-trip-item-selected' : ''}`} key={`survey-trip-item__${i}`}>
          <span className="survey-trip-item-element survey-trip-item-sequence-and-icon">
            <em>{this.props.t('survey:trip:trip')} {trip['_sequence']}</em>
          </span>
          <span className="survey-trip-item-element survey-trip-item-buttons">
            <FontAwesomeIcon icon={faClock} style={{ marginRight: '0.3rem', marginLeft: '0.6rem'}} />
            {origin && origin.departureTime && secondsSinceMidnightToTimeStr(origin.departureTime)}
            <FontAwesomeIcon icon={faArrowRight} style={{ marginRight: '0.3rem', marginLeft: '0.3rem'}} />
            {destination && destination.arrivalTime && secondsSinceMidnightToTimeStr(destination.arrivalTime)}
            {!selectedTripId && this.props.loadingState === 0 && <button
              type      = "button"
              className = {`survey-section__button button blue small`}
              onClick   = {(e) => this.selectTrip(trip._uuid, e)}
              style     = {{marginLeft: '0.5rem'}}
              title     = {this.props.t('survey:trip:editTrip')}
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
              <img src={`/dist/images/activities_icons/${origin.activity}_marker.svg`} style={{height: '4rem'}} alt={this.props.t(`visitedPlaces/activities/${origin.activity}`)} />
              <span>
                {this.props.t(`survey:visitedPlace:activities:${origin.activity}`)}
                { origin.name && (<React.Fragment><br /><em>&nbsp;• {origin.name}</em></React.Fragment>) }
              </span>
            </span>
            <span className="survey-trip-item-element survey-trip-item-arrow">
              <FontAwesomeIcon icon={faArrowRight} style={{ marginRight: '0.3rem', marginLeft: '0.3rem'}} />
            </span>
            <span className="survey-trip-item-element survey-trip-item-destination-description">
              <img src={`/dist/images/activities_icons/${destination.activity}_marker.svg`} style={{height: '4rem'}} alt={this.props.t(`visitedPlaces/activities/${destination.activity}`)} />
              <span>
                {this.props.t(`survey:visitedPlace:activities:${destination.activity}`)}
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
        const parentObjectIds = _cloneDeep(this.props.parentObjectIds) || {};
        parentObjectIds['personTrips'] = trip._uuid;
        selectedTrip = (
          <li className="no-bullet" style={{marginTop: "-0.4rem"}} key={`survey-trip-item-selected__${i}`}>
            <GroupedObject
              widgetConfig                = {personTripsConfig}
              shortname                   = 'personTrips'
              path                        = {tripPath}
              loadingState                = {this.props.loadingState}
              objectId                    = {trip._uuid}
              parentObjectIds             = {parentObjectIds}
              key                         = {`survey-trip-item-selected-${trip._uuid}`}
              sequence                    = {trip['_sequence']}
              section                     = {'segments'}
              interview                   = {this.props.interview}
              user                        = {this.props.user}
              startUpdateInterview        = {this.props.startUpdateInterview}
              startAddGroupedObjects      = {this.props.startAddGroupedObjects}
              startRemoveGroupedObjects   = {this.props.startRemoveGroupedObjects}
            />
          </li>
        );
        tripsList.push(selectedTrip);
      }
    }
    return (
      <section className = {`survey-section survey-section-shortname-${this.props.shortname}`}>
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
  }
};

export default withTranslation()(sectionTemplate(withSurveyContext(SegmentsSection)))