/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';
import { FilterProps } from 'react-table';

import { InterviewListAttributes } from 'evolution-common/lib/services/interviews/interview';

/**
 * Textbox input for column filter
 *
 * @param param0 description of the filtered column
 * @returns
 */
export const ValidityColumnFilter: React.FunctionComponent<FilterProps<InterviewListAttributes> & WithTranslation> = ({
    t,
    column: { filterValue, setFilter }
}) => {
    // Pre-fixed list of validity options
    const options = React.useMemo(() => ['all', 'invalid', 'valid', 'notValidated', 'notInvalid'], []);

    return (
        <div>
            <label htmlFor={'surveyValidation-filter-validity'}>{t('admin:validationFilters:title')}</label>
            <select
                id={'surveyValidation-filter-validity'}
                value={filterValue}
                onChange={(e) => {
                    setFilter(e.target.value || undefined);
                }}
            >
                {options.map((key, i) => (
                    <option key={`validitySeletion_${key}`} value={key}>
                        {t(`admin:validationFilters:${key}`)}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default withTranslation(['admin', 'main'])(ValidityColumnFilter);