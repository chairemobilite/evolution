/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
// import { SingleValueMonitoringChart } from './SingleValueMonitoringChart';
import { HorizontalBarMonitoringChart } from './HorizontalBarMonitoringChart';

// Respondent burdens section containing various charts and indicators about survey respondent burdens
export const RespondentBurdensMonitoringCharts: React.FC = () => {
    const { t } = useTranslation();
    return (
        <section className="monitoring-section">
            <h2>{t('admin:monitoring.RespondentBurdenSection')}</h2>
            <div className="monitoring-charts-container">
                {/* TODO: Do a survey duration distribution */}
                {/* TODO: Do a estimated duration distribution or difference (?) */}
                {/* TODO: Do a survey demandingness distribution */}
                {/* TODO: Do a survey interest distribution */}
                {/* TODO: Do a survey duration perception distribution */}
                <HorizontalBarMonitoringChart
                    apiUrl="/api/admin/data/widgets/survey-difficulty-distribution"
                    chartTitle={t('admin:monitoring.SurveyDifficultyChartTitle')}
                    xAxisTitle={t('admin:monitoring.DistributionTitle')}
                    yAxisTitle={t('admin:monitoring.SurveyDifficultyYAxisTitle')}
                />
            </div>
        </section>
    );
};
