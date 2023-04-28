/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const knex           = require('chaire-lib-backend/lib/config/shared/db.config').default;
const moment         = require('moment-timezone');
const fs             = require('fs');
const chalk          = require('chalk');
const isObject       = require('lodash.isobject');
const isEmpty        = require('lodash.isempty');
const _mean          = require('lodash.mean');
const _get           = require('lodash.get');
const { directoryManager } = require('chaire-lib-backend/lib/utils/filesystem/directoryManager');

import router from 'chaire-lib-backend/lib/api/admin.routes';

const config         = require('../../config/shared/project.config');
const helper         = require('../../helpers/server');

router.get('/cache/get/:cache_name', function(req, res) {
  const cacheName = req.params.cache_name;
  return res.status(200).json(helper.getCache(cacheName));
});

router.post('/cache/set/:cache_name', function(req, res) {
  const cacheName    = req.params.cache_name;
  const cacheContent = req.body;
  return res.status(200).json(helper.setCache(cacheName, cacheContent));
});

router.all('/data/widgets/:widget/', function(req, res, next) {
  const widgetName    = req.params.widget;

  if (!widgetName)
  {
    return res.status(200).json({ status: "provide a valid widget name" });
  }
  switch (widgetName) {
    case 'started-and-completed-interviews-by-day':
      getStartedAndCompletedInterviewsByDay(res);
      break;
    // TODO: new widgets will be added
  }
});

router.all('/data/interviews-status/:updatedAt?/', function(req, res, next) {
  const updatedAt     = req.params.updatedAt     ? parseInt(req.params.updatedAt) : 0;
  getInterviewsStatus(res, updatedAt);
});

const getInterviewsStatus = function(res, updatedAt = 0) {
  const interviewsStatus = {
    updatedAt,
    interviews: {}
  };
  let lastUpdatedAt = updatedAt;
  knex.select('i.id', 'i.uuid', 'i.updated_at', 'i.responses', 'i.validated_data', 'i.is_valid AS interview_is_valid', 'i.is_completed AS interview_is_completed', 'i.is_validated AS interview_is_validated')
  .from('sv_interviews AS i')
  .leftJoin('sv_participants', 'i.participant_id', 'sv_participants.id')
  .whereRaw(`i.is_active IS TRUE AND sv_participants.is_valid IS TRUE AND sv_participants.is_test IS NOT TRUE AND extract(epoch from i.updated_at) > ${updatedAt}`)
  .orderBy('i.id')
  .then(function(rows) {
    for (let i = 0, count = rows.length; i < count; i++) {
      const interview          = rows[i];
      const responses          = interview.responses;
      const validated_data     = interview.validated_data || {};
      const interviewUpdatedAt = moment(interview.updated_at).unix();
      const validatedHouseholdSize = _get(validated_data, 'household.size', null);
      interviewsStatus.interviews[interview.uuid] = {
        accessCode   : validated_data.accessCode || responses.accessCode || interview.id,
        uuid         : interview.uuid,
        isCompleted  : responses._isCompleted === true,
        isValid      : interview.interview_is_valid,
        isValidated  : interview.interview_is_validated,
        householdSize: validatedHouseholdSize || _get(responses, 'household.size', null)
      };
      if (lastUpdatedAt < interviewUpdatedAt)
      {
        lastUpdatedAt = interviewUpdatedAt;
      }
    }
    interviewsStatus.updatedAt = lastUpdatedAt;
    res.status(200).json(interviewsStatus);
  });
};

