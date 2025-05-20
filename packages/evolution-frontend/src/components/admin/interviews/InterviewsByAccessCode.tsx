/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import Loadable from 'react-loadable';
import Loader from 'react-spinners/HashLoader';

import { InterviewContext } from '../../../contexts/InterviewContext';
import InputString from 'chaire-lib-frontend/lib/components/input/InputString';
import { Link, useLocation, useParams } from 'react-router';
import { _booleish } from 'chaire-lib-common/lib/utils/LodashExtensions';

const loader = function Loading() {
    return <Loader size={30} color={'#aaaaaa'} loading={true} />;
};

const InterviewsComponent = Loadable({
    // TODO: move this to componentDidMount like in Monitoring.tsx
    loader: () => import('./InterviewSearchList'),
    loading: loader
});

const InterviewsByAccessCode: React.FC = () => {
    const location = useLocation();
    const params = useParams();
    const { t } = useTranslation('admin');

    const urlSearch = new URLSearchParams(location.search);
    const [currentCode, setCurrentCode] = React.useState(params.accessCode);
    const [createNewIfNoData] = React.useState(_booleish(urlSearch.get('autoCreate')) === true);
    const { state, dispatch } = React.useContext(InterviewContext);

    React.useEffect(() => {
        if (params.accessCode !== state.response.accessCode) {
            dispatch({ type: 'update_response', response: { accessCode: params.accessCode } });
        }
    }, [params.accessCode, state.response]);

    return (
        <div className="admin">
            <div className="survey-section__content apptr__form-container">
                <InputString
                    id="accessCodeSearchInput"
                    value={currentCode}
                    onValueUpdated={(newValue) => setCurrentCode(newValue.value)}
                ></InputString>
                <Link to={`/interviews/byCode/${currentCode}`}>
                    <button type="button" className={'survey-section__button button blue small'}>
                        {t('admin:interviewSearch:SearchByCode')}
                    </button>
                </Link>
            </div>
            <InterviewsComponent autoCreateIfNoData={createNewIfNoData} queryData={urlSearch} />
        </div>
    );
};

export default InterviewsByAccessCode;
