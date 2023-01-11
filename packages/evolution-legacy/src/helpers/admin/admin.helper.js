/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const getJson = function(url) {
  return fetch(url).then(function(response) {
    if (response.status === 200) {
      return response.json().then(function(jsonData) {
        return jsonData;
      }).catch((error) => {
        throw 'Error converting data to json. ' + error;
      });
    }
    else
    {
      throw 'Error fetching data from server. Response status was ' + response.status;
    }
  }).catch((error) => {
     throw 'Error fetching data. ' + error;
  });
};

const setJson = function(url, data) {
  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(function(response) {
    if (response.status === 200) {
      return response.json().then(function(jsonData) {
        if (jsonData.status === 'success')
        {
          return data;
        }
        else
        {
          throw 'Error receiving response from server.';
        }
      }).catch((error) => {
         throw 'Could not convert response to json. ' + error;
      });
    }
  }).catch((error) => {
    throw 'Error sending data. ' + error;
  });
};

const getCache = function(cacheName) {
  return getJson(`/api/admin/cache/get/${cacheName}`)
  .then(function(jsonData) {
    return jsonData;
  }).catch((error) => {
     throw error;
  });
};

const setCache = function(cacheName, cacheData) {
  return setJson(`/api/admin/cache/set/${cacheName}`, cacheData)
  .then(function(jsonData) {
    return jsonData;
  }).catch((error) => {
    throw error;
  });
};

export default {
  
  getJson,
  setJson,
  getCache,
  setCache

};