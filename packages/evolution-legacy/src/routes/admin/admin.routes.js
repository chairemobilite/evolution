/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const knex           = require('chaire-lib-backend/lib/config/shared/db.config').default;
const moment         = require('moment-timezone');
const _get           = require('lodash/get');

import router from 'evolution-backend/lib/api/admin.routes';

const helper         = require('evolution-backend/lib/services/adminExport/cache');

router.get('/cache/get/:cache_name', function(req, res) {
  const cacheName = req.params.cache_name;
  return res.status(200).json(helper.getCache(cacheName));
});

router.post('/cache/set/:cache_name', function(req, res) {
  const cacheName    = req.params.cache_name;
  const cacheContent = req.body;
  return res.status(200).json(helper.setCache(cacheName, cacheContent));
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

module.exports = router;
