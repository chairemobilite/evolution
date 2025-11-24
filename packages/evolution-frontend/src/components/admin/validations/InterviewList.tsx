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
import { faBolt } from '@fortawesome/free-solid-svg-icons/faBolt';
import { faListCheck } from '@fortawesome/free-solid-svg-icons/faListCheck';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InterviewStatusAttributesBase } from 'evolution-common/lib/services/questionnaire/types';
import * as Status from 'chaire-lib-common/lib/utils/Status';

interface UsersTableProps extends WithTranslation {
    columns: Array<Record<string, unknown>>;
    data: InterviewStatusAttributesBase[];
    fetchData: (params: {
        pageSize: number;
        pageIndex: number;
        filters: unknown;
        sortBy: { id: string; desc?: boolean }[];
    }) => void;
    loading: boolean;
    pageCount: number;
    itemCount: number;
    initialSortBy: { id: string; desc?: boolean }[];
    interviewListChange: (show: boolean) => void;
    showInterviewList: boolean;
    validationInterview: InterviewStatusAttributesBase | null;
    runBatchAudits: (
        extended: boolean,
        filters: unknown,
        pageIndex: number,
        pageSize: number,
        sortBy: { id: string; desc?: boolean }[]
    ) => void;
    batchAuditLoading: boolean;
    batchAuditResult: Status.Status<{
        totalCount: number;
        processed: number;
        succeeded: number;
        failed: number;
    }> | null;
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

    const getRowClassName = (
        row: { original: InterviewStatusAttributesBase },
        validationInterview: InterviewStatusAttributesBase | null
    ): string => {
        if (validationInterview && row.original.uuid === validationInterview.uuid) {
            return '_active-background _blue';
        }
        if (row.original.is_validated && row.original.is_valid && row.original.is_completed) {
            return '_green _strong _active-background';
        }
        if (row.original.is_valid && row.original.is_completed) {
            return '_dark-green _strong';
        }
        if (row.original.is_valid && !row.original.is_completed) {
            return '_orange _strong';
        }
        if (row.original.is_valid === false) {
            return '_dark-red _strong';
        }
        return '';
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
                <span className="_pale">&nbsp;|&nbsp;</span>
                <a
                    href="#"
                    className={props.batchAuditLoading ? '_disabled' : ''}
                    onClick={(e) => {
                        e.preventDefault();
                        if (!props.batchAuditLoading) {
                            props.runBatchAudits(false, filters, pageIndex, pageSize, sortBy);
                        }
                    }}
                    title={props.t('admin:batchRunAudits')}
                >
                    <FontAwesomeIcon icon={faListCheck} />
                </a>
                <span className="_pale">&nbsp;|&nbsp;</span>
                <a
                    href="#"
                    className={`_together ${props.batchAuditLoading ? '_disabled' : ''}`}
                    onClick={(e) => {
                        e.preventDefault();
                        if (!props.batchAuditLoading) {
                            props.runBatchAudits(true, filters, pageIndex, pageSize, sortBy);
                        }
                    }}
                    title={props.t('admin:batchRunAuditsWithExtended')}
                >
                    <span className="_small">
                        <FontAwesomeIcon icon={faBolt} />
                    </span>
                    <FontAwesomeIcon icon={faListCheck} />
                </a>
                {props.batchAuditLoading && (
                    <span className="_small" style={{ marginLeft: '10px' }}>
                        {props.t('admin:runningBatchAudits')}
                    </span>
                )}
                {props.batchAuditResult && (
                    <span className="_small" style={{ marginLeft: '10px' }}>
                        {Status.isStatusError(props.batchAuditResult) ? (
                            <span className="_error _red">
                                {props.t('admin:batchAuditError', {
                                    error:
                                        typeof props.batchAuditResult.error === 'string'
                                            ? props.batchAuditResult.error
                                            : props.batchAuditResult.error instanceof Error
                                                ? props.batchAuditResult.error.message
                                                : String(props.batchAuditResult.error)
                                })}
                            </span>
                        ) : (
                            props.t('admin:batchAuditResult', {
                                total: props.batchAuditResult.result.totalCount,
                                processed: props.batchAuditResult.result.processed,
                                succeeded: props.batchAuditResult.result.succeeded,
                                failed: props.batchAuditResult.result.failed
                            })
                        )}
                    </span>
                )}
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
                                className={getRowClassName(row, props.validationInterview)}
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
