/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import Loader from 'react-spinners/HashLoader';
import { InterviewContext } from '../../../contexts/InterviewContext';
import { useNavigate } from 'react-router';

const InterviewsCreateNew: React.FunctionComponent = () => {
    const [inProgress, setInProgress] = React.useState(false);
    const { state, dispatch } = React.useContext(InterviewContext);
    const navigate = useNavigate();

    // Function to fetch data from the server, with paging and filtering
    const createUser = React.useCallback(async () => {
        if (inProgress || state.status !== 'creating') {
            return;
        }

        // Set in progress state
        setInProgress(true);

        // Make a query string from the filters
        try {
            const response = await fetch('/api/interviews/createNew', {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                method: 'POST',
                body: JSON.stringify({
                    createUser: state.username,
                    responses: state.responses
                })
            });

            if (response.status === 200) {
                const jsonData = await response.json();
                if (jsonData.interviewUuid) {
                    navigate(`/survey/edit/${jsonData.interviewUuid}/`, { replace: true });
                    dispatch({ type: 'success', interviewUuid: jsonData.interviewUuid });
                    return;
                }
                console.log('Server did not return a proper interview id', jsonData);
                // Goto proper error page
            }
            // TODO Go to proper status code page
            console.log('Bad response code from server', response.status);
        } catch (error) {
            // TODO Go to proper error page
            console.error(`Error fetching user data from server: ${error}`);
        }

        // Cancel in progress state, only if the page was not redirected
        setInProgress(false);
    }, []);

    React.useEffect(() => {
        createUser();
    }, []);

    return (
        <div className="admin">
            {inProgress && <Loader size={30} color={'#aaaaaa'} loading={true} />}
            {!inProgress && 'error'}
        </div>
    );
};

/** Component used to create new interviews by users other than the main user */
export default InterviewsCreateNew;
