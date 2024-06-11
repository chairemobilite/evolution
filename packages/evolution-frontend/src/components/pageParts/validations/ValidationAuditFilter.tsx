/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';
import { FilterProps } from 'react-table';
import _cloneDeep from 'lodash/cloneDeep';
//import _truncate from 'lodash/truncate';
import Select from 'react-select';

import { AuditsByLevelAndObjectType } from 'evolution-common/lib/services/audits/types';
import { InterviewListAttributes } from 'evolution-common/lib/services/interviews/interview';

const auditLevels = ['error', 'warning', 'info'];

type OptionType = {
    value: string;
    label: string;
};

type GroupType = {
    label: string; // group label
    options: OptionType[];
};

const objectTypesSortOrder = ['interview', 'home', 'household', 'person', 'visitedPlace', 'trip', 'segment'];

/**
 * Textbox input for column filter
 *
 * @param param0 description of the filtered column
 * @returns
 */
export const ValidationAuditFilter = ({
    t,
    column: { filterValue, setFilter },
    state: { filters }
}: FilterProps<InterviewListAttributes> & WithTranslation) => {
    const [auditStats, setAuditStats] = React.useState<AuditsByLevelAndObjectType>({});
    const fetchIdRef = React.useRef(0);

    React.useEffect(() => {
        // Give this fetch an ID
        const fetchId = ++fetchIdRef.current;

        const loadAuditStats = async () => {
            // Make a query string from the filters
            const dataFilters = {};
            (filters || []).forEach((filter) => {
                if (typeof filter.value === 'string') {
                    dataFilters[filter.id] = filter.value;
                } else if (typeof filter.value === 'object' && filter.value.value !== undefined) {
                    const { value, op } = filter.value;
                    dataFilters[filter.id] = { value, op };
                } else if (Array.isArray(filter.value)) {
                    dataFilters[filter.id] = filter.value;
                }
            });
            try {
                const response = await fetch('/api/validation/auditStats', {
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
                    const auditStats: AuditsByLevelAndObjectType = jsonData.auditStats;
                    //data.unshift(undefined);
                    setAuditStats(auditStats);
                } else {
                    console.error('Invalid response code from server: ', response.status);
                }
            } catch (error) {
                console.error(`Error fetching user data from server: ${error}`);
                setAuditStats({});
            }
        };
        loadAuditStats();
        // To cleanup, just update the current ref so the widget won't update upon return
        return () => {
            fetchIdRef.current++;
        };
    }, [filters]);

    const auditFilterSelects: JSX.Element[] = [];
    const selectedAuditKeyByLevel: { [level: string]: string[] } = {};
    const selectedAuditChoicesByLevel: { [level: string]: OptionType[] } = {};

    for (const level of auditLevels) {
        const auditsByObjectType = auditStats[level] || {};
        selectedAuditChoicesByLevel[level] = [];
        selectedAuditKeyByLevel[level] = [];
        const groupedChoices: GroupType[] = [];

        for (let i = 0, countI = objectTypesSortOrder.length; i < countI; i++) {
            const objectType = objectTypesSortOrder[i];
            const choices: OptionType[] = [];
            const audits = auditsByObjectType[objectType] || [];
            for (let j = 0, countJ = audits.length; j < countJ; j++) {
                const audit = audits[j];
                const choice = {
                    value: audit.key,
                    label: `• ${t([`survey:validations:${audit.key}`, `surveyAdmin:${audit.key}`])} [${audit.cnt}]`
                };
                if (filterValue && filterValue.includes(audit.key)) {
                    selectedAuditChoicesByLevel[level].push(choice);
                    selectedAuditKeyByLevel[level].push(audit.key);
                }
                choices.push(choice);
            }
            groupedChoices.push({
                label: t(`admin:auditObjectTypes:${objectType}`),
                options: choices
            });
        }
        auditFilterSelects.push(
            <div key={level}>
                <label htmlFor={`surveyValidation-filter-audit-level-${level}`}>
                    {t(`admin:auditLevels:${level}`)}
                </label>
                <Select
                    styles={{
                        option: (baseStyles, state) => ({
                            ...baseStyles,
                            paddingTop: 0,
                            paddingBottom: 0
                        })
                    }}
                    defaultValue={undefined}
                    isMulti
                    value={selectedAuditChoicesByLevel[level]}
                    onChange={(newValue) => {
                        const existingFilter = _cloneDeep(selectedAuditKeyByLevel);
                        const newFilterValue = (newValue || []).map((v) => v.value);
                        existingFilter[level] = newFilterValue;
                        const newFilter: string[] = [];
                        for (const level of auditLevels) {
                            newFilter.push(...existingFilter[level]);
                        }
                        setFilter(newFilter);
                    }}
                    name={`surveyValidation-filter-audit-level-${level}`}
                    options={groupedChoices}
                    className="basic-multi-select"
                    classNamePrefix={t('admin:Select')}
                />
            </div>
        );
    }

    return <React.Fragment>{auditFilterSelects}</React.Fragment>;
};

export default withTranslation(['survey', 'admin', 'main'])(ValidationAuditFilter);
