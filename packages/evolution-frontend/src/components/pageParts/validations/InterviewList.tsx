/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// eslint gives error about missing key prop in tr, th, etc, but the key is part of the element's props */
/* eslint-disable react/jsx-key */

import React from 'react';
import { useTable, usePagination, useFilters, useSortBy } from 'react-table';
import { WithTranslation, withTranslation } from 'react-i18next';
import { InterviewStatusAttributesBase } from 'evolution-common/lib/services/interviews/interview';
import { LoadingPage } from 'chaire-lib-frontend/lib/components/pages';
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons/faSyncAlt';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface UsersTableProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> extends WithTranslation {
    columns: any[];
    data: InterviewStatusAttributesBase<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>[];
    fetchData: ({ pageSize, pageIndex, filters }: any) => void;
    loading: boolean;
    pageCount: number;
    itemCount: number;
    initialSortBy: { id: string; desc?: boolean }[];
}

// User react-table to handle a few table functionalities like paging and filtering
const InterviewList = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    props: UsersTableProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
) => {
    const {
        getTableProps,
        prepareRow,
        headerGroups,
        page,
        canPreviousPage,
        canNextPage,
        pageOptions,
        pageCount,
        gotoPage,
        nextPage,
        previousPage,
        setPageSize,
        // Get the state from the instance
        state: { pageIndex, pageSize, filters, sortBy }
    } = useTable(
        {
            columns: props.columns,
            data: props.data,
            initialState: { pageIndex: 0, pageSize: 100, sortBy: props.initialSortBy },
            // We are handling our own pagination by the server queries, we don't have all the data loaded at once
            manualPagination: true,
            // Filters are also handled manually by the query to the server
            manualFilters: true,
            // Sort handled by the query to the server
            manualSortBy: true,
            pageCount: props.pageCount
        },
        useFilters,
        useSortBy,
        usePagination
    );

    // Listen for changes in pagination and filters and use the state to fetch our new data
    React.useEffect(() => {
        props.fetchData({ pageIndex, pageSize, filters, sortBy });
    }, [props.fetchData, pageIndex, pageSize, filters, sortBy]);

    return props.loading ? (
        <div className="admin-widget-container">
            <LoadingPage />
        </div>
    ) : (
        <div style={{ flexDirection: 'row', flex: '0 0 auto' }}>
            <div className={'admin-widget-container _overflow-scroll'}>
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        props.fetchData({ pageIndex, pageSize, filters, sortBy });
                    }}
                    title={props.t('admin:refreshValidationList')}
                >
                    <FontAwesomeIcon icon={faSyncAlt} />
                </a>
                {headerGroups.map((headerGroup, i) => (
                    <div {...headerGroup.getHeaderGroupProps()}>
                        {headerGroup.headers.map((column, j) =>
                            column.Filter ? <div key={`columnHeader_${i}${j}`}>{column.render('Filter')}</div> : null
                        )}
                    </div>
                ))}
                <ul className="_small" {...getTableProps()}>
                    {page.map((row) => {
                        prepareRow(row);
                        return (
                            <li
                                title={row.original.uuid}
                                className={`${
                                    row.original.is_valid === true && row.original.is_completed === true
                                        ? '_dark-green _strong'
                                        : ''
                                }
                                    ${
                            row.original.is_validated === true &&
                                        row.original.is_valid === true &&
                                        row.original.is_completed === true
                                ? '_green _strong _active-background'
                                : ''
                            }
                                    ${
                            row.original.is_valid === true && !row.original.is_completed === true
                                ? '_orange _strong'
                                : ''
                            }
                                    ${row.original.is_valid === false ? '_dark-red _strong' : ''}`}
                                {...row.getRowProps()}
                            >
                                {row.cells.map((cell, index) => {
                                    return (
                                        <span {...cell.getCellProps()}>
                                            {index > 0 ? ' • ' : ''}
                                            {cell.render('Cell')}
                                        </span>
                                    );
                                })}
                            </li>
                        );
                    })}
                </ul>
            </div>
            <div className="admin-widget-container pagination">
                <span>{props.t('main:ShowingNofX', { n: page.length, x: props.itemCount })}</span>
                <br />
                <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
                    {'<<'}
                </button>{' '}
                <button onClick={() => previousPage()} disabled={!canPreviousPage}>
                    {'<'}
                </button>{' '}
                <button onClick={() => nextPage()} disabled={!canNextPage}>
                    {'>'}
                </button>{' '}
                <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
                    {'>>'}
                </button>{' '}
                <span>{props.t('main:PageNofX', { n: pageIndex + 1, x: pageOptions.length })}</span>
                <span>
                    | {props.t('main:GoToPage')}:{' '}
                    <input
                        type="number"
                        defaultValue={pageIndex + 1}
                        onBlur={(e) => {
                            const page = e.target.value ? Number(e.target.value) - 1 : 0;
                            gotoPage(page);
                        }}
                        style={{ width: '100px' }}
                    />
                </span>{' '}
                <select
                    value={pageSize}
                    onChange={(e) => {
                        setPageSize(Number(e.target.value));
                    }}
                >
                    {[100, 200, 300, 400, 500].map((pageSize) => (
                        <option key={pageSize} value={pageSize}>
                            {props.t('main:ShowN', { n: pageSize })}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default withTranslation('main')(InterviewList);
