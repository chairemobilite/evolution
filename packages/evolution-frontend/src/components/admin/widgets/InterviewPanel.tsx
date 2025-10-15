/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import AuditDisplay from '../AuditDisplay';

export interface InterviewPanelProps {
    interview: Interview;
    audits?: AuditForObject[];
    showAuditErrorCode?: boolean;
}

export const InterviewPanel = ({ interview, audits, showAuditErrorCode }: InterviewPanelProps) => {
    const { t } = useTranslation(['admin']);

    const formattedTripsDate = interview.assignedDate ? moment(interview.assignedDate).format('LL') : '-';

    const languages = interview.paradata?.languages || [];
    const formattedLanguages = languages.map((language) => language.language || '?').join('|') || '?';

    return (
        <div className="admin__interview-stats" key="interview">
            <details open={true}>
                <summary>
                    <h4 style={{ display: 'inline', margin: 0 }}>{t('Interview')}</h4>
                </summary>
                <span className="_widget">
                    {t('interviewStats.labels.uuid')}: <span className="_strong">{interview.uuid}</span>
                </span>
                <span className="_widget">
                    {t('interviewStats.labels.accessCode')}:{' '}
                    <span className="_strong">{interview.accessCode || t('survey:None')}</span>
                </span>
                <span className="_widget">
                    {t(`interviewStats.labels.interviewLanguage${languages.length > 1 ? 's' : ''}`)}:{' '}
                    <span className="_strong">{formattedLanguages}</span>
                </span>
                <span className="_widget">
                    {t('interviewStats.labels.travelDate')}: <span className="_strong">{formattedTripsDate}</span>
                </span>
                {audits && audits.length > 0 && (
                    <AuditDisplay audits={audits} showAuditErrorCode={showAuditErrorCode} />
                )}
            </details>
        </div>
    );
};
