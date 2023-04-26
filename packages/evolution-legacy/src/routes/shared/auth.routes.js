/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// TODO Move this feature to chaire-lib or not, just drop and use reset password
// import User from 'chaire-lib-backend/lib/services/auth/user';

export default function(app){

  /* app.post('/change_password', (req, res) => {
    if (req.isAuthenticated() && req.user) {
        const _user = new User({ ...req.user });
        const password = req.body.password;
        if (typeof password === 'string' && password.length > 8) {
            _user.updateAndSave({
                password: User.encryptPassword(password)
            }).then(() => {
                res.status(200).json({
                    user: req.user,
                    status: 'PasswordChange'
                });
            })
        } else {
            res.status(400).json({
                user: req.user,
                status: 'InvalidPassword'
            })
        }
        
    } else {
        console.log('not logged in!');
        //return res.redirect(307, '/login');
    }
  }); */
};