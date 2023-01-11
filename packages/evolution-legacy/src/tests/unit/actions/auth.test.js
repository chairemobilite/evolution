/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { createMemoryHistory } from 'history';

import {login, logout, startLogin, startLogout} from '../../../actions/shared/auth';

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

test('Should generate login action object', () =>
{
    const uid = { id: 2, username: 'abc123'} ;
    const action = login(uid, undefined, undefined, true);
    expect(action).toEqual({
        isAuthenticated: false,
        type: 'LOGIN',
        user: { ...uid, isAuthorized: expect.anything(), is_admin: false, pages: [], showUserInfo: true },
        login: true,
        register: false
    });
});

test('Should generate logout action object', () =>
{
    const action = logout();
    expect(action).toEqual({
        isAuthenticated: false,
        type: 'LOGOUT',
        user: null,
        register: false
    });
});

test('Should dipatch a login action', () =>
{
    const store = mockStore({});
    fetch.resetMocks();
    const history = createMemoryHistory()

    const response = { user: { id: 2, username: 'user'} };
    fetch.mockResponseOnce(JSON.stringify(response));

    const data = {user: 'user'};
    const expectedActions = [{
                             isAuthenticated: true,
                             type: 'LOGIN',
                             user: { ...response.user, isAuthorized: expect.anything(), is_admin: false, pages: [], showUserInfo: true },
                             login: true,
                             register: false
                            }];

    return store.dispatch(startLogin(data, history)).then( () =>
        {
            expect(store.getActions()).toEqual(expectedActions);
            //expect(history.location.pathname).toEqual('/home');
        });
});

