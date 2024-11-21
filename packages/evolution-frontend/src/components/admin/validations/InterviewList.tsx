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
import { LoadingPage } from 'chaire-lib-frontend/lib/components/pages';
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons/faSyncAlt';
import { faFolder } from '@fortawesome/free-solid-svg-icons/faFolder';
import { faSortAmountDown } from '@fortawesome/free-solid-svg-icons/faSortAmountDown';
import { faSortAmountDownAlt } from '@fortawesome/free-solid-svg-icons/faSortAmountDownAlt';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InterviewStatusAttributesBase } from 'evolution-common/lib/services/questionnaire/types';

interface UsersTableProps extends WithTranslation {
    columns: any[];
    data: InterviewStatusAttributesBase[];
    fetchData: ({ pageSize, pageIndex, filters }: any) => void;
    loading: boolean;
    pageCount: number;
    itemCount: number;
    initialSortBy: { id: string; desc?: boolean }[];
    interviewListChange: (show: boolean) => void;
    showInterviewList: boolean;
    validationInterview: any;
}

// User react-table to handle a few table functionalities like paging and filtering
const InterviewList = (props: UsersTableProps) => {
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
        state: { pageIndex, pageSize, filters, sortBy },
        setSortBy
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

    const handleSortingChange = (columnId: string, sortOrder = 'asc') => {
        // TODO: handle multi-cooumns sorting
        const newSort = [{ id: columnId, desc: sortOrder === 'desc' }];
        setSortBy(newSort);
    };

    return props.loading ? (
        <div className="admin-widget-container">
            <LoadingPage />
        </div>
    ) : (
        <div
            style={{
                flexDirection: 'row',
                flex: '0 0 auto',
                display: props.showInterviewList || _isBlank(props.validationInterview) ? 'block' : 'none'
            }}
        >
            {props.validationInterview !== null && (
                <button title={props.t('admin:HideInterviewList')} onClick={() => props.interviewListChange(false)}>
                    <FontAwesomeIcon icon={faFolder} />
                </button>
            )}

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
                    {props.columns.map((column: any, j) =>
                        (column as any).enableSortBy === true ? (
                            <li key={`columnHeaderSort_${j}`}>
                                <span className="" key="sortColumnLabel">
                                    {column.label}
                                </span>
                                <a
                                    className={`faIconRight${
                                        sortBy.length === 1 &&
                                        sortBy[0].id === column.accessor.toString() &&
                                        sortBy[0].desc !== true
                                            ? ' _active-background _blue'
                                            : ''
                                    }`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (column.accessor.toString() !== sortBy[0].id || sortBy[0].desc === true) {
                                            handleSortingChange(column.accessor.toString(), 'asc');
                                        }
                                    }}
                                    key="sortAsc"
                                >
                                    <FontAwesomeIcon icon={faSortAmountDownAlt} />
                                </a>
                                <a
                                    className={`faIconRight${
                                        sortBy.length === 1 &&
                                        sortBy[0].id === column.accessor.toString() &&
                                        sortBy[0].desc === true
                                            ? ' _active-background _blue'
                                            : ''
                                    }`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (column.accessor.toString() !== sortBy[0].id || sortBy[0].desc !== true) {
                                            handleSortingChange(column.accessor.toString(), 'desc');
                                        }
                                    }}
                                    key="sortDesc"
                                >
                                    <FontAwesomeIcon icon={faSortAmountDown} />
                                </a>
                            </li>
                        ) : null
                    )}
                </ul>
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
