/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _get from 'lodash/get';

import sharedHelper from '../shared/shared';
import * as Helpers from 'evolution-common/lib/utils/helpers';
import * as LE from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as DateTimeUtils from 'chaire-lib-common/lib/utils/DateTimeUtils';
import { getPerson } from 'evolution-common/lib/services/odSurvey/helpers';
import { validateButtonAction } from 'evolution-frontend/lib/services/display/frontendHelper';

export default {
  
  /**
   * @deprecated Use the LodashExtension function directly
   */
  isBlank                      : LE._isBlank,
  /**
   * @deprecated Use the LodashExtension function directly
   */
  chunkify                     : LE._chunkify,
  /**
   * @deprecated This does not seem used
   */
  differences                  : sharedHelper.differences,
  /**
   * @deprecated Use the evolution-common/lib/utils/helpers function directly
   */
  getPath                      : Helpers.getPath,
  /**
   * @deprecated Use the evolution-common/lib/utils/helpers function directly
   */
  devLog                       : Helpers.devLog,
  /**
   * @deprecated Use the evolution-common/lib/utils/helpers function directly
   */
  parseValue                   : Helpers.parseValue,
  /**
   * @deprecated Use the DateTimeUtils function directly
   */
  secondsSinceMidnightToTimeStr: DateTimeUtils.secondsSinceMidnightToTimeStr,
  /**
   * @deprecated Use the DateTimeUtils function directly
   */
  timeStrToSecondsSinceMidnight: DateTimeUtils.timeStrToSecondsSinceMidnight, 
  /**
   * @deprecated Use the evolution-common/lib/utils/helpers.getResponse function directly
   */
  get                          : Helpers.getResponse,
  /**
   * @deprecated Use the evolution-common/lib/utils/helpers.setResponse function directly
   */
  set                          : Helpers.setResponse,
  /**
   * @deprecated Use the evolution-common/lib/utils/helpers.getValidation function directly
   */
  getValidations: Helpers.getValidation,
  
  /**
   * @deprecated This does not seem used. DO NOT CALL, or open an issue to support it again
   */
  getRoot: function(interview, path, defaultValue = undefined) {
    return _get(interview, path, defaultValue);
  },

  /**
   * @deprecated Use the evolution-common/lib/utils/helpers.getValidation function directly
   */
  formatGeocodingQueryStringFromMultipleFields: Helpers.formatGeocodingQueryStringFromMultipleFields,

  // verify if value is a function. If it is, parse the value with the function, otherwise, return the string
  parseString: Helpers.parseString,

  parse: Helpers.parse,

  parseBoolean: Helpers.parseBoolean,

  parseInteger: Helpers.parseInteger,

  generateCurvedGooglePolyline: function(google, firstPoint /* google.maps.latLng */, lastPoint /* google.maps.latLng */, angle) {
    if(google.maps.geometry.spherical !== undefined)
    {
      var polylineCurvedPoints = [];
      var resolution           = 0.01;
      var distance             = google.maps.geometry.spherical.computeDistanceBetween(firstPoint, lastPoint);
      var heading              = google.maps.geometry.spherical.computeHeading(firstPoint, lastPoint);
      if(angle === undefined)
      {
        angle = 15.0;
      }
      var startingCurvedHeading = -angle + angle * (distance / 10000000);
      var nextPoint             = firstPoint;
      for(var point = 0; point < 0.500001; point += resolution)
      {
        polylineCurvedPoints.push(google.maps.geometry.spherical.computeOffset(nextPoint, distance * point * 2, heading + startingCurvedHeading * (2 * (0.5 - point))));
      }
      return polylineCurvedPoints;
    }
    return null;
  },

  interpolatePath: Helpers.interpolatePath,

  addGroupedObjects: Helpers.addGroupedObjects,

  removeGroupedObjects: Helpers.removeGroupedObjects,

  validateButtonAction: validateButtonAction,

  validateButtonActionWithCompleteSection: function(callbacks, _interview, path, section, sections, saveCallback) {
    callbacks.startUpdateInterview(section, { '_all': true }, null, null, (interview) => {
      if (interview.allWidgetsValid)
      {
        if (typeof saveCallback === 'function')
        {
          saveCallback(callbacks, interview, path);
        }
        else // go to next section
        {
          window.scrollTo(0, 0);
          callbacks.startUpdateInterview(section, {
            'responses._activeSection': sections[section].nextSection,
            [`responses._sections.${section}._isCompleted`]: true
          });
        }
      }
      else
      {
        //this.props.startUpdateInterview(section, { '_all': true }, null, null, null);
      }
    });
  },

  // FIXME: All validateButtonAction* functions have common code. Refactor them to avoid duplication (when moving to typescript)
  validateButtonActionWithCompletePerPersonSection: function(callbacks, _interview, path, section, sections, saveCallback) {
    callbacks.startUpdateInterview(section, { '_all': true }, null, null, (interview) => {
      if (interview.allWidgetsValid)
      {
        if (typeof saveCallback === 'function')
        {
          saveCallback(callbacks, interview, path);
        }
        else // go to next section and save completion for person
        {
          window.scrollTo(0, 0);
          const updatedContent = {
            'responses._activeSection': sections[section].nextSection,
          }
          const person = getPerson({interview});
          if (person) {
            updatedContent[`responses.household.persons.${person._uuid}._completedSections.${section}`] = true;
          }
          callbacks.startUpdateInterview(section, updatedContent);
        }
      }
    });
  },

  getWidgetFromPath(path)
  {
    // not yet implemented
    return null;
  },

  getWidgetChoiceFromValue(widget, value, interview)
  {
    let choices = widget.choices;
    if (typeof choices === 'function')
    {
      choices = choices(interview); // we should also get path for some questions, but ignoring for now...
    }
    if (!choices)
    {
      return null;
    }
    return choices.find(function(choice) {
      return choice.value === value;
    });
  }


};