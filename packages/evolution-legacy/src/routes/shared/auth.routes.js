/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
require('../../config/shared/dotenv.config');
const bcrypt      = require('bcryptjs');

// TODO Use same UserModel as chaire lib, not doing it now as the chaire-lib columns may leak user data
const bookshelf   = require('../../config/shared/bookshelf.config.js');

const UserModel   = bookshelf.Model.extend({
  tableName: 'users'
}, {
  jsonColumns: ['preferences', 'profile', 'permissions']
});

module.exports = function(app){

  app.post('/change_password',
    function(req, res){
      if(req.isAuthenticated() && req.user)
      {
        const _user     = new UserModel({...req.user});
        _user.set('password', bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10)));
        _user.save(null).then((data) => {
          res.status(200).json({
            user: req.user,
            status: 'Login successful!'
          });
        }).catch((error) => {
          console.log(error);
          return res(`An error occured when updating the new user: ${error}`);
        });
        return null;
      }
      else
      {
        return res.redirect(307, '/login');
      }
    }
  );

};