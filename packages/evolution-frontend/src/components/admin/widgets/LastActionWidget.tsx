/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

export interface LastActionWidgetProps {
    lastAction?: string;
}

/**
 * Review-summary label for how a geography point was set.
 * @param lastAction - Geography `properties.lastAction`
 */
export const LastActionWidget = ({ lastAction }: LastActionWidgetProps) => {
    const { t } = useTranslation(['admin']);

    if (!lastAction) {
        return null;
    }

    // Stored value stays `copy`; the admin label names the usual-place clone.
    const displayAction = lastAction === 'copy' ? 'clonedFromUsualPlace' : lastAction;

    return (
        <span className="_widget">
            {t('interviewStats.labels.lastAction')}:{' '}
            <span className="_strong">
                {t(`interviewStats.labels.lastActionValues.${displayAction}`, displayAction)}
            </span>
        </span>
    );
};
