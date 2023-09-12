/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InterviewStatusAttributesBase } from 'evolution-common/lib/services/interviews/interview';
import InterviewList from './InterviewList';
import ValidityColumnFilter from './ValidityColumnFilter';
import InterviewCompletedFilter from './InterviewCompletedFilter';
import ValidationAuditFilter from './ValidationAuditFilter';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons/faExclamationTriangle';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons/faUserCircle';
import { faEnvelope as faValidationComment } from '@fortawesome/free-solid-svg-icons/faEnvelope';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface InterviewListComponentProps extends WithTranslation {
    onInterviewSummaryChanged: (uuid: string, prevUuid?: string, nextUuid?: string) => void;
    initialSortBy: { id: string; desc?: boolean }[];
    interviewListChange: (show: boolean) => void;
    showInterviewList: boolean;
    validationInterview: any;
}

const InterviewListComponent: React.FunctionComponent<InterviewListComponentProps> = <
    CustomSurvey,
    CustomHousehold,
    CustomHome,
    CustomPerson
>(
        props: InterviewListComponentProps
    ) => {
    // We'll start our table without any data
    const [data, setData] = React.useState<
        InterviewStatusAttributesBase<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>[]
    >([]);
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
            if (typeof filter.value === 'string') {
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

    const columns = React.useMemo(() => {
        const columns = [
            {
                accessor: 'id',
                Cell: ({ value }) => `#${value}`
            },
            {
                // TODO, this column is specific to projects, it should come as props from the project
                id: 'responses.accessCode',
                accessor: 'responses.accessCode'
            },
            {
                accessor: 'responses._isCompleted',
                Filter: InterviewCompletedFilter,
                Cell: ({ value }) =>
                    value ? props.t('admin:CompletedFemSingular') : props.t('admin:NotCompletedFemSingular')
            },
            {
                accessor: 'is_valid',
                Filter: ValidityColumnFilter,
                Cell: ({ value }) =>
                    value
                        ? props.t('admin:Valid')
                        : value === false
                            ? props.t('admin:Invalid')
                            : props.t('admin:UnknownValidity')
            },
            {
                accessor: 'responses.household.size',
                Cell: ({ value }) => (
                    <React.Fragment>
                        {value || '?'}
                        <FontAwesomeIcon
                            icon={faUserCircle}
                            className="faIconNoMargin"
                            title={props.t('admin:persons')}
                        />
                    </React.Fragment>
                )
            },
            {
                accessor: 'audits',
                Cell: ({ value }) =>
                    !value || Object.keys(value).length === 0 ? (
                        ''
                    ) : (
                        <FontAwesomeIcon
                            icon={faExclamationTriangle}
                            className="faIconNoMargin _error _red"
                            title={Object.keys(value)
                                .map((error: any) => props.t(`survey:validations:${error}`))
                                .join('\n')}
                        />
                    ),
                Filter: ValidationAuditFilter
            },
            {
                accessor: 'uuid',
                Cell: ({ data, row, value }) => {
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
                            {props.t('admin:Validate')}
                        </a>
                    );
                }
            },
            {
                accessor: 'responses._validationComment',
                Cell: ({ value }) =>
                    _isBlank(value) ? (
                        ''
                    ) : (
                        <FontAwesomeIcon icon={faValidationComment} className="faIconNoMargin" title={value} />
                    )
            }
        ];

        return columns;
    }, [props.t]);

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

export default withTranslation(['admin', 'main'])(InterviewListComponent);
