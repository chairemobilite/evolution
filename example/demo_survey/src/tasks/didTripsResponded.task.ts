/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';

const fetchDidTripsFromDb = function() { return knex.select('sv_interviews.id', 'sv_interviews.updated_at', 'responses', 'validations', 'user_id')
  .from('sv_interviews')
  .leftJoin('users', 'users.id', 'sv_interviews.user_id')
  .whereRaw(`sv_interviews.is_active IS TRUE AND users.is_valid IS TRUE`)
  .then((rows) => {
    let countUnknownDidTrips = 0;
    let countHouseholds      = 0;
    let countPersons         = 0;
    for (let i = 0, count = rows.length; i < count; i++)
    {
      const interview  = rows[i];
      const responses  = interview.responses;
      if (responses._completedAt > 0)
      {
        const persons = responses && responses.household ? responses.household.persons : {};
        for (const personId in persons)
        {
          const person = persons[personId];
          if (person.age >= 5)
          {
            if (person.didTripsOnTripsDateKnowTrips === 'no')
            {
              countUnknownDidTrips++;
            }
            countPersons++;
          }
        }
        countHouseholds++;
      }
      
    }
    console.log(countUnknownDidTrips);
    console.log(countPersons);
    console.log(countHouseholds);
  });
};

fetchDidTripsFromDb();