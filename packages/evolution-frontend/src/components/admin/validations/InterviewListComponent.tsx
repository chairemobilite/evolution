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
import InterviewList from './InterviewList';
import ValidityColumnFilter from './ValidityColumnFilter';
import InterviewCompletedFilter from './InterviewCompletedFilter';
import InterviewByCodeFilter from './InterviewByCodeFilter';
import InterviewByDateFilter from './InterviewByDateFilter';
import ValidationAuditFilter from './ValidationAuditFilter';
import InteviewByHomeGeographyFilter from './InterviewByHomeGeographyFilter';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons/faExclamationTriangle';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons/faUserCircle';
import { faEnvelope as faValidationComment } from '@fortawesome/free-solid-svg-icons/faEnvelope';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { handleHttpOtherResponseCode } from '../../../services/errorManagement/errorHandling';
import { Dispatch } from 'redux';
import { InterviewStatusAttributesBase } from 'evolution-common/lib/services/questionnaire/types';

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

    // Function to fetch data from the server, with paging and filtering
    const fetchData = React.useCallback(async ({ pageSize, pageIndex, filters, sortBy }) => {
        // Give this fetch an ID
        const fetchId = ++fetchIdRef.current;

        // Set the loading state
        setLoading(true);

        // Make a query string from the filters
        const dataFilters = {};
        (filters || []).forEach((filter) => {
            if (typeof filter.value === 'string' || Array.isArray(filter.value)) {
                dataFilters[filter.id] = filter.value;
            } else if (typeof filter.value === 'object' && filter.value.value !== undefined) {
                const { value, op } = filter.value;
                dataFilters[filter.id] = { value, op };
            }
        });

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

    // TODO: Turn cells into proper components instead of just making them inline.
    const columns = React.useMemo(() => {
        const columns = [
            {
                accessor: 'id',
                label: t('admin:InterviewId'),
                Cell: ({ value }: CellArgs) => `#${value}`,
                enableSortBy: true
            },
            {
                // TODO, this column is specific to projects, it should come as props from the project
                id: 'response.accessCode',
                label: t('admin:interviewByCodeFilter:title'),
                accessor: 'response.accessCode',
                Filter: InterviewByCodeFilter,
                enableSortBy: true
            },
            {
                id: 'created_at',
                accessor: 'created_at',
                label: t('admin:interviewByDateFilter:title'),
                Cell: ({ value }: CellArgs) =>
                    !_isBlank(value) ? new Date(value).toISOString().split('T')[0].replace('/', '-') : '?', // Converts to YYYY-MM-DD format
                Filter: InterviewByDateFilter,
                enableSortBy: true
            },
            {
                accessor: 'response._isCompleted',
                Filter: InterviewCompletedFilter,
                enableSortBy: false,
                Cell: ({ value }: CellArgs) =>
                    value ? t('admin:CompletedFemSingular') : t('admin:NotCompletedFemSingular')
            },
            {
                accessor: 'is_valid',
                Filter: ValidityColumnFilter,
                Cell: ({ value }: CellArgs) =>
                    value ? t('admin:Valid') : value === false ? t('admin:Invalid') : t('admin:UnknownValidity')
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
                            icon={faExclamationTriangle}
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
            data={data}
            fetchData={fetchData}
            loading={loading}
            pageCount={pageCount}
            itemCount={totalCount}
            initialSortBy={props.initialSortBy}
        />
    );
};

const mapDispatchToProps = (dispatch, _props: Omit<InterviewListComponentProps, 'dispatch'>) => ({
    dispatch
});

export default connect(undefined, mapDispatchToProps)(InterviewListComponent);
