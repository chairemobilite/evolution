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
import type { ObjectReviewHandlers } from '../validations/objectReviewHandlers';
import { SurveyObjectBox } from './SurveyObjectBox';

export interface HouseholdPanelProps {
    household?: Household;
    audits?: AuditForObject[];
    showAuditErrorCode?: boolean;
    objectReviewHandlers?: ObjectReviewHandlers;
    /** Rejected styling inherited from a rejected interview ancestor (display only). */
    inheritedRejected?: boolean;
}

export const HouseholdPanel = ({
    household,
    audits,
    showAuditErrorCode,
    objectReviewHandlers,
    inheritedRejected = false
}: HouseholdPanelProps) => {
    const { t } = useTranslation(['admin']);

    if (!household) {
        return (
            <div className="admin__interview-stats" key="household">
                <details open={true} className="admin__survey-object-box">
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
            <SurveyObjectBox
                as="details"
                defaultOpen
                objectType="household"
                objectUuid={household._uuid}
                objectReviewHandlers={objectReviewHandlers}
                inheritedRejected={inheritedRejected}
                summary={
                    <summary>
                        <h4 style={{ display: 'inline', margin: 0 }}>{t('Household')}</h4>
                    </summary>
                }
            >
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
            </SurveyObjectBox>
        </div>
    );
};
