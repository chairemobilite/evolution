/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import * as AuthBase from 'chaire-lib-frontend/lib/actions/Auth';

export const login = AuthBase.login;

export const forgot = AuthBase.forgot;

export const logout = AuthBase.logout

export const startLogin = AuthBase.startLogin;

export const startLogout = AuthBase.startLogout;

// TODO: Is commented in chaire-lib-frontend
export const startRegister = (data, history) => {
  return (dispatch, getState) => {
    return fetch('/register',
    {
      method: 'POST',
      body: JSON.stringify(data),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'  }
    })
    .then((response) => {
      if(response.status === 200){
        response.json().then((body) => {
          if (body.user)
          {
            dispatch(login(body.user, true, true, false));
            const defaultPath = process.env.APP_NAME === 'survey' ? '/survey' : '/dashboard';
            history.push(defaultPath);
          }
          else
          {
            dispatch(login(null, false, true, false));
          }
        });
      }
      else
      {
        dispatch(login(null, false, true, false));
      }
    }).catch((err) => {
      console.log('Error during registration.', err);
    });
  };
};

export const startRegisterWithPassword = AuthBase.startRegisterWithPassword;

export const startForgotPasswordRequest = AuthBase.startForgotPasswordRequest;

// TODO This does not exist in chaire-lib-frontend
export const startChangePassword = (data, history) => {
  return (dispatch, getState) => {
    return fetch('/change_password',
    {
      method: 'POST',
      body: JSON.stringify(data),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'  }
    })
    .then((response) => {
      if(response.status === 200){
        response.json().then((body) => {
          if (body.user)
          {
            if (process.env.APP_NAME === 'survey')
            {
              dispatch(login(body.user, true, true, false));
              history.push('/survey');
            }
            else
            {
              dispatch(login(body.user, true, true, false));
              history.push('/dashboard');
            }
          }
          else
          {
            dispatch(login(null, false, true, false));
          }
        });
      }
      else {
        dispatch(login(null, false, true, false));
      }
    }).catch((err) => {
      console.log('Error during password change.', err);
    });
  };
};
