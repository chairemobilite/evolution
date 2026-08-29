/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FilterProps } from 'react-table';

import { InterviewListAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { interviewListStatusFilterValues } from 'evolution-common/lib/services/reviews/types';

/**
 * Dropdown filtering the interview list on the interview-level review status.
 *
 * @param param0 description of the filtered column
 * @returns
 */
export const ReviewStatusColumnFilter = ({
    column: { filterValue, setFilter }
}: FilterProps<InterviewListAttributes>) => {
    const { t } = useTranslation('admin');

    return (
        <div style={{ display: 'flex', margin: '2px 0' }}>
            <label htmlFor={'surveyValidation-filter-reviewStatus'}>{t('admin:reviewStatusFilters:title')}</label>
            <select
                id={'surveyValidation-filter-reviewStatus'}
                value={filterValue}
                onChange={(e) => {
                    setFilter(e.target.value || undefined);
                }}
            >
                {interviewListStatusFilterValues.map((key) => (
                    <option key={`reviewStatusSelection_${key}`} value={key}>
                        {t(`admin:reviewStatusFilters:${key}`)}
                    </option>
                ))}
            </select>
        </div>
    );
};
