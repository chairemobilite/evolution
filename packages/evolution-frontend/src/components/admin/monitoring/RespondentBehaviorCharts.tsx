/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import Loader from 'react-spinners/HashLoader';
import DropoutAnalysis from './DropoutAnalysis';
import * as Status from 'chaire-lib-common/lib/utils/Status';
import { RespondentBehaviorMetrics } from 'evolution-common/lib/services/paradata/types';

// Main respondent behavior page: fetches metrics once and renders multiple collapsible sections
export const RespondentBehaviorCharts: React.FC = () => {
    const { t } = useTranslation();
    const [metrics, setMetrics] = React.useState<RespondentBehaviorMetrics | undefined>(undefined);
    const [errorKey, setErrorKey] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState<boolean>(true);

    React.useEffect(() => {
        const abortController = new AbortController();
        setLoading(true);
        setErrorKey(null);

        // Fetch the metrics from the API endpoint (single fetch used by all sections)
        fetch('/api/admin/data/widgets/respondent-behavior-metrics', {
            method: 'POST',
            body: JSON.stringify({ refreshCache: false }),
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            signal: abortController.signal
        })
            .then((response) => {
                if (response.status === 200) {
                    return response.json();
                }
                throw new Error(`HTTP ${response.status}`);
            })
            .then((jsonData: Status.Status<RespondentBehaviorMetrics>) => {
                if (Status.isStatusOk(jsonData)) {
                    setMetrics(Status.unwrap(jsonData));
                } else {
                    setErrorKey('admin:monitoring.errors.invalidResponse');
                    console.error(t('admin:monitoring.errors.invalidResponse'), jsonData);
                }
            })
            .catch((err) => {
                if (err.name === 'AbortError') return;
                setErrorKey('admin:monitoring.errors.fetchError');
                console.error(t('admin:monitoring.errors.fetchError'), err);
            })
            .finally(() => {
                if (!abortController.signal.aborted) setLoading(false);
            });

        return () => abortController.abort();
    }, []);

    return (
        <section className="monitoring-section">
            <h2>{t('admin:monitoring.RespondentBehavior.sectionTitle')}</h2>

            {errorKey ? (
                <div className="monitoring-error">{t(errorKey)}</div>
            ) : loading ? (
                <div className="monitoring-loading-container">
                    <Loader size={'30px'} color={'#aaaaaa'} loading={true} />
                </div>
            ) : (
                <div className="monitoring-charts-container">
                    {/* Each section is a collapsible <details>. Add more sections here as needed. */}

                    {/* Drop-out analysis section */}
                    {metrics && <DropoutAnalysis data={metrics} />}

                    {/* Future sections: e.g., "Response Time Analysis", "Interaction Heatmap", etc. */}
                </div>
            )}
        </section>
    );
};
