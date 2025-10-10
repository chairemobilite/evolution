/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SingleValueMonitoringChart } from './SingleValueMonitoringChart';

// Respondent burdens section containing various charts and indicators about survey respondent burdens
export const RespondentBurdensMonitoringCharts: React.FC = () => {
    const { t } = useTranslation();

    return (
        <section className="monitoring-section">
            <h2>{t('admin:monitoring.RespondentBurdensSection')}</h2>
            <div className="monitoring-charts-container">
                <SingleValueMonitoringChart
                    apiUrl="/api/admin/data/widgets/median-survey-duration"
                    valueName="medianSurveyDuration"
                    valueTitle={t('admin:monitoring.MedianSurveyDuration')}
                    valueUnit="minutes"
                />
                <SingleValueMonitoringChart
                    apiUrl="/api/admin/data/widgets/estimated-median-survey-duration"
                    valueName="estimatedMedianSurveyDuration"
                    valueTitle={t('admin:monitoring.EstimatedMedianSurveyDuration')}
                    valueUnit="minutes"
                />
                <SingleValueMonitoringChart
                    apiUrl="/api/admin/data/widgets/average-survey-interest"
                    valueName="averageSurveyInterest"
                    valueTitle={t('admin:monitoring.AverageSurveyInterest')}
                    valueUnit="%"
                />
                <SingleValueMonitoringChart
                    apiUrl="/api/admin/data/widgets/average-survey-difficulty"
                    valueName="averageSurveyDifficulty"
                    valueTitle={t('admin:monitoring.AverageSurveyDifficulty')}
                    valueUnit="%"
                />
                <SingleValueMonitoringChart
                    apiUrl="/api/admin/data/widgets/survey-duration-perception"
                    valueName="surveyDurationPerception"
                    valueTitle={t('admin:monitoring.SurveyDurationPerception')}
                    valueUnit="%"
                />
                <SingleValueMonitoringChart
                    apiUrl="/api/admin/data/widgets/survey-difficulty"
                    valueName="surveyDifficulty"
                    valueTitle={t('admin:monitoring.SurveyDifficulty')}
                    valueUnit="%"
                />
                <SingleValueMonitoringChart
                    apiUrl="/api/admin/data/widgets/survey-demandingness"
                    valueName="surveyDemandingness"
                    valueTitle={t('admin:monitoring.SurveyDemandingness')}
                    valueUnit="%"
                />
            </div>
        </section>
    );
};
