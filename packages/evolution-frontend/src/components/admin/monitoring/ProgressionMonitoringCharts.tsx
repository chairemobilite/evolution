/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SingleValueMonitoringChart } from './SingleValueMonitoringChart';

// Progression section containing various charts and indicators about survey progression
export const ProgressionMonitoringCharts: React.FC = () => {
    const { t } = useTranslation();

    return (
        <section className="monitoring-section">
            <h2>{t('admin:monitoring.ProgressionSection')}</h2>
            <div className="monitoring-charts-container">
                <SingleValueMonitoringChart
                    apiUrl="/api/admin/data/widgets/interviews-completion-rate"
                    valueName="interviewsCompletionRate"
                    valueTitle={t('admin:monitoring.CompletionRate')}
                    valueUnit="%"
                />
                <SingleValueMonitoringChart
                    apiUrl="/api/admin/data/widgets/started-interviews-count"
                    valueName="startedInterviewsCount"
                    valueTitle={t('admin:monitoring.InterviewsStarted')}
                />
                <SingleValueMonitoringChart
                    apiUrl="/api/admin/data/widgets/completed-interviews-count"
                    valueName="completedInterviewsCount"
                    valueTitle={t('admin:monitoring.InterviewsCompleted')}
                />
            </div>
        </section>
    );
};
