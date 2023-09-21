/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import bowser     from 'bowser';
//import 'whatwg-fetch';
//import 'promise-polyfill/src/polyfill';
import _get       from 'lodash/get';
import _set       from 'lodash/set';
import _cloneDeep from 'lodash/cloneDeep';
import isEqual    from 'lodash/isEqual';
import _unset     from 'lodash/unset';

const fetchRetry = require('@zeit/fetch-retry')(require('node-fetch'));
// TODO Default options for retry are as high as 15 seconds, during which the
// user get no feedback. Since update requests are queued in that time, are
// sequential and it is not possible to empty the queue, the requests will try
// to execute for n*15 seconds, during which time the user may have refreshed
// the page and will not see that the updated values have been udpated. With 4
// retries, the user will get feedback within 3 seconds and the queue will empty
// much faster, reducing the risk of invisible updates. The risk is still
// present if the server is quickly back online and the user is fast enough. See
// https://github.com/chairemobilite/transition/issues/1266
const fetch = async (url, opts) => {
    return await fetchRetry(url, Object.assign({ retry: { retries: 4 }, ...opts }));
}

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
// TODO This is not a react widget, so can't use the context here, or can we? TBD
import applicationConfiguration from 'evolution-frontend/lib/config/application.config';
import surveyHelper                                     from '../../helpers/survey/survey';
import * as surveyHelperNew                             from 'evolution-common/lib/utils/helpers';
import { incrementLoadingState, decrementLoadingState } from '../shared/loadingState.js';
import config                                           from 'chaire-lib-common/lib/config/shared/project.config';
import { updateSection as updateSectionTs, startUpdateInterview as startUpdateInterviewTs, updateInterview as updateInterviewTs } from 'evolution-frontend/lib/actions/Survey';

//export const setInterview = (interview) => ({
//  type: 'SET_INTERVIEW',
//  interviewLoaded: true,
//  interview
//});

// called whenever an update occurs in interview responses or when section is switched to
export const updateSection = updateSectionTs;
export const startUpdateInterview = startUpdateInterviewTs;
export const updateInterview = updateInterviewTs;

/**
 * Fetch an interview from server and set it for edition in validation mode.
 * 
 * @param {*} interviewUuid The uuid of the interview to open
 * @param {*} callback 
 * @returns 
 */
export const startSetSurveyValidateInterview = (interviewUuid, callback = function() {}) => {
  return (dispatch, getState) => {
    return fetch(`/api/survey/validateInterview/${interviewUuid}`, {
      credentials: 'include'
    })
    .then((response) => {

      if (response.status === 200) {
        response.json().then((body) => {
          if (body.interview)
          {
            const interview = body.interview;
            dispatch(startUpdateSurveyValidateInterview('home', {}, null, interview, callback));

          }
        });
      }
    })
    .catch((err) => {
      surveyHelperNew.devLog('Error fetching interview to validate.', err);
    });
  };
};

/**
 * Fetch an interview from server and set it for display in a one page summary.
 * 
 * TODO Only the section ('home', 'validationOnePager') is different from 'startSetSurveyValidateInterview' Re-use
 * 
 * @param {*} interviewUuid The uuid of the interview to open
 * @param {*} callback 
 * @returns 
 */
export const startSetValidateInterview = (interviewUuid, callback = function() {}) => {
  return (dispatch, getState) => {
    return fetch(`/api/survey/validateInterview/${interviewUuid}`, {
      credentials: 'include'
    })
    .then((response) => {

      if (response.status === 200) {
        response.json().then((body) => {
          if (body.interview)
          {
            const interview = body.interview;
            dispatch(startUpdateValidateInterview('validationOnePager', {}, null, interview, callback));

          }
        });
      }
    })
    .catch((err) => {
      surveyHelperNew.devLog('Error fetching interview to validate.', err);
    });
  };
};

/**
 * Fetch an interview from server and re-initialize the validated_data to the
 * participant's responses, but keeping the validation comments.
 *
 * @param {*} interviewUuid The uuid of the interview to open
 * @param {*} callback 
 * @returns 
 */
