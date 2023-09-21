/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const _uniq = require('lodash/uniq')

module.exports = function(segments) { // segments array
  const multimodes        = [];
  for (let i = 0, count = segments.length; i < count; i++)
  {
    const segment = segments[i];
         if (segment.mode === null || segment.mode === undefined) { return null; }
    else if (segment.mode === 'carDriver')       { multimodes.push('carDriver'); }
    else if (segment.mode === 'carPassenger')    { multimodes.push('carPassenger'); }
    else if (segment.mode === 'motorcycle')      { multimodes.push('motorcycle'); }
    else if (segment.mode.startsWith('transit')) { multimodes.push('transit'); }
    else if (segment.mode === 'bicycle')         { multimodes.push('bicycle'); }
    else if (segment.mode === 'taxi')            { multimodes.push('taxi'); }
    else if (segment.mode === 'paratransit')     { multimodes.push('paratransit'); }
    else if (segment.mode === 'schoolBus')       { multimodes.push('schoolBus'); }
    else if (segment.mode === 'walk')            { multimodes.push('walk'); }
    else                                         { multimodes.push('other'); }
  }

  let uniqueModes = _uniq(multimodes);
  if (uniqueModes.length === 1 && uniqueModes[0] === 'walk')
  {
    return 'walk';
  }
  uniqueModes = uniqueModes.filter(function(mode) { 
    return mode !== 'walk'
  });
  if (uniqueModes.length === 1)
  {
    if (segments[0].mode.startsWith('transit'))
    {
      return 'transit';
    }
    else
    {
      return segments[0].mode;
    }
  }
  else
  {
    uniqueModes.sort();
    if (uniqueModes.length === 2)
    {
           if (uniqueModes[0] === 'carDriver'    && uniqueModes[1] === 'transit') { return 'parkAndRide';           }
      else if (uniqueModes[0] === 'bicycle'      && uniqueModes[1] === 'transit') { return 'bikeAndRide';           }
      else if (uniqueModes[0] === 'carPassenger' && uniqueModes[1] === 'transit') { return 'kissAndRide';           }
      else if (uniqueModes[0] === 'motorcycle'   && uniqueModes[1] === 'transit') { return 'parkAndRide';           }
      else                                                                        { return 'bimodalOther'; }
    }
    else
    {
      return 'multimodalOther';
    }
  }
};