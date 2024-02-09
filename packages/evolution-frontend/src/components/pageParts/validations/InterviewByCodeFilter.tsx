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
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons/faCheckCircle';

import { InterviewListAttributes } from 'evolution-common/lib/services/interviews/interview';
import InputString from 'chaire-lib-frontend/lib/components/input/InputString';
import InputButton from 'chaire-lib-frontend/lib/components/input/Button';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

/**
 * Textbox input for access code filter
 *
 * @param param0 description of the filtered column
 * @returns
 */
export const InterviewByCodeFilter = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>({
    t,
    column: { filterValue, setFilter }
}: FilterProps<InterviewListAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>> & WithTranslation) => {
    const [currentValue, setCurrentValue] = React.useState(
        !_isBlank(filterValue) && filterValue.value ? filterValue.value : filterValue
    );

    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <label htmlFor={'accessCodeSearchInput'}>{t('admin:interviewByCodeFilter:title')}</label>
            <InputString
                id="accessCodeSearchInput"
                value={currentValue}
                onValueUpdated={(newValue) => setCurrentValue(newValue.value)}
            />
            <InputButton
                onClick={() => setFilter(!_isBlank(currentValue) ? { value: currentValue, op: 'eq' } : currentValue)}
                icon={faCheckCircle}
                label=""
                size="small"
                title={t('admin:interviewByCodeFilter:button')}
            />
        </div>
    );
};

export default withTranslation(['admin', 'main'])(InterviewByCodeFilter);
