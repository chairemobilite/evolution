/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const knex      = require('knex')(require('../../../knexfile'));
const fs        = require('fs');
const chalk     = require('chalk');
const moment    = require('moment');
const Mailchimp = require('mailchimp-api-v3');
const crypto    = require('crypto');
const _get      = require('lodash.get');
const sample    = require('lodash.sample');
const mailchimp = new Mailchimp(process.env.MAILCHIMP_API_KEY);
const bookshelf = require('../../config/shared/bookshelf.config.js');
const config    = require('chaire-lib-common/lib/config/shared/project.config');

const apiTask         = process.argv[2];
const batchesDates    = config.batchesDates;
const mailchimpListId = process.env.MAILCHIMP_LIST_ID;

console.log(mailchimpListId);

const Interview = bookshelf.Model.extend({
  tableName: 'sv_interviews'
});
const User = bookshelf.Model.extend({
  tableName: 'users',
  interview: function() {
    return this.hasOne(Interview);
  }
});
const Users = bookshelf.Collection.extend({
  model: User
});
const usersToUpdate = new Users;

const updateParticipants = function() {
  // fetch sending dates:
  const dates = getBatchesDatesFromRange(batchesDates);
  // fetch users from db:
  User.where(knex.raw(`is_valid IS TRUE AND is_test IS NOT TRUE`)).fetchAll({
    withRelated: ['interview']
  }).then(function(users) {
    if (users && users.length > 0)
    {
      const mailchimpUsers = [];
      users.forEach(function (user) {
        const interview = user.related('interview');
        if (interview)
        {
          const responses    = interview.get('responses');
          const contactEmail = _get(responses, 'household.contactEmail', null);
          const completedAt  = _get(responses, '_completedAt', null);
          const isCompleted  = _get(responses, '_isCompleted', false);
        
          if (contactEmail)
          {
            const emailMd5     = crypto.createHash('md5').update(contactEmail.toLowerCase()).digest("hex");
            let batchShortname = user.get('batch_shortname');
            if (!batchShortname)
            {
              batchShortname = sample(dates);
              user.set('batch_shortname', batchShortname);
            }
            mailchimpUsers.push({
              method: 'put',
              path  : `/lists/${mailchimpListId}/members/${emailMd5}`,
              body  : {
                email_address: contactEmail,
                status_if_new: 'subscribed',
                language     : _get(responses, '_language', 'none'),
                merge_fields : {
                  SENDDATE : batchShortname || "",
                  SAMPLE   : process.env.PROJECT_SAMPLE || "",
                  PROJECTSN: process.env.PROJECT_SHORTNAME || "",
                  HSIZE    : _get(responses, 'household.size', null),
                  COMPLAT  : completedAt || "",
                  ISCOMPL  : isCompleted ? 't' : 'f',
                  LANG     : _get(responses, '_language', 'none')
                }
              }
            });
            usersToUpdate.add(user);
            console.log(chalk.blue(`Assign user id ${user.get('id')} batch ${batchShortname}`));
          }
        }
      });
      //console.log(usersToUpdate);
      usersToUpdate.invokeThen('save').then(function() {
        console.log(chalk.green('successfully saved updated users'));
        //console.log(mailchimpUsers);
        mailchimp.batch(mailchimpUsers, { verbose: true })
        .then(function (results) {
          //console.log(results);
          console.log(chalk.green('successfully sent users data to mailchimp'));
          process.exit();
        })
        .catch(function (err) {
          console.log(chalk.red('Error connecting to mailchimp', err));
          process.exit();
        });
      });
    }
    else
    {
      console.log('no users found');
      process.exit();
    }
  }).catch((error) => {
    console.log(chalk.red('Error fetching users from database', error));
  });

};

const getBatchesDatesFromRange = function(batchesDates) {
  const dates    = [];
  const today    = moment();
  for (let date = moment(batchesDates.startDate); date.isBefore(batchesDates.endDate); date.add(1, 'days'))
  {
    if (!batchesDates.exceptDates.includes(date) && today.isBefore(date, 'day') && batchesDates.sendingWeekdays.includes(date.format('dddd').toLowerCase()))
    {
      dates.push(date.format('YYYY-MM-DD'));
    }
  }
  //console.log('batches dates', dates);
  return dates;
};



switch (apiTask) {
  case 'updateParticipants':
    updateParticipants();
    break;
}