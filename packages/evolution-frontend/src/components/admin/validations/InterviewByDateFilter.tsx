/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';
import { FilterProps } from 'react-table';

import { InterviewListAttributes } from 'evolution-common/lib/services/questionnaire/types';
import DatePicker from 'react-datepicker';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

/**
 * Date picker input for interview creation date filter
 */
export const InterviewByDateFilter = ({
    t,
    column: { filterValue, setFilter }
}: FilterProps<InterviewListAttributes> & WithTranslation) => {
    const [startDate, setStartDate] = React.useState<Date | null>(
        !_isBlank(filterValue) && filterValue.value && filterValue.value.length === 2
            ? new Date(filterValue.value[0] * 1000)
            : null
    );
    const [endDate, setEndDate] = React.useState<Date | null>(
        !_isBlank(filterValue) && filterValue.value && filterValue.value.length === 2
            ? new Date(filterValue.value[1] * 1000) // Filter dates are saved in seconds, but JavaScript expects dates in ms.
            : null
    );

    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <label htmlFor={'interviewDateSearchInput'}>{t('admin:interviewByDateFilter:title')}</label>
            <DatePicker
                className={'apptr__form-input input-date-picker input-large'}
                shouldCloseOnSelect={false}
                disabledKeyboardNavigation // Otherwise current day of month always looks selected, which is confusing
                isClearable
                selectsRange={true}
                dateFormat="yyyy-MM-dd"
                selected={startDate}
                startDate={startDate}
                endDate={endDate}
                onChange={(dates) => {
                    if (_isBlank(dates)) {
                        setStartDate(null);
                        setEndDate(null);
                        setFilter(null);
                        return;
                    }

                    const [start, end] = dates;
                    setStartDate(start);
                    setEndDate(end);
                    if (!_isBlank(start) && !_isBlank(end)) {
                        start!.setHours(0, 0, 0); // Start of day
                        end!.setHours(23, 59, 59); // End of day

                        // JavasScript dates are given in milliseconds, but the database filters expect seconds.
                        setFilter({ value: [Math.floor(start!.valueOf() / 1000), Math.floor(end!.valueOf() / 1000)] });
                    } else if (_isBlank(start) && _isBlank(end)) {
                        setFilter(null);
                    } else {
                        // if we only have one of the dates, do nothing. Wait until we get the full date range to apply filter.
                    }
                }}
                placeholderText={t('admin:interviewByDateFilter:placeholder')}
            />
        </div>
    );
};

export default withTranslation(['admin', 'main'])(InterviewByDateFilter);
