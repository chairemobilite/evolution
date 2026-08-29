/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import InterviewList, { type Filter } from './InterviewList';
import { ReviewStatusColumnFilter } from './ReviewStatusColumnFilter';
import InterviewCompletedFilter from './InterviewCompletedFilter';
import InterviewByCodeFilter from './InterviewByCodeFilter';
import InterviewByDateFilter from './InterviewByDateFilter';
import ValidationAuditFilter from './ValidationAuditFilter';
import InteviewByHomeGeographyFilter from './InterviewByHomeGeographyFilter';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons/faTriangleExclamation';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons/faUserCircle';
import { faEnvelope as faValidationComment } from '@fortawesome/free-solid-svg-icons/faEnvelope';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { handleHttpOtherResponseCode } from '../../../services/errorManagement/errorHandling';
import { Dispatch } from 'redux';
import { InterviewStatusAttributesBase } from 'evolution-common/lib/services/questionnaire/types';
import config from 'evolution-common/lib/config/project.config';
import { dateToIsoWithTimezone } from 'evolution-common/lib/utils/DateTimeUtils';
import * as Status from 'chaire-lib-common/lib/utils/Status';
import { useReviewDecisionStatusByObject } from '../../../services/admin/useObjectReview';
import {
    getOpenInterviewStatus,
    withLearnedInterviewStatus,
    withLiveInterviewStatuses,
    type InterviewLiveStatusByUuid
} from '../../../services/admin/interviewListLiveStatus';

interface InterviewListComponentProps {
    onInterviewSummaryChanged: (uuid: string, prevUuid?: string, nextUuid?: string) => void;
    initialSortBy: { id: string; desc?: boolean }[];
    interviewListChange: (show: boolean) => void;
    showInterviewList: boolean;
    validationInterview: any;
    dispatch: Dispatch;
}

type CellArgs = {
    value: any;
    data?: any;
    row?: any;
};

