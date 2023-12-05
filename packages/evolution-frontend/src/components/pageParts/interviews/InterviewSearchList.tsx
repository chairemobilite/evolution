/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';

import Interview from './InterviewSearchResult';
import { InterviewContext } from '../../../contexts/InterviewContext';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import InterviewsCreateLink from './InterviewsCreateLink';

type InterviewSearchListProps = {
    autoCreateIfNoData: boolean;
    queryData: URLSearchParams;
};

const InterviewSearchList: React.FunctionComponent<InterviewSearchListProps & WithTranslation> = (
    props: InterviewSearchListProps & WithTranslation
) => {
    const [data, setData] = React.useState<{ [key: string]: any }[]>([]);
    const [loading, setLoading] = React.useState(false);
    const { state, dispatch } = React.useContext(InterviewContext);
    const fetchIdRef = React.useRef(0);

    // Function to fetch data from the server, with paging and filtering
    const fetchData = React.useCallback(
        async (accessCode: string) => {
            // Give this fetch an ID
            const fetchId = ++fetchIdRef.current;

            // Set the loading state
            setLoading(true);

            // Make a query string from the filters

            try {
                const response = await fetch(`/api/interviews/interviewByCode?accessCode=${accessCode}`);
                if (fetchId !== fetchIdRef.current) {
                    // There was another query since, ignore
                    return;
                }
                if (response.status === 200) {
                    const jsonData = await response.json();
                    if (jsonData.interviews) {
                        setData(jsonData.interviews);
                        if (
                            !_isBlank(accessCode) &&
                            jsonData.interviews.length === 0 &&
                            props.autoCreateIfNoData &&
                            state.status !== 'creating'
                        ) {
                            // automatically create new interview with this access code
                            dispatch({
                                type: 'createNew',
                                username: `telephone_${(Math.ceil(Math.random() * 8999) + 1000).toString()}`,
                                queryData: props.queryData
                            });
                        }
                    }
                } else {
                    console.error('Invalid response code from server: ', response.status);
                }
            } catch (error) {
                console.error(`Error fetching user data from server: ${error}`);
                setData([]);
            } finally {
                if (fetchId === fetchIdRef.current) {
                    setLoading(false);
                }
            }
        },
        [state.status]
    );

    React.useEffect(() => {
        fetchData(state.responses.accessCode);
    }, [state.responses]);

    // TODO This is very specific to the interviewer use case, generalize it and use a function to generate username, maybe as prop
    return (
        <ul className="interview">
            {data.map((interview) => (
                <Interview key={interview.uuid} interview={interview} />
            ))}
            <InterviewsCreateLink queryData={props.queryData} />
        </ul>
    );
};

export default withTranslation(['admin', 'main'])(InterviewSearchList);
