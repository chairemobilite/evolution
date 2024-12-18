/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useLocation, useNavigate, NavigateFunction } from 'react-router';

import { startDirectTokenLogin } from '../../../actions/Auth';
import { ThunkDispatch } from 'redux-thunk';
import { RootState } from '../../../store/configureStore';
import { SurveyAction } from '../../../store/survey';
import { useDispatch } from 'react-redux';

export const DirectTokenLogin: React.FC = () => {
    const navigate: NavigateFunction = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, SurveyAction>>();

    React.useEffect(() => {
        dispatch(startDirectTokenLogin(location, navigate));
    }, []);
    return null;
};

export default DirectTokenLogin;
