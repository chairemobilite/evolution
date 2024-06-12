/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import moment from 'moment';
import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import Button from 'chaire-lib-frontend/lib/components/input/Button';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import DatePicker from 'chaire-lib-frontend/lib/components/input/Calendar';

export const RefreshInterviewerCache = (props: WithTranslation) => {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<undefined | string | null>(undefined);
    const [start, setStart] = React.useState(moment().subtract(1, 'weeks'));
    const [end, setEnd] = React.useState(moment());

    const onRefreshMonitoringData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/interviewer/monitoring/update_interviewer_cache', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ start: start.unix(), end: end.unix() })
            });
            if (response.status === 200) {
                await response.json();
                setError(undefined);
            } else if (response.status === 401) {
                setError(props.t(['survey:admin:unauthorized', 'admin:unauthorized']));
            } else {
                setError(props.t(['survey:admin:interviewer:error', 'admin:interviewer:error']));
            }
        } catch (error) {
            setError(props.t(['survey:admin:interviewer:error', 'admin:interviewer:error']));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-widget-container">
            {loading && <LoadingPage />}
            <DatePicker
                id="admin_interviewer_date_from"
                onChange={(s, e) => {
                    setStart(moment(s));
                    setEnd(moment(e));
                }}
                startDate={start.format('YYYY-MM-DD')}
                endDate={end.format('YYYY-MM-DD')}
                dateFormat="YYYY-MM-DD"
                language={props.i18n.language}
            />
            <Button
                label={
                    props.t([
                        'survey:admin:interviewer:refreshInterviewerCache',
                        'admin:interviewer:refreshInterviewerCache'
                    ]) as string
                }
                onClick={(e) => onRefreshMonitoringData()}
                color="blue"
                disabled={!loading}
            />
            {error && <p className="survey-question__error_message">{error}</p>}
            <a href="/interviewer/monitoring/get_interviewer_data">Interviewer data</a>
        </div>
    );
};

export default withTranslation()(RefreshInterviewerCache);
