/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { History } from 'history';
import Loadable from 'react-loadable';
import Loader from 'react-spinners/HashLoader';
import { InterviewContext } from '../../contexts/InterviewContext';
import InputString from 'chaire-lib-frontend/lib/components/input/InputString';
import { Link, RouteComponentProps } from 'react-router-dom';
import { _booleish } from 'chaire-lib-common/lib/utils/LodashExtensions';

interface MatchParams {
    accessCode: string;
}

export interface InterviewsByCodePageProps extends WithTranslation, RouteComponentProps<MatchParams> {
    isAuthenticated: boolean;
    history: History;
    // TODO Type the user
    user: { [key: string]: any };
}

const loader = function Loading() {
    return <Loader size={30} color={'#aaaaaa'} loading={true} />;
};

const InterviewsComponent = Loadable({
    // TODO: move this to componentDidMount like in Monitoring.tsx
    loader: () => import('../pageParts/interviews/InterviewSearchList'),
    loading: loader
});

const InterviewsByAccessCode: React.FunctionComponent<InterviewsByCodePageProps> = (
    props: InterviewsByCodePageProps
) => {
    const urlSearch = new URLSearchParams(props.location.search);
    const [currentCode, setCurrentCode] = React.useState(props.match.params.accessCode);
    const [createNewIfNoData] = React.useState(_booleish(urlSearch.get('autoCreate')) === true);
    const { state, dispatch } = React.useContext(InterviewContext);
    React.useEffect(() => {
        if (props.match.params.accessCode !== state.responses.accessCode) {
            dispatch({ type: 'update_responses', responses: { accessCode: props.match.params.accessCode } });
        }
    }, [state.responses]);

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
                        {props.t('admin:interviewSearch:SearchByCode')}
                    </button>
                </Link>
            </div>
            <InterviewsComponent autoCreateIfNoData={createNewIfNoData} queryData={urlSearch} />
        </div>
    );
};

export default withTranslation()(InterviewsByAccessCode);
