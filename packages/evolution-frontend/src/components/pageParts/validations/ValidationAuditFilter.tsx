/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';
import { FilterProps } from 'react-table';
import _truncate from 'lodash/truncate';

import { InterviewListAttributes } from 'evolution-common/lib/services/interviews/interview';

/**
 * Textbox input for column filter
 *
 * @param param0 description of the filtered column
 * @returns
 */
export const ValidationAuditFilter = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>({
    t,
    column: { filterValue, setFilter },
    state: { filters }
}: FilterProps<InterviewListAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>> & WithTranslation) => {
    const [options, setOptions] = React.useState<string[]>([]);
    const fetchIdRef = React.useRef(0);

    React.useEffect(() => {
        // Give this fetch an ID
        const fetchId = ++fetchIdRef.current;

        const loadErrors = async () => {
            // Make a query string from the filters
            const dataFilters = {};
            (filters || []).forEach((filter) => {
                if (typeof filter.value === 'string') {
                    dataFilters[filter.id] = filter.value;
                } else if (typeof filter.value === 'object' && filter.value.value !== undefined) {
                    const { value, op } = filter.value;
                    dataFilters[filter.id] = { value, op };
                }
            });

            try {
                const response = await fetch('/api/validation/errors', {
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    method: 'POST',
                    body: JSON.stringify({
                        ...dataFilters
                    })
                });

                if (fetchId !== fetchIdRef.current) {
                    // There was another query since, ignore
                    return;
                }
                if (response.status === 200) {
                    const jsonData = await response.json();
                    const data = (jsonData.errors ? jsonData.errors : []).map((error) => error.key);
                    data.unshift(undefined);
                    setOptions(data);
                } else {
                    console.error('Invalid response code from server: ', response.status);
                }
            } catch (error) {
                console.error(`Error fetching user data from server: ${error}`);
                setOptions([]);
            }
        };
        loadErrors();
        // To cleanup, just update the current ref so the widget won't update upon return
        return () => {
            fetchIdRef.current++;
        };
    }, [filters]);

    return (
        <div style={{ display: 'flex', margin: '2px 0' }}>
            <label htmlFor={'surveyValidation-filter-audit'}>{t('admin:auditErrorFilter:title')}</label>
            <select
                id={'surveyValidation-filter-audit'}
                value={filterValue}
                onChange={(e) => {
                    setFilter(e.target.value || undefined);
                }}
            >
                {options.map((key, i) => (
                    <option key={`validationError_${key}`} value={key}>
                        {key ? _truncate(t(`survey:validations:${key}`), { length: 70 }) : ''}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default withTranslation(['survey', 'admin', 'main'])(ValidationAuditFilter);
