/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUser, faCar, faDollarSign } from '@fortawesome/free-solid-svg-icons';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import AuditDisplay from '../AuditDisplay';

export interface HouseholdPanelProps {
    household?: Household;
    audits?: AuditForObject[];
    showAuditErrorCode?: boolean;
}

export const HouseholdPanel = ({ household, audits, showAuditErrorCode }: HouseholdPanelProps) => {
    const { t } = useTranslation(['admin']);

    if (!household) {
        return (
            <div className="admin__interview-stats" key="household">
                <details open={true}>
                    <summary>
                        <h4 style={{ display: 'inline', margin: 0 }}>{t('Household')}</h4>
                    </summary>
                    <span className="_widget _red">{t('interviewStats.errors.householdNotAvailable')}</span>
                </details>
            </div>
        );
    }

    return (
        <div className="admin__interview-stats" key="household">
            <details open={true}>
                <summary>
                    <h4 style={{ display: 'inline', margin: 0 }}>{t('Household')}</h4>
                </summary>
                <span className="_widget">
                    <FontAwesomeIcon icon={faCircleUser} className="faIconLeft" />
                    {household.size}
                </span>
                <span className="_widget">
                    <FontAwesomeIcon icon={faCar} className="faIconLeft" />
                    {household.carNumber}
                </span>
                <span className="_widget">
                    <FontAwesomeIcon icon={faDollarSign} className="faIconLeft" />
                    {household.incomeLevel}
                </span>
                {audits && audits.length > 0 && (
                    <AuditDisplay audits={audits} showAuditErrorCode={showAuditErrorCode} />
                )}
            </details>
        </div>
    );
};
