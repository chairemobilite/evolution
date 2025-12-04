/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { RespondentBehaviorMetrics } from 'evolution-common/lib/services/paradata/types';

type Props = {
    data: RespondentBehaviorMetrics;
};

const IncompleteInterviewsLastAction: React.FC<Props> = ({ data }) => {
    const { t } = useTranslation();
    const incompleteInterviewsLastEventCounts = data.incompleteInterviewsLastActionCounts || [];

    return (
        <section className="monitoring-chart-container admin-widget-container">
            <h3>{t('admin:monitoring.RespondentBehavior.IncompleteInterviewsLastActions')}</h3>
            {incompleteInterviewsLastEventCounts.length > 0 ? (
                <div className="monitoring-table-container">
                    <table className="monitoring-table">
                        <thead>
                            <tr>
                                <th>{t('admin:monitoring.RespondentBehavior.EventType')}</th>
                                <th>{t('admin:monitoring.RespondentBehavior.Count')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {incompleteInterviewsLastEventCounts.map((row, idx) => (
                                <tr key={idx}>
                                    <td>{t(`admin:monitoring.RespondentBehavior.eventTypes.${row.eventType}`)}</td>
                                    <td>{row.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="monitoring-no-data">{t('admin:monitoring.RespondentBehavior.NoData')}</div>
            )}
        </section>
    );
};

export const DropoutAnalysis: React.FC<Props> = ({ data }) => {
    const { t } = useTranslation();

    return (
        <details className="monitoring-collapsible" open>
            <summary className="monitoring-collapsible__summary">
                {t('admin:monitoring.RespondentBehavior.DropoutAnalysis')}
            </summary>

            <div className="monitoring-collapsible__content">
                {/* Primary table: last action event by participants counts for incomplete interviews */}
                <IncompleteInterviewsLastAction data={data} />

                {/* Add other widgets here */}
            </div>
        </details>
    );
};

export default DropoutAnalysis;