export const startResetValidateInterview = (interviewUuid, callback = function() {}) => {
  return (dispatch, getState) => {
    return fetch(`/api/survey/validateInterview/${interviewUuid}?reset=true`, {
      credentials: 'include'
    })
    .then((response) => {

      if (response.status === 200) {
        response.json().then((body) => {
          if (body.interview)
          {
            const interview     = body.interview;
            dispatch(startUpdateValidateInterview('validationOnePager', {}, null, interview, callback));
          }
        });
      }
    })
    .catch((err) => {
      surveyHelperNew.devLog('Error fetching interview to reset.', err);
    });
  };
};

export const startSetInterview = (activeSection = null, surveyUuid = undefined, history = undefined, preFilledResponses = undefined) => {

  return (dispatch, getState) => {
    const browserTechData = bowser.getParser(window.navigator.userAgent).parse();
    return fetch(`/api/survey/activeInterview/${surveyUuid ? `${encodeURI(surveyUuid)}` : ''}`, {
      credentials: 'include'
    })
    .then((response) => {
      if (response.status === 200) {
        response.json().then((body) => {
          if (body.interview)
          {
            let interview = body.interview;
            if (!activeSection)
            {
              for (let sectionShortname in applicationConfiguration.sections)
              {
                if (config.isPartTwo === true)
                {
                  if (applicationConfiguration.sections[sectionShortname].isPartTwoFirstSection === true)
                  {
                    activeSection = sectionShortname;
                    break;
                  }
                }
                else
                {
                  if (applicationConfiguration.sections[sectionShortname].previousSection === null)
                  {
                    activeSection = sectionShortname;
                    break;
                  }
                }
              }
            }
            const valuesByPath = {
              'responses._activeSection': activeSection
            };
            if (preFilledResponses) {
                Object.keys(preFilledResponses).forEach((key) => {
                    valuesByPath[`responses.${key}`] = preFilledResponses[key];
                })
            }
            // update browser data if different:
            const existingBrowserUa = _get(interview, 'responses._browser._ua', null);
            const newBrowserUa      = browserTechData._ua
            if (existingBrowserUa !== newBrowserUa)
            {
              valuesByPath['responses._browser'] = browserTechData;
            }
            dispatch(startUpdateInterview(activeSection, valuesByPath, null, interview));
          }
          else
          {
            dispatch(startCreateInterview(preFilledResponses));
          }
        });
      } else {
        console.log(`Get active interview: wrong responses status: ${response.status}`);
        if (history && response.status === 401)  {
          history.push('/unauthorized');
        }
      }
    })
    .catch((err) => {
      surveyHelperNew.devLog('Error fetching interview.', err);
    });
  };
};

export const startCreateInterview = (preFilledResponses = undefined) => {
  const browserTechData = bowser.getParser(window.navigator.userAgent).parse();
  return (dispatch, getState) => {
    return fetch('/api/survey/createInterview', {
      credentials: 'include'
    })
    .then((response) => {
      if (response.status === 200) {
        response.json().then((body) => {
          if (body.interview)
          {
            let activeSection = null;
            if (applicationConfiguration.sections['registrationCompleted'])
            {
              activeSection = 'registrationCompleted';
            }
            else
            {
              for (let sectionShortname in applicationConfiguration.sections)
              {
                if (applicationConfiguration.sections[sectionShortname].previousSection === null)
                {
                  activeSection = sectionShortname;
                  break;
                }
              }
            }
            const responses = {
              'responses._activeSection': activeSection,
              'responses._browser'      : browserTechData
            };
            if (preFilledResponses) {
                Object.keys(preFilledResponses).forEach((key) => {
                    responses[`responses.${key}`] = preFilledResponses[key];
                })
            }
            dispatch(startUpdateInterview(activeSection, responses, null, body.interview));
          }
          else
          {
            // we need to do something if no interview is returned (error)
          }
        });
      }
    })
    .catch((err) => {
      surveyHelperNew.devLog('Error creating interview.', err);
    });
  };
};

