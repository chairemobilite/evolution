/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import Loader from 'react-spinners/HashLoader';

import { InterviewContext } from '../../../contexts/InterviewContext';
import InputString from 'chaire-lib-frontend/lib/components/input/InputString';
import { Link, useLocation, useParams } from 'react-router';
import { _booleish } from 'chaire-lib-common/lib/utils/LodashExtensions';

const LoaderComponent = () => <Loader size={30} color={'#aaaaaa'} loading={true} />;

const InterviewsComponent = lazy(() => import('./InterviewSearchList'));

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
            <Suspense fallback={<LoaderComponent />}>
                <InterviewsComponent autoCreateIfNoData={createNewIfNoData} queryData={urlSearch} />
            </Suspense>
        </div>
    );
};

export default InterviewsByAccessCode;
