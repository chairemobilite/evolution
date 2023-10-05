/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';
import { FilterProps } from 'react-table';
import _isEqual from 'lodash/isEqual';

import { InterviewListAttributes } from 'evolution-common/lib/services/interviews/interview';

/**
 * Textbox input for accepts to be recontacted filter
 *
 * @param param0 description of the filtered column
 * @returns
 */
export const InterviewByAcceptsRecontactFilter = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>({
    t,
    column: { filterValue, setFilter }
}: FilterProps<InterviewListAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>> & WithTranslation) => {
    const options = React.useMemo(() => ({ all: undefined, true: 'true', false: { value: null } }), []);
    const currentSelection = Object.keys(options).find((key) => _isEqual(filterValue, options[key]));

    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <label htmlFor={'surveyValidation-filter-acceptsRecontact'}>
                {t('admin:interviewByAcceptsRecontactFilter:title')}
            </label>
            <select
                id={'surveyValidation-filter-acceptsRecontact'}
                value={currentSelection}
                onChange={(e) => {
                    setFilter(options[e.target.value] || undefined);
                }}
            >
                {Object.keys(options).map((key, i) => (
                    <option key={`interviewAcceptsRecontact_${key}`} value={key}>
                        {t(`admin:interviewByAcceptsRecontactFilter:${key}`)}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default withTranslation(['admin', 'main'])(InterviewByAcceptsRecontactFilter);