export const startUpdateSurveyValidateInterview = function(sectionShortname, valuesByPath = null, unsetPaths = null, interview = null, callback) {
  return {
    queue: 'UPDATE_INTERVIEW',
    callback: async function(next, dispatch, getState) {
      //surveyHelperNew.devLog(`Update interview and section with values by path`, valuesByPath);
      try {
        if (interview === null)
        {
          interview = _cloneDeep(getState().survey.interview);
        }

        //interview.sectionLoaded = null;

        dispatch(incrementLoadingState());

        if (valuesByPath && Object.keys(valuesByPath).length > 0)
        {
          surveyHelperNew.devLog(`Update interview and section with values by path`, JSON.parse(JSON.stringify(valuesByPath)));
        }

        //const oldInterview = _cloneDeep(interview);
        //const previousSection = surveyHelperNew.getResponse(interview, '_activeSection', null);

        const affectedPaths = {};

        if (Array.isArray(unsetPaths)) // unsetPaths if array (each path in array has to be deleted)
        {
          for (let i = 0, count = unsetPaths.length; i < count; i++)
          {
            const path          = unsetPaths[i];
            affectedPaths[path] = true;
            _unset(interview, path);
          }
        }
        else
        {
          unsetPaths = [];
        }

        // update language if needed:
        //const oldLanguage    = _get(interview, 'responses._language', null);
        //const actualLanguage = null;//i18n.language;
        //if (oldLanguage !== actualLanguage)
        //{
        //   valuesByPath['responses._language'] = actualLanguage;
        //}

        if (valuesByPath)
        {
          if (valuesByPath['_all'] === true)
          {
            affectedPaths['_all'] = true;
          }
          for (const path in valuesByPath)
          {
            affectedPaths[path] = true;
            _set(interview, path, valuesByPath[path]);
          }
        }

        sectionShortname = surveyHelperNew.getResponse(interview, '_activeSection', sectionShortname);
        //if (sectionShortname !== previousSection) // need to update all widgets if new section
        //{
        //  affectedPaths['_all'] = true;
        //}
        const updatedInterviewAndValuesByPath = updateSection(sectionShortname, interview, affectedPaths, valuesByPath);
        interview    = updatedInterviewAndValuesByPath[0];
        valuesByPath = updatedInterviewAndValuesByPath[1];

        if (!interview.sectionLoaded || interview.sectionLoaded !== sectionShortname)
        {
          valuesByPath['sectionLoaded'] = sectionShortname;
          interview.sectionLoaded = sectionShortname;
        }

        // convert undefined values to unset (delete) because stringify will remove undefined values:
        for (const path in valuesByPath)
        {
          if (valuesByPath[path] === undefined)
          {
            unsetPaths.push(path);
          }
        }

        if (isEqual(valuesByPath, {'_all': true}) && _isBlank(unsetPaths))
        {
          dispatch(updateInterview(_cloneDeep(interview)));
          dispatch(decrementLoadingState());
          if (typeof callback === 'function')
          {
            callback(interview);
          }
          return null;
        }

        //const differences = surveyHelper.differences(interview.responses, oldInterview.responses);
        const response = await fetch(`/api/survey/updateValidateInterview/${interview.uuid}`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          method: "POST",
          body: JSON.stringify({
            id          : interview.id,
            participant_id     : interview.participant_id,
            valuesByPath: valuesByPath,
            unsetPaths  : unsetPaths,
            //responses  : interview.responses,
            //validations: interview.validations
          })
        });
        if (response.status === 200) {
          const body = await response.json();
          if (body.status == 'success' && body.interviewId == interview.uuid)
          {
            //surveyHelperNew.devLog('Interview saved to db');
            //setTimeout(function() {
              dispatch(updateInterview(_cloneDeep(interview)));
              if (typeof callback === 'function')
              {
                callback(interview);
              }
            //}, 500, 'That was really slow!');
          }
          else
          {
            // we need to do something if no interview is returned (error)
          }
        }
        // Loading state needs to be decremented, no matter the return value, otherwise the page won't get updated
        dispatch(decrementLoadingState());
      } catch(error) {
        console.log('Error updating interview', error);
        // Loading state needs to be decremented, no matter the return value, otherwise the page won't get updated
        // TODO Put in the finally block if we are sure there are no side effect in the code path that returns before the fetch
        dispatch(decrementLoadingState());
      } finally {
        next();
      }
    }
  };
};

