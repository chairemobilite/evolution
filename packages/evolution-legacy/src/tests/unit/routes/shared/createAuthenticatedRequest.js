/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const request = require('supertest');

const user = {
  usernameOrEmail: 'test',
  password       : 'testpassword'
};

module.exports = function(serverApp, done) {

  const authenticatedRequest = request(serverApp);
  authenticatedRequest
  .post('/login')
  .send(user)
  .end(function(error, response) {
    const loginCookie = response.headers['set-cookie'];
    if (error) {
        throw error;
    }
    done(loginCookie);
  });

};