/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { faTriangleExclamation, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AuditForObject } from 'evolution-common/lib/services/audits/types';

export interface AuditDisplayProps {
    audits?: AuditForObject[];
    ignoreAudit?: (errorCode: string) => void;
    showAuditErrorCode?: boolean;
    hideInfoAudits?: boolean;
}

const AuditDisplay = ({
    audits,
    ignoreAudit: _ignoreAudit,
    showAuditErrorCode,
    hideInfoAudits = true
}: AuditDisplayProps) => {
    const { t } = useTranslation(['admin', 'audits']);
    const auditMessages: React.ReactNode[] = [];
    const items = audits ?? [];
    for (let i = 0, countI = items.length; i < countI; i++) {
        const audit = items[i];
        if (audit.ignore !== true && (!hideInfoAudits || (hideInfoAudits && audit.level !== 'info'))) {
            auditMessages.push(
                <p
                    key={`${audit.level || 'error'}_${audit.errorCode}_${i + 1}`}
                    className={`_audit-${audit.level || 'error'} _strong`}
                >
                    <FontAwesomeIcon
                        icon={audit.level === 'info' ? faCircleInfo : faTriangleExclamation}
                        className="faIconLeft"
                    />
                    {showAuditErrorCode ? audit.errorCode : t(`audits:${audit.errorCode}`)}
                    {/* •&nbsp; // TODO: add ignore audit implementation in backend
                    <a href="#" onClick={(e) => {
                        e.preventDefault();
                        ignoreAudit(errorCode);
                    }}>{t('surveyAdmin:Ignore')}
                </a>*/}
                </p>
            );
        }
    }

    return (
        <React.Fragment>
            <div className="admin-errors-container">{auditMessages}</div>
        </React.Fragment>
    );
};

export default AuditDisplay;