const getStartedAndCompletedInterviewsByDay = function(res) {

  getInterviewsCache('interviewsStats').then(function(jsonData) {
    const firstDate                         = moment(jsonData.firstDate);
    const lastDate                          = moment(jsonData.lastDate);
    const dates                             = [];
    const startedCountPerDate               = {};
    const completedCountPerDate             = {};
    const partOneStartedCountPerDate        = {};
    const partOneCompletedCountPerDate      = {};
    const partTwoStartedCountPerDate        = {};
    const partTwoCompletedCountPerDate      = {};
    const startedCountPerDateIndex          = [];
    const completedCountPerDateIndex        = [];
    const partOneStartedCountPerDateIndex   = [];
    const partOneCompletedCountPerDateIndex = [];
    const partTwoStartedCountPerDateIndex   = [];
    const partTwoCompletedCountPerDateIndex = [];

    for (let date = firstDate; date.diff(lastDate, 'days') <= 0; date.add(1, 'days'))
    {
      const dateStr = date.format('YYYY-MM-DD');
      dates.push(dateStr);
      startedCountPerDate         [dateStr] = 0;
      completedCountPerDate       [dateStr] = 0;
      partOneStartedCountPerDate  [dateStr] = 0;
      partOneCompletedCountPerDate[dateStr] = 0;
      partTwoStartedCountPerDate  [dateStr] = 0;
      partTwoCompletedCountPerDate[dateStr] = 0;
    }
    for (let i = 0, count = jsonData.interviews.length; i < count; i++)
    {
      const interview = jsonData.interviews[i];
      if(interview.startedAtDate)
      {
        startedCountPerDate[interview.startedAtDate]++;
      }
      if(interview.completedAtDate)
      {
        completedCountPerDate[interview.completedAtDate]++;
      }
      if(interview.partOneStartedAtDate)
      {
        partOneStartedCountPerDate[interview.partOneStartedAtDate]++;
      }
      if(interview.partOneCompletedAtDate)
      {
        partOneCompletedCountPerDate[interview.partOneCompletedAtDate]++;
      }
      if(interview.partTwoStartedAtDate)
      {
        partTwoStartedCountPerDate[interview.partTwoStartedAtDate]++;
      }
      if(interview.partTwoCompletedAtDate)
      {
        partTwoCompletedCountPerDate[interview.partTwoCompletedAtDate]++;
      }
    }
    for (let i = 0, count = dates.length; i < count; i++)
    {
      const date                           = dates[i];
      startedCountPerDateIndex         [i] = startedCountPerDate[date];
      completedCountPerDateIndex       [i] = completedCountPerDate[date];
      partOneStartedCountPerDateIndex  [i] = partOneStartedCountPerDate[date];
      partOneCompletedCountPerDateIndex[i] = partOneCompletedCountPerDate[date];
      partTwoStartedCountPerDateIndex  [i] = partTwoStartedCountPerDate[date];
      partTwoCompletedCountPerDateIndex[i] = partTwoCompletedCountPerDate[date];
    }

    return res.status(200).json({
      dates,
      started                : startedCountPerDateIndex,
      completed              : completedCountPerDateIndex,
      partOneStarted         : partOneStartedCountPerDateIndex,
      partOneCompleted       : partOneCompletedCountPerDateIndex,
      partTwoStarted         : partTwoStartedCountPerDateIndex,
      partTwoCompleted       : partTwoCompletedCountPerDateIndex,
      startedCount           : jsonData.startedCount,
      completedCount         : jsonData.completedCount,
      partOneStartedCount    : jsonData.partOneStartedCount,
      partOneCompletedCount  : jsonData.partOneCompletedCount,
      partTwoStartedCount    : jsonData.partTwoStartedCount,
      partTwoCompletedCount  : jsonData.partTwoCompletedCount
    });
  });
};

const createDirectoryIfNotExists = function(relativeDirectoryPath) {
  if (!relativeDirectoryPath.startsWith('/'))
  {
    relativeDirectoryPath = '/' + relativeDirectoryPath;
  }
  const absoluteDirectoryPath = __dirname + relativeDirectoryPath;
  if (!fs.existsSync(absoluteDirectoryPath))
  {
    fs.mkdirSync(absoluteDirectoryPath);
  }
};

