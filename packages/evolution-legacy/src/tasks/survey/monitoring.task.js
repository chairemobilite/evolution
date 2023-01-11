/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
require('../../config/shared/dotenv.config');
const config    = require('chaire-lib-common/lib/config/shared/project.config');
const knex      = require('knex')(require('../../../knexfile'));
const fs        = require('fs');
const chalk     = require('chalk');
const moment    = require('moment');
const _get      = require('lodash.get');
const _mean     = require('lodash.mean');

console.log('Exporting monitoring for project', process.env.PROJECT_SHORTNAME);

const truncateCache           = process.argv[2] === 'truncate';
const usersCacheFilePath      = __dirname + '/../../../monitoring/usersCache.json';
const interviewsCacheFilePath = __dirname + '/../../../monitoring/interviewsCache.json';
const commentsCacheFilePath   = __dirname + '/../../../monitoring/commentsCache.json';
let   users                   = {ids: [], users: []};
let   interviews              = {};
let   comments                = {};

if (!fs.existsSync(__dirname + '/../../../monitoring')){
  console.log('Creating monitoring directory');
  fs.mkdirSync(__dirname + '/../../../monitoring');
}

if (!truncateCache)
{
  try {
    const usersJson      = fs.readFileSync(usersCacheFilePath).toString();
    const interviewsJson = fs.readFileSync(interviewsCacheFilePath).toString();
    const commentsJson   = fs.readFileSync(commentsCacheFilePath).toString();
    users      = !usersJson      ? {} : JSON.parse(usersJson);
    interviews = !interviewsJson ? {} : JSON.parse(interviewsJson);
    comments   = !commentsJson   ? {} : JSON.parse(commentsJson);
  } catch (error) {
    console.log('Error reading users and/or interview and/or comments cache file', error);
  }
}

const writeUsersCacheFile = function(users) {
  // write geojson file (or replace if exists)
  fs.writeFile(usersCacheFilePath, JSON.stringify(users), {flag: 'w'}, function(err) {
    if (err)
    {
      console.error(chalk.red(err));
    }
    else
    {
      console.log(chalk.green("\nUsers cache file saved successfully"));
      if (users.ids.length > 0)
      {
        fetchInterviewsFromDb(users, interviews);
      }
      else
      {
        process.exit();
      }
    }
  });
}

const writeInterviewsCacheFile = function(interviews, comments) {
  // write geojson file (or replace if exists)
  fs.writeFile(interviewsCacheFilePath, JSON.stringify(interviews), {flag: 'w'}, function(err) {
    if (err)
    {
      console.error(chalk.red(err));
    }
    else
    {
      console.log(chalk.green("\nInterviews cache file saved successfully"));
      console.log({startedCount: interviews.startedCount, completedCount: interviews.completedCount, completionRate: interviews.completionRate, averageDurationMinutes: interviews.averageDuration > 0 ? interviews.averageDuration / 60 : null});
      writeCommentsCacheFile(comments);
    }
  });
}

const writeCommentsCacheFile = function(comments) {
  // write geojson file (or replace if exists)
  fs.writeFile(commentsCacheFilePath, JSON.stringify(comments, null, 2), {flag: 'w'}, function(err) {
    if (err)
    {
      console.error(chalk.red(err));
    }
    else
    {
      console.log(chalk.green("\nComments cache file saved successfully"));
    }
    process.exit();
  });
}

const fetchInterviewsFromDb = function(users, interviews) { return knex.select('id', 'updated_at', 'responses', 'validations', 'user_id')
  .from('sv_interviews')
  .whereRaw(`is_active IS TRUE AND user_id IN (${users.ids.join(',')})${interviews.lastUpdatedAt > 0 ? `AND extract(epoch from updated_at) > ${interviews.lastUpdatedAt} ` : ''}`)
  .then((rows) => {
    interviews.statsByInterviewId = interviews.statsByInterviewId || {};
    comments                      = comments || {};
    let lastUpdatedAt             = 0;
    for (let i = 0, count = rows.length; i < count; i++)
    {

      const interview               = rows[i];
      const updatedAt               = moment(interview.updated_at).unix();
      lastUpdatedAt                 = lastUpdatedAt < updatedAt ? updatedAt : lastUpdatedAt;
      const startedAt               = _get(interview, 'responses._startedAt', null);
      const completedAt             = _get(interview, 'responses._completedAt', null);
      const comment                 = _get(interview, 'responses.household.commentsOnSurvey', null) || _get(interview, 'responses.commentsOnSurvey', null);

      interviews.statsByInterviewId[interview.id] = {
        id           : interview.id,
        userId       : interview.user_id,
        updatedAt    : updatedAt,
        duration     : startedAt && completedAt ? completedAt - startedAt: null,
        startedAt    : startedAt,
        completedAt  : completedAt,
        householdSize: _get(interview, 'responses.household.size', null),
      }

      if (comment)
      {
        comments[interview.id] = comment;
      }

      interviews.lastUpdatedAt = lastUpdatedAt;
    }
    
    const durations      = [];
    let   completedCount = 0;
    let   startedCount   = 0;

    for (const interviewId in interviews.statsByInterviewId)
    {
      const interviewStat = interviews.statsByInterviewId[interviewId];
      if (interviewStat.duration && interviewStat.duration > 0 && interviewStat.duration <= 3600)
      {
        durations.push(interviewStat.duration);
      }
      if (interviewStat.startedAt)
      {
        startedCount++;
      }
      if (interviewStat.completedAt)
      {
        completedCount++;
      }
    }

    interviews.durations      = durations;
    interviews.startedCount   = startedCount;
    interviews.completedCount = completedCount;
    interviews.completionRate = completedCount >= 0 && startedCount > 0 ? parseFloat(completedCount) / startedCount : 0;

    if (durations.length > 0)
    {
      interviews.averageDuration = _mean(durations);
    }

    writeInterviewsCacheFile(interviews, comments);
    
  }).catch((error) => {
    console.log('Error fetching interviews from database', error);
  });

};



knex.select('id', 'uuid', 'username', 'email', 'google_id', 'facebook_id')
    .from('users')
    .whereRaw(`is_valid IS TRUE AND is_test IS NOT TRUE ${!truncateCache && users.ids.length > 0 ? `AND id NOT IN (${users.ids.join(',')})`: ''}`)
    .then((rows) => {
      for (let i = 0, count = rows.length; i < count; i++)
      {
        users.ids.push(rows[i].id);
      }
      writeUsersCacheFile(users);
    }).catch((error) => {
      console.log('Error fetching users from database', error);
    });



