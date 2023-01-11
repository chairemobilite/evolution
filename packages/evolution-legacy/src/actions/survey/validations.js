/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

export const checkValidations = function(validations, value, customValue, interview, path, customPath) {
  if (typeof validations === 'function')
  {
    try {
        const validationsGroup = validations(value, customValue, interview, path, customPath);
        for (let i = 0; i < validationsGroup.length; i++)
        {
          if (validationsGroup[i].validation === true)
          {
            return [false, validationsGroup[i].errorMessage];
          }
        }
      } catch (error) {
          // If there is an error during validations, just ignore the error and consider the value as valid to make sure we can at least get the next answers without blocking the questionnaire.
          // TODO: add a server-side log of the error and define a better way to deal with errors.
          console.log('validation error', error);
          return [true, null];
      }
  }
  return [true, null];
};

export const validateAllWidgets = function(interview) {
  return interview.allWidgetsValid;
  //let allWidgetsValid = true;
  //if (interview.widgets)
  //{
  //  for (let widgetPath in interview.widgets)
  //  {
  //    const widgetStatus = interview.widgets[widgetPath];
  //    if (widgetStatus.isVisible && !widgetStatus.isValid)
  //    {
  //      surveyHelper.devLog('invalid path: ', widgetPath);
  //      allWidgetsValid = false;
  //    }
  //  }
  //}
  //if (interview.groups)
  //{
  //  for (let groupShortname in interview.groups)
  //  {
  //    for (let groupedObjectId in interview.groups[groupShortname])
  //    {
  //      for (let widgetShortname in interview.groups[groupShortname][groupedObjectId])
  //      {
  //        const widgetStatus = interview.groups[groupShortname][groupedObjectId][widgetShortname];
  //        if (widgetStatus.isVisible && !widgetStatus.isValid)
  //        {
  //          surveyHelper.devLog('invalid widget in groupedObjectId ' + groupShortname + '.' + groupedObjectId + ':', widgetShortname);
  //          allWidgetsValid = false;
  //        }
  //      }
  //    }
  //  }
  //}
  //return allWidgetsValid;
};