const getInterviewsCache = function(cacheName) {

  const cacheFilePath = `${directoryManager.cacheDirectory}/${cacheName}.json`;
  let interviewsCache = null;
  // disable cache for now since it will count twice when an interview is updated after being added to cache
  //if (fs.existsSync(cacheFilePath))
  //{
  //  interviewsCache = JSON.parse(fs.readFileSync(cacheFilePath).toString());
  //}
  //else
  //{
    interviewsCache = {
      updatedAt                       : 0,
      firstTimestamp                  : null,
      lastTimestamp                   : null,
      firstDate                       : null,
      lastDate                        : null,
      startedCount                    : 0,
      completedCount                  : 0,
      partOneStartedCount             : 0,
      partOneCompletedCount           : 0,
      partTwoStartedCount             : 0,
      partTwoCompletedCount           : 0,
      interviewDurationsSeconds       : [],
      partOneInterviewDurationsSeconds: [],
      partTwoInterviewDurationsSeconds: [],
      interviews                      : []
    };
  //}

  return updateInterviews(interviewsCache).then(function(jsonData) {
    fs.writeFileSync(cacheFilePath, JSON.stringify(jsonData), {flag: 'w'});
    return jsonData;
  });

};

const updateInterviews = function(interviewsData) {
  return knex.select('i.id', 'i.updated_at', 'responses')
  .from('sv_interviews AS i')
  .leftJoin('sv_participants', 'i.participant_id', 'sv_participants.id')
  .whereRaw(`i.is_active IS TRUE AND sv_participants.is_valid IS TRUE AND sv_participants.is_test IS NOT TRUE AND extract(epoch from i.updated_at) > ${interviewsData.updatedAt}`)
  .orderBy('i.id')
  .then(function(rows) {

    const timezone               = config.timezone || 'America/Montreal';
    let   lastUpdatedAt          = interviewsData.updatedAt;
    let   startedCount           = interviewsData.startedCount;
    let   completedCount         = interviewsData.completedCount;
    let   partOneStartedCount    = interviewsData.partOneStartedCount;
    let   partOneCompletedCount  = interviewsData.partOneCompletedCount;
    let   partTwoStartedCount    = interviewsData.partTwoStartedCount;
    let   partTwoCompletedCount  = interviewsData.partTwoCompletedCount;
    let   firstTimestamp         = interviewsData.firstTimestamp;
    let   lastTimestamp          = interviewsData.lastTimestamp;

    for (let i = 0, count = rows.length; i < count; i++)
    {

      const interview            = rows[i];
      const interviewUpdatedAt   = moment(interview.updated_at).unix();
      lastUpdatedAt = lastUpdatedAt < interviewUpdatedAt ? interviewUpdatedAt : lastUpdatedAt;
      const responses            = interview.responses;

      if (isObject(responses) && !isEmpty(responses))
      {
        const startedAtTimestamp          = responses._startedAt          ? responses._startedAt          : null;
        const completedAtTimestamp        = responses._completedAt        ? responses._completedAt        : null;
        const partOneStartedAtTimestamp   = responses._partOneStartedAt   ? responses._partOneStartedAt   : null;
        const partOneCompletedAtTimestamp = responses._partOneCompletedAt ? responses._partOneCompletedAt : null;
        const partTwoStartedAtTimestamp   = responses._partTwoStartedAt   ? responses._partTwoStartedAt   : null;
        const partTwoCompletedAtTimestamp = responses._partTwoCompletedAt ? responses._partTwoCompletedAt : null;
        if (startedAtTimestamp)          { startedCount++;          }
        if (completedAtTimestamp)        { completedCount++;        }
        if (partOneStartedAtTimestamp)   { partOneStartedCount++;   }
        if (partOneCompletedAtTimestamp) { partOneCompletedCount++; }
        if (partTwoStartedAtTimestamp)   { partTwoStartedCount++;   }
        if (partTwoCompletedAtTimestamp) { partTwoCompletedCount++; }
        const startedAtDate          = startedAtTimestamp          ? moment.unix(startedAtTimestamp).tz(timezone).format('YYYY-MM-DD')          : null;
        const completedAtDate        = completedAtTimestamp        ? moment.unix(completedAtTimestamp).tz(timezone).format('YYYY-MM-DD')        : null;
        const partOneStartedAtDate   = partOneStartedAtTimestamp   ? moment.unix(partOneStartedAtTimestamp).tz(timezone).format('YYYY-MM-DD')   : null;
        const partOneCompletedAtDate = partOneCompletedAtTimestamp ? moment.unix(partOneCompletedAtTimestamp).tz(timezone).format('YYYY-MM-DD') : null;
        const partTwoStartedAtDate   = partTwoStartedAtTimestamp   ? moment.unix(partTwoStartedAtTimestamp).tz(timezone).format('YYYY-MM-DD')   : null;
        const partTwoCompletedAtDate = partTwoCompletedAtTimestamp ? moment.unix(partTwoCompletedAtTimestamp).tz(timezone).format('YYYY-MM-DD') : null;
        // update first and last timestamp:
        if (startedAtTimestamp          && (!firstTimestamp || firstTimestamp > startedAtTimestamp))          { firstTimestamp = startedAtTimestamp;          }
        if (partOneStartedAtTimestamp   && (!firstTimestamp || firstTimestamp > partOneStartedAtTimestamp))   { firstTimestamp = partOneStartedAtTimestamp;   }
        if (partTwoStartedAtTimestamp   && (!firstTimestamp || firstTimestamp > partTwoStartedAtTimestamp))   { firstTimestamp = partTwoStartedAtTimestamp;   }
        if (startedAtTimestamp          && (!lastTimestamp  || lastTimestamp  < startedAtTimestamp))          { lastTimestamp  = startedAtTimestamp;          }
        if (partOneStartedAtTimestamp   && (!lastTimestamp  || lastTimestamp  < partOneStartedAtTimestamp))   { lastTimestamp  = partOneStartedAtTimestamp;   }
        if (partTwoStartedAtTimestamp   && (!lastTimestamp  || lastTimestamp  < partTwoStartedAtTimestamp))   { lastTimestamp  = partTwoStartedAtTimestamp;   }
        if (completedAtTimestamp        && (!lastTimestamp  || lastTimestamp  < completedAtTimestamp))        { lastTimestamp  = completedAtTimestamp;        }
        if (partOneCompletedAtTimestamp && (!lastTimestamp  || lastTimestamp  < partOneCompletedAtTimestamp)) { lastTimestamp  = partOneCompletedAtTimestamp; }
        if (partTwoCompletedAtTimestamp && (!lastTimestamp  || lastTimestamp  < partTwoCompletedAtTimestamp)) { lastTimestamp  = partTwoCompletedAtTimestamp; }

        const interviewDurationSeconds        = startedAtTimestamp        && completedAtTimestamp        ? completedAtTimestamp        - startedAtTimestamp        : null;
        const partOneInterviewDurationSeconds = partOneStartedAtTimestamp && partOneCompletedAtTimestamp ? partOneCompletedAtTimestamp - partOneStartedAtTimestamp : null;
        const partTwoInterviewDurationSeconds = partTwoStartedAtTimestamp && partTwoCompletedAtTimestamp ? partTwoCompletedAtTimestamp - partTwoStartedAtTimestamp : null;
        if (interviewDurationSeconds)        { interviewsData.interviewDurationsSeconds.push(interviewDurationSeconds              ); }
        if (partOneInterviewDurationSeconds) { interviewsData.partOneInterviewDurationsSeconds.push(partOneInterviewDurationSeconds); }
        if (partTwoInterviewDurationSeconds) { interviewsData.partTwoInterviewDurationsSeconds.push(partTwoInterviewDurationSeconds); }

        interviewsData.interviews.push({

          updatedAt                : interviewUpdatedAt,

          startedAt                : startedAtTimestamp,
          completedAt              : completedAtTimestamp,
          partOneStartedAt         : partOneStartedAtTimestamp,
          partOneCompletedAt       : partOneCompletedAtTimestamp,
          partTwoStartedAt         : partTwoStartedAtTimestamp,
          partTwoCompletedAt       : partTwoCompletedAtTimestamp,

          startedAtDate,
          completedAtDate,
          partOneStartedAtDate,
          partOneCompletedAtDate,
          partTwoStartedAtDate,
          partTwoCompletedAtDate,

          startedAtHour            : startedAtTimestamp          ? moment.unix(startedAtTimestamp).tz(timezone).format('HH')                  : null,
          completedAtHour          : completedAtTimestamp        ? moment.unix(completedAtTimestamp).tz(timezone).format('HH')                : null,
          partOneStartedAtHour     : partOneStartedAtTimestamp   ? moment.unix(partOneStartedAtTimestamp).tz(timezone).format('HH')           : null,
          partOneCompletedAtHour   : partOneCompletedAtTimestamp ? moment.unix(partOneCompletedAtTimestamp).tz(timezone).format('HH')         : null,
          partTwoStartedAtHour     : partTwoStartedAtTimestamp   ? moment.unix(partTwoStartedAtTimestamp).tz(timezone).format('HH')           : null,
          partTwoCompletedAtHour   : partTwoCompletedAtTimestamp ? moment.unix(partTwoCompletedAtTimestamp).tz(timezone).format('HH')         : null,

          isCompleted              : responses._isCompleted        !== undefined ? responses._isCompleted        : !!completedAtTimestamp, // there is still old versions without the boolean
          isPartOneCompleted       : responses._partOneIsCompleted !== undefined ? responses._partOneIsCompleted : !!partOneCompletedAtTimestamp, // there is still old versions without the boolean
          isPartTwoCompleted       : responses._partTwoIsCompleted !== undefined ? responses._partTwoIsCompleted : !!partTwoCompletedAtTimestamp, // there is still old versions without the boolean

          interviewDurationSeconds,
          partOneInterviewDurationSeconds,
          partTwoInterviewDurationSeconds,

          source: responses._source !== undefined ? responses._source : null

        });
      }
    }

    interviewsData.updatedAt             = lastUpdatedAt;

    interviewsData.startedCount          = startedCount;
    interviewsData.completedCount        = completedCount;
    interviewsData.partOneStartedCount   = partOneStartedCount;
    interviewsData.partOneCompletedCount = partOneCompletedCount;
    interviewsData.partTwoStartedCount   = partTwoStartedCount;
    interviewsData.partTwoCompletedCount = partTwoCompletedCount;

    interviewsData.firstTimestamp        = firstTimestamp;
    interviewsData.lastTimestamp         = lastTimestamp;
    interviewsData.firstDate             = firstTimestamp ? moment.unix(firstTimestamp).tz(timezone).format('YYYY-MM-DD') : null;
    interviewsData.lastDate              = lastTimestamp  ? moment.unix(lastTimestamp).tz( timezone).format('YYYY-MM-DD') : null;

    interviewsData.averageInterviewDurationSeconds        = interviewsData.interviewDurationsSeconds.length        > 0 ? _mean(interviewsData.interviewDurationsSeconds)        : null;
    interviewsData.averagePartOneInterviewDurationSeconds = interviewsData.partOneInterviewDurationsSeconds.length > 0 ? _mean(interviewsData.partOneInterviewDurationsSeconds) : null;
    interviewsData.averagePartTwoInterviewDurationSeconds = interviewsData.partTwoInterviewDurationsSeconds.length > 0 ? _mean(interviewsData.partTwoInterviewDurationsSeconds) : null;

    return interviewsData;

  });
};



module.exports = router;