export const startUpdateValidateInterview = function(sectionShortname, valuesByPath = null, unsetPaths = null, interview = null, callback) {
  return {
    queue: 'UPDATE_INTERVIEW',
    callback: async function(next, dispatch, getState) {
      try {
        if (interview === null)
        {
          interview = _cloneDeep(getState().survey.interview);
        }

        dispatch(incrementLoadingState());

        if (valuesByPath && Object.keys(valuesByPath).length > 0)
        {
          surveyHelperNew.devLog(`Update interview and section with values by path`, JSON.parse(JSON.stringify(valuesByPath)));
        }

        const affectedPaths = {};

        if (Array.isArray(unsetPaths)) // unsetPaths if array (each path in array has to be deleted)
        {
          for (let i = 0, count = unsetPaths.length; i < count; i++)
          {
            const path          = unsetPaths[i];
            affectedPaths[path] = true;
            _unset(interview, path);
          }
        }
        else
        {
          unsetPaths = [];
        }

        if (valuesByPath)
        {
          if (valuesByPath['_all'] === true)
          {
            affectedPaths['_all'] = true;
          }
          for (const path in valuesByPath)
          {
            affectedPaths[path] = true;
            _set(interview, path, valuesByPath[path]);
          }
        }

        sectionShortname = 'validationOnePager';
        const updatedInterviewAndValuesByPath = updateSection(sectionShortname, interview, affectedPaths, valuesByPath);
        interview    = updatedInterviewAndValuesByPath[0];
        valuesByPath = updatedInterviewAndValuesByPath[1];

        if (!interview.sectionLoaded || interview.sectionLoaded !== sectionShortname)
        {
          interview.sectionLoaded = sectionShortname;
        }

        // convert undefined values to unset (delete) because stringify will remove undefined values:
        for (const path in valuesByPath)
        {
          if (valuesByPath[path] === undefined)
          {
            unsetPaths.push(path);
          }
        }

        if (isEqual(valuesByPath, {'_all': true}) && _isBlank(unsetPaths))
        {
          dispatch(updateInterview(_cloneDeep(interview)));
          dispatch(decrementLoadingState());
          if (typeof callback === 'function')
          {
            callback(interview);
          }
          return null;
        }
        const response = await fetch(`/api/survey/updateValidateInterview/${interview.uuid}`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          method: "POST",
          body: JSON.stringify({
            id          : interview.id,
            participant_id: interview.participant_id,
            valuesByPath: valuesByPath,
            unsetPaths  : unsetPaths,
          })
        })

        if (response.status === 200) {
          const body = await response.json();
          if (body.status === 'success' && body.interviewId === interview.uuid)
          {
            //surveyHelperNew.devLog('Interview saved to db');
            //setTimeout(function() {
              dispatch(updateInterview(_cloneDeep(interview)));
              dispatch(decrementLoadingState());
              if (typeof callback === 'function')
              {
                callback(interview);
              }
            //}, 500, 'That was really slow!');
          }
          else
          {
            dispatch(decrementLoadingState());
            // we need to do something if no interview is returned (error)
          }
        }
      } catch(error) {
        console.log('Error updating interview', error);
      } finally {
        next();
      }
    }

  };
};

