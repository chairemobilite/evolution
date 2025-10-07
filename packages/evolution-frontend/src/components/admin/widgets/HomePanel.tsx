/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import AuditDisplay from '../AuditDisplay';

export interface HomePanelProps {
    home?: Home;
    audits?: AuditForObject[];
    showAuditErrorCode?: boolean;
}

export const HomePanel = ({ home, audits, showAuditErrorCode }: HomePanelProps) => {
    const { t } = useTranslation(['admin']);

    if (!home) {
        return (
            <div className="admin__interview-stats" key="home">
                <details open={true}>
                    <summary>
                        <h4 style={{ display: 'inline', margin: 0 }}>{t('Home')}</h4>
                    </summary>
                    <span className="_widget _red">{t('survey:homeNotAvailable')}</span>
                </details>
            </div>
        );
    }

    const homeAddress =
        home.address?.fullAddress ||
        `${home.address?.municipalityName || ''} ${home.address?.region || ''} ${home.address?.country || ''} ${home.address?.postalCode || ''}`.trim() ||
        '';

    return (
        <div className="admin__interview-stats" key="home">
            <details open={true}>
                <summary>
                    <h4 style={{ display: 'inline', margin: 0 }}>{t('Home')}</h4>
                </summary>
                <span className="_widget">
                    <span className="_strong">
                        {homeAddress}{' '}
                        {home.address?.unitNumber
                            ? t('interviewStats.labels.unnitNumber') + home.address?.unitNumber
                            : ''}{' '}
                        {home.address?.municipalityName ? home.address?.municipalityName : ''}
                    </span>
                </span>
                {audits && audits.length > 0 && (
                    <AuditDisplay audits={audits} showAuditErrorCode={showAuditErrorCode} />
                )}
            </details>
        </div>
    );
};