const InterviewListComponent: React.FunctionComponent<InterviewListComponentProps> = (
    props: InterviewListComponentProps
) => {
    const { t } = useTranslation(['admin', 'main']);
    // We'll start our table without any data
    const [data, setData] = React.useState<InterviewStatusAttributesBase[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [totalCount, setTotalCount] = React.useState(0);
    const [pageCount, setPageCount] = React.useState(0);
    const fetchIdRef = React.useRef(0);
    // The rows are a snapshot taken when the list was fetched. Reviewing an interview beside the
    // list changes its status right away, so those changes are kept here and applied to the rows,
    // sparing the reviewer a page reload. They are kept for the whole visit: the reviewer sees
    // their own decisions, and reloads the page to see what the other reviewers did meanwhile.
    //
    // The store is what renders the list again: reviewing dispatches the decisions to
    // `state.survey.reviewDecisions`, subscribed to below, and marking complete updates
    // `state.survey.interview`, which arrives as `validationInterview`. The effect only records
    // what those renders show, so that a status outlives the fetch replacing the rows.
    const [liveStatusByUuid, setLiveStatusByUuid] = React.useState<InterviewLiveStatusByUuid>({});
    const reviewDecisionStatusByObject = useReviewDecisionStatusByObject();
    const openInterviewStatus = getOpenInterviewStatus(props.validationInterview, reviewDecisionStatusByObject);
    React.useEffect(() => {
        setLiveStatusByUuid((learned) => withLearnedInterviewStatus(learned, openInterviewStatus));
    }, [openInterviewStatus?.uuid, openInterviewStatus?.review_status, openInterviewStatus?.is_completed]);
    const rows = React.useMemo(() => withLiveInterviewStatuses(data, liveStatusByUuid), [data, liveStatusByUuid]);
    const batchAuditIdRef = React.useRef(0);
    const [batchAuditLoading, setBatchAuditLoading] = React.useState(false);
    const [batchAuditResult, setBatchAuditResult] = React.useState<Status.Status<{
        totalCount: number;
        processed: number;
        succeeded: number;
        failed: number;
    }> | null>(null);

    const handleInterviewSummaryChange: React.MouseEventHandler<HTMLAnchorElement> = (
        e: React.MouseEvent<HTMLAnchorElement>
    ) => {
        e.preventDefault();
        const uuid = (e.target as HTMLAnchorElement).getAttribute('data-uuid');
        if (!uuid) {
            return;
        }
        props.onInterviewSummaryChanged(
            uuid,
            (e.target as HTMLAnchorElement).getAttribute('data-prev-uuid') || undefined,
            (e.target as HTMLAnchorElement).getAttribute('data-next-uuid') || undefined
        );
    };

    // Helper function to build normalized data filters from filter array
    const buildFilters = (filters: Filter[] | undefined): Record<string, any> => {
        const dataFilters = {};
        if (Array.isArray(filters)) {
            filters.forEach((filter) => {
                if (typeof filter.value === 'string' || Array.isArray(filter.value)) {
                    dataFilters[filter.id] = filter.value;
                } else if (typeof filter.value === 'object' && filter.value.value !== undefined) {
                    const { value, op } = filter.value;
                    dataFilters[filter.id] = { value, op };
                }
            });
        }
        return dataFilters;
    };

    // Function to fetch data from the server, with paging and filtering
    const fetchData = React.useCallback(async ({ pageSize, pageIndex, filters, sortBy }) => {
        // Give this fetch an ID
        const fetchId = ++fetchIdRef.current;

        // Set the loading state
        setLoading(true);

        // Make a query string from the filters
        const dataFilters = buildFilters(filters);

        try {
            const response = await fetch('/api/validationList', {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                method: 'POST',
                body: JSON.stringify({
                    pageSize,
                    pageIndex,
                    sortBy,
                    ...dataFilters
                })
            });

            if (fetchId !== fetchIdRef.current) {
                // There was another query since, ignore
                return;
            }
            if (response.status === 200) {
                const jsonData = await response.json();
                if (fetchId !== fetchIdRef.current) {
                    // Reading the body took long enough for another query to answer, ignore
                    return;
                }
                const data = jsonData.interviews ? jsonData.interviews : [];
                const [totalCount, pageCount] = jsonData.totalCount
                    ? [jsonData.totalCount, Math.ceil(jsonData.totalCount / pageSize)]
                    : [0, 0];
                setData(data);
                setPageCount(pageCount);
                setTotalCount(totalCount);
            } else {
                console.error('Invalid response code from server: ', response.status);
                handleHttpOtherResponseCode(response.status, props.dispatch);
            }
        } catch (error) {
            console.error(`Error fetching user data from server: ${error}`);
            setData([]);
            setTotalCount(0);
        } finally {
            if (fetchId === fetchIdRef.current) {
                setLoading(false);
            }
        }
    }, []);

    // Function to run batch audits on filtered interviews
    const runBatchAudits = React.useCallback(
        async (
            extended: boolean,
            currentFilters: Filter[] | undefined,
            currentPageIndex: number,
            currentPageSize: number,
            currentSortBy: { id: string; desc?: boolean }[]
        ) => {
            // Give this batch audit request an ID
            const batchAuditId = ++batchAuditIdRef.current;
            setBatchAuditLoading(true);
            setBatchAuditResult(null);

            // Make a query string from the filters (same as fetchData)
            const dataFilters = buildFilters(currentFilters);

            try {
                const response = await fetch('/api/validation/batchAudits', {
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    method: 'POST',
                    body: JSON.stringify({
                        extended,
                        ...dataFilters
                    })
                });

                if (batchAuditId !== batchAuditIdRef.current) {
                    // There was another batch audit request since, ignore this result
                    return;
                }

                if (response.status === 200) {
                    const jsonData = await response.json();
                    setBatchAuditResult(
                        Status.createOk({
                            totalCount: jsonData.totalCount || 0,
                            processed: jsonData.processed || 0,
                            succeeded: jsonData.succeeded || 0,
                            failed: jsonData.failed || 0
                        })
                    );
                    // Refresh the list after batch audit using current table state
                    await fetchData({
                        pageSize: currentPageSize,
                        pageIndex: currentPageIndex,
                        filters: currentFilters,
                        sortBy: currentSortBy
                    });
                } else {
                    console.error('Invalid response code from server: ', response.status);
                    handleHttpOtherResponseCode(response.status, props.dispatch);
                    const errorMessage = `Invalid response code: ${response.status}`;
                    setBatchAuditResult(Status.createError(errorMessage));
                }
            } catch (error) {
                console.error(`Error running batch audits: ${error}`);
                if (batchAuditId === batchAuditIdRef.current) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    setBatchAuditResult(Status.createError(errorMessage));
                }
            } finally {
                setBatchAuditLoading(false);
            }
        },
        [fetchData, props.dispatch]
    );

    // TODO: Turn cells into proper components instead of just making them inline.
    const columns = React.useMemo(() => {
        const columns = [
            {
                accessor: 'id',
                label: t('admin:InterviewId'),
                Cell: ({ value }: CellArgs) => `#${value}`,
                enableSortBy: true
            },
            ...(config.hasAccessCode
                ? [
                    {
                        id: 'response.accessCode',
                        label: t('admin:interviewByCodeFilter:title'),
                        accessor: 'response.accessCode',
                        Filter: InterviewByCodeFilter,
                        enableSortBy: true
                    }
                ]
                : []),
            {
                id: 'created_at',
                accessor: 'created_at',
                label: t('admin:interviewByDateFilter:title'),
                Cell: ({ value }: CellArgs) =>
                    // Display the date (YYYY-MM-DD) in the survey's timezone instead of UTC
                    !_isBlank(value) ? dateToIsoWithTimezone(new Date(value), config.timezone) : '?',
                Filter: InterviewByDateFilter,
                enableSortBy: true
            },
            {
                // The completion the participant reached in the questionnaire, which is not the
                // `is_completed` flag the reviewer sets from the top menu and which colors the
                // row. The two are distinct, so this column does not follow a live review either.
                accessor: 'response._isCompleted',
                Filter: InterviewCompletedFilter,
                enableSortBy: false,
                Cell: ({ value }: CellArgs) =>
                    value ? t('admin:CompletedFemSingular') : t('admin:NotCompletedFemSingular')
            },
            {
                accessor: 'review_status',
                Filter: ReviewStatusColumnFilter,
                Cell: ({ value }: CellArgs) => t(`admin:reviewStatus:${value}`)
            },
            {
                accessor: 'response.household.size',
                Cell: ({ value }: CellArgs) => (
                    <React.Fragment>
                        {value || '?'}
                        <FontAwesomeIcon
                            icon={faUserCircle}
                            className="faIconNoMargin"
                            /* eslint-disable-next-line react/prop-types */
                            title={t('admin:persons')}
                        />
                    </React.Fragment>
                ),
                label: t('admin:HouseholdSize'),
                enableSortBy: true
            },
            {
                accessor: 'audits',
                Cell: ({ value }: CellArgs) =>
                    !value || Object.keys(value).length === 0 ? (
                        ''
                    ) : (
                        <FontAwesomeIcon
                            icon={faTriangleExclamation}
                            className="faIconNoMargin _error _red"
                            title={Object.keys(value)
                                /* eslint-disable-next-line react/prop-types */
                                .map((error: any) => t([`survey:validations:${error}`, `surveyAdmin:${error}`]))
                                .join('\n')}
                        />
                    ),
                Filter: ValidationAuditFilter
            },
            {
                accessor: 'uuid',
                Cell: ({ data, row, value }: CellArgs) => {
                    // TODO Do we want to continue navigating beyond the current page? If so, implement it
                    const prevUuid = row.index > 0 ? data[row.index - 1].uuid : '';
                    const nextUuid = row.index < data.length - 1 ? data[row.index + 1].uuid : '';
                    return (
                        <a
                            href=""
                            id={`interviewButtonList_${value}`}
                            data-uuid={value}
                            data-prev-uuid={prevUuid}
                            data-next-uuid={nextUuid}
                            onClick={handleInterviewSummaryChange}
                        >
                            {t('admin:Correct') /* eslint-disable-line react/prop-types */}
                        </a>
                    );
                }
            },
            {
                accessor: 'response._validationComment',
                Cell: ({ value }: CellArgs) =>
                    _isBlank(value) ? (
                        ''
                    ) : (
                        <FontAwesomeIcon icon={faValidationComment} className="faIconNoMargin" title={value} />
                    )
            },
            {
                accessor: 'response.home.geography',
                label: t('admin:interviewByHomeGeographyFilter:Title'),
                Cell: () => '',
                Filter: InteviewByHomeGeographyFilter,
                enableSortBy: false
            }
        ];

        return columns;
    }, []);

    return (
        <InterviewList
            showInterviewList={props.showInterviewList}
            validationInterview={props.validationInterview}
            interviewListChange={props.interviewListChange}
            columns={columns}
            data={rows}
            fetchData={fetchData}
            loading={loading}
            pageCount={pageCount}
            itemCount={totalCount}
            initialSortBy={props.initialSortBy}
            runBatchAudits={runBatchAudits}
            batchAuditLoading={batchAuditLoading}
            batchAuditResult={batchAuditResult}
        />
    );
};

const mapDispatchToProps = (dispatch, _props: Omit<InterviewListComponentProps, 'dispatch'>) => ({
    dispatch
});

export default connect(undefined, mapDispatchToProps)(InterviewListComponent);