export const startAddGroupedObjects = (newObjectsCount, insertSequence, path, attributes = [], callback, returnOnly = false) => {
  surveyHelperNew.devLog(`Add ${newObjectsCount} grouped objects for path ${path} at sequence ${insertSequence}`);
  return (dispatch, getState) => {
    const interview           = _cloneDeep(getState().survey.interview); // needed because we cannot mutate state
    const changedValuesByPath = surveyHelper.addGroupedObjects(interview, newObjectsCount, insertSequence, path, attributes || []);
    if (returnOnly)
    {
      return changedValuesByPath;
    }
    else
    {
      dispatch(startUpdateInterview(null, changedValuesByPath, null, null, callback));
    }
  };
};

export const startRemoveGroupedObjects = function(paths, callback, returnOnly = false) {
  surveyHelperNew.devLog(`Remove grouped objects at paths`, paths);
  return (dispatch, getState) => {
    const interview    = _cloneDeep(getState().survey.interview); // needed because we cannot mutate state
    let   unsetPaths   = [];
    let   valuesByPath = {};
    [valuesByPath, unsetPaths] = surveyHelper.removeGroupedObjects(paths, interview);
    if (returnOnly)
    {
      return [valuesByPath, unsetPaths];
    }
    else
    {
      dispatch(startUpdateInterview(null, valuesByPath, unsetPaths, null, callback));
    }
  };
};

export const startValidateAddGroupedObjects = (newObjectsCount, insertSequence, path, attributes = [], callback, returnOnly = false) => {
  surveyHelperNew.devLog(`Add ${newObjectsCount} grouped objects for path ${path} at sequence ${insertSequence}`);
  return (dispatch, getState) => {
    const interview           = _cloneDeep(getState().survey.interview); // needed because we cannot mutate state
    const changedValuesByPath = surveyHelper.addGroupedObjects(interview, newObjectsCount, insertSequence, path, attributes || []);
    if (returnOnly)
    {
      return changedValuesByPath;
    }
    else
    {
      dispatch(startUpdateValidateInterview(null, changedValuesByPath, null, null, callback));
    }
  };
};

export const startSurveyValidateRemoveGroupedObjects = function(paths, callback, returnOnly = false) {
  surveyHelperNew.devLog(`Remove grouped objects at paths`, paths);
  return (dispatch, getState) => {
    const interview    = _cloneDeep(getState().survey.interview); // needed because we cannot mutate state
    let   unsetPaths   = [];
    let   valuesByPath = {};
    [valuesByPath, unsetPaths] = surveyHelper.removeGroupedObjects(paths, interview);
    if (returnOnly)
    {
      return [valuesByPath, unsetPaths];
    }
    else
    {
      dispatch(startUpdateSurveyValidateInterview(null, valuesByPath, unsetPaths, null, callback));
    }
  };
};

export const startSurveyValidateAddGroupedObjects = (newObjectsCount, insertSequence, path, attributes = [], callback, returnOnly = false) => {
  surveyHelperNew.devLog(`Add ${newObjectsCount} grouped objects for path ${path} at sequence ${insertSequence}`);
  return (dispatch, getState) => {
    const interview           = _cloneDeep(getState().survey.interview); // needed because we cannot mutate state
    const changedValuesByPath = surveyHelper.addGroupedObjects(interview, newObjectsCount, insertSequence, path, attributes || []);
    if (returnOnly)
    {
      return changedValuesByPath;
    }
    else
    {
      dispatch(startUpdateSurveyValidateInterview(null, changedValuesByPath, null, null, callback));
    }
  };
};

export const startValidateRemoveGroupedObjects = function(paths, callback, returnOnly = false) {
  surveyHelperNew.devLog(`Remove grouped objects at paths`, paths);
  return (dispatch, getState) => {
    const interview    = _cloneDeep(getState().survey.interview); // needed because we cannot mutate state
    let   unsetPaths   = [];
    let   valuesByPath = {};
    [valuesByPath, unsetPaths] = surveyHelper.removeGroupedObjects(paths, interview);
    if (returnOnly)
    {
      return [valuesByPath, unsetPaths];
    }
    else
    {
      dispatch(startUpdateValidateInterview(null, valuesByPath, unsetPaths, null, callback));
    }
  };
};


