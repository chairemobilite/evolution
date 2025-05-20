/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';

const fetchOccupationsFromDb = function() { return knex.select('sv_interviews.id', 'sv_interviews.updated_at', 'response', 'validations', 'user_id')
  .from('sv_interviews')
  .leftJoin('users', 'users.id', 'sv_interviews.user_id')
  .whereRaw(`sv_interviews.is_active IS TRUE AND users.is_valid IS TRUE`)
  .then((rows) => {
    const countByOccupation         = {};
    const countHouseholdsWithOthers = {'total': 0, 'withOthers': 0};
    for (let i = 0, count = rows.length; i < count; i++)
    {
      const interview  = rows[i];
      const response  = interview.response;
      if (response._completedAt > 0)
      {
        const persons     = response && response.household ? response.household.persons : {};
        const occupations = Object.values(persons).map(function(person: any) { return person.occupation; });
        countHouseholdsWithOthers['total']++;
        if (occupations.includes('retired') || occupations.includes('other') || occupations.includes('atHome'))
        {
          countHouseholdsWithOthers['withOthers']++;
        }
        for (const personId in persons)
        {
          const person     = persons[personId];
          const occupation = person.occupation;
          if (occupation)
          {
            if (countByOccupation[occupation] === undefined)
            {
              countByOccupation[occupation] = 0;
            }
            if (countByOccupation['total'] === undefined)
            {
              countByOccupation['total'] = 0;
            }
            countByOccupation[occupation]++;
            countByOccupation['total']++;
            
          }
        }
      }
      
    }
    console.log(countByOccupation);
    console.log(countHouseholdsWithOthers);
  });
};

fetchOccupationsFromDb();