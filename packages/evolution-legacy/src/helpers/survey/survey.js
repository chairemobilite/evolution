/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import _get from 'lodash/get';
import sortBy from 'lodash/sortBy';

import sharedHelper from '../shared/shared';
import * as Helpers from 'evolution-common/lib/utils/helpers';
import * as LE from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as DateTimeUtils from 'chaire-lib-common/lib/utils/DateTimeUtils';

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

  

  addGroupedObjects: function(interview, newObjectsCount, insertSequence, path, attributes = [])
  {
    const changedValuesByPath = {};
    const groupedObjects      = _get(interview.responses, path, {});
    const groupedObjectsArray = sortBy(Object.values(groupedObjects),['_sequence']);
    if (LE._isBlank(insertSequence) || insertSequence === -1)
    {
      insertSequence = groupedObjectsArray.length + 1;
    }
    else {
      // increment sequences of groupedObjects after the insertSequence:
      for(let seq = insertSequence, count = groupedObjectsArray.length; seq <= count; seq++)
      {
        const groupedObject = groupedObjectsArray[seq - 1];
        changedValuesByPath[`responses.${path}.${groupedObject._uuid}._sequence`] = seq + newObjectsCount;
      }
    }
    for (let i = 0; i < newObjectsCount; i++)
    {
      const uniqueId            = uuidV4();
      const newSequence         = insertSequence + i;
      const newObjectAttributes = attributes[i] ? attributes[i] : {};
      changedValuesByPath[`responses.${path}.${uniqueId}`] = {'_sequence': newSequence, '_uuid': uniqueId, ...newObjectAttributes};
      changedValuesByPath[`responses.${path}.${uniqueId}`] = {'_sequence': newSequence, '_uuid': uniqueId, ...newObjectAttributes};
      changedValuesByPath[`validations.${path}.${uniqueId}`] = {};
    }
    return changedValuesByPath;
  },

  removeGroupedObjects: function(paths, interview)
  {
    // allow single path:
    if (!Array.isArray(paths))
    {
      paths = [paths];
    }

    if (paths.length === 0) {
        return [{}, []];
    }

    const unsetPaths   = [];
    const valuesByPath = {};
    let pathRemovedCount = 0;

    const groupedObjects        = Helpers.getResponse(interview, paths[0], {}, '../');
    const groupedObjectsArray   = sortBy(Object.values(groupedObjects),['_sequence']);

    for (let i = 0, count = groupedObjectsArray.length; i < count; i++) {
        const groupedObject = groupedObjectsArray[i];
        const groupedObjectPath = Helpers.getPath(paths[0], `../${groupedObject._uuid}`);
        if (paths.includes(groupedObjectPath)) {
            unsetPaths.push(`responses.${groupedObjectPath}`);
            unsetPaths.push(`validations.${groupedObjectPath}`);
            pathRemovedCount++;
        } else {
            if (pathRemovedCount > 0) {
                valuesByPath['responses.' + groupedObjectPath + '._sequence'] = groupedObject._sequence - pathRemovedCount;
            }
        }
    }
    return [valuesByPath, unsetPaths];
  },

  validateButtonAction: function(section, sections, saveCallback) {
    this.props.startUpdateInterview(section, { '_all': true }, null, null, function(interview) {
      if (interview.allWidgetsValid)
      {
        if (typeof saveCallback === 'function')
        {
          saveCallback();
        }
        else // go to next section
        {
          window.scrollTo(0, 0);
          this.props.startUpdateInterview(section, {
            'responses._activeSection': sections[section].nextSection
          });
        }
      }
      else
      {
        //this.props.startUpdateInterview(section, { '_all': true }, null, null, null);
      }
    }.bind(this));

    
  },

  validateButtonActionWithCompleteSection: function(section, sections, saveCallback) {
    this.props.startUpdateInterview(section, { '_all': true }, null, null, function(interview) {
      if (interview.allWidgetsValid)
      {
        if (typeof saveCallback === 'function')
        {
          saveCallback();
        }
        else // go to next section
        {
          window.scrollTo(0, 0);
          this.props.startUpdateInterview(section, {
            'responses._activeSection': sections[section].nextSection,
            [`responses._sections.${section}._isCompleted`]: true
          });
        }
      }
      else
      {
        //this.props.startUpdateInterview(section, { '_all': true }, null, null, null);
      }
    }.bind(this));

    
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