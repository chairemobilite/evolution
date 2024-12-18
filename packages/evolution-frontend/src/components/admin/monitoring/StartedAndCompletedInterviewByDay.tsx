/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import _max from 'lodash/max';
import Loader from 'react-spinners/HashLoader';

type StartedAndCompletedInterviewsByDayData = {
    started: number[];
    completed: number[];
    dates: string[];
    startedCount?: number;
    completedCount?: number;
};

const StartedAndCompletedInterviewsByDay: React.FC = () => {
    const [data, setData] = React.useState<StartedAndCompletedInterviewsByDayData>({
        started: [],
        completed: [],
        dates: [],
        startedCount: undefined,
        completedCount: undefined
    });
    const { t } = useTranslation();
    const reactHighchartsRef = useRef<HighchartsReact.RefObject>(null);

    React.useEffect(() => {
        fetch('/api/admin/data/widgets/started-and-completed-interviews-by-day', {
            method: 'POST',
            body: JSON.stringify({
                refreshCache: false
            }),
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then((response) => {
                if (response.status === 200) {
                    response
                        .json()
                        .then((jsonData) => {
                            setData(jsonData);
                        })
                        .catch((err) => {
                            console.log('Error converting data to json.', err);
                        });
                }
            })
            .catch((err) => {
                console.log('Error fetching data.', err);
            });
    }, []);

    if (!(data.started.length > 0)) {
        return <Loader size={'30px'} color={'#aaaaaa'} loading={true} />;
    }

    // generate cumulative counts arrays:
    const cumulativeStartedData: number[] = [];
    data.started.reduce((cumulativeCount, value, i) => {
        return (cumulativeStartedData[i] = cumulativeCount + value);
    }, 0);
    const cumulativeCompletedData: number[] = [];
    data.completed.reduce((cumulativeCount, value, i) => {
        return (cumulativeCompletedData[i] = cumulativeCount + value);
    }, 0);
    const dataMax: number = _max(data.started) || 0;
    const cumulativeDataMax = _max(cumulativeStartedData) || 0;

    const chartOptions = {
        isPureConfig: true, // don't refresh if config did not change
        chart: {
            type: 'column',
            style: {
                fontFamily: '"Lato", Helvetica, Arial, sans-serif;',
                fontWeight: 100
            }
        },
        title: {
            text: t('admin:StartedAndCompletedInterviewsPerDay')
        },
        subtitle: {
            text: ''
        },
        xAxis: {
            categories: data.dates,
            lineColor: 'transparent',
            minorTickLength: 0,
            tickLength: 0,
            gridLineWidth: 0,
            minorGridLineWidth: 0
        },
        yAxis: [
            {
                title: {
                    text: t('admin:NumberOfInterviews')
                },
                gridZIndex: 10,
                alignTicks: false,
                gridLineColor: 'rgba(255,255,255,0.4)',
                tickInterval: Math.ceil(dataMax / 10), // here we need to get the max
                max: dataMax
            },
            {
                title: {
                    text: t('admin:CumulativeNumberOfInterviews')
                },
                alignTicks: false,
                gridLineWidth: 0,
                max: cumulativeDataMax,
                opposite: true
            }
        ],
        legend: {
            enabled: true
        },
        plotOptions: {
            series: {
                pointPadding: 0,
                borderWidth: 1,
                groupPadding: 0.1,
                dataLabels: {
                    enabled: false,
                    format: '{point.y:.0f}',
                    style: {
                        color: 'rgba(0,0,0,0.5)'
                    }
                }
            }
        },
        tooltip: {
            headerFormat: '<span style="font-size: 11px">{series.name}</span><br />',
            pointFormat: '<span style="color: {point.color}">{point.name}</span> <strong>{point.y:.0f}</strong><br />'
        },
        series: [
            {
                name: t('admin:StartedFem'),
                color: 'rgba(164, 219, 79, 1)',
                data: data.started,
                type: 'column'
            },
            {
                name: t('admin:CompletedFem'),
                color: 'rgba(66, 134, 38, 1)',
                data: data.completed,
                type: 'column'
            },
            {
                name: t('admin:StartedFem'),
                color: 'rgba(164, 219, 79, 0.5)',
                data: cumulativeStartedData,
                yAxis: 1,
                type: 'line',
                zIndex: 20,
                marker: { enabled: false },
                lineWidth: 1
            },
            {
                name: t('admin:CompletedFem'),
                color: 'rgba(66, 134, 38, 0.5)',
                data: cumulativeCompletedData,
                yAxis: 1,
                type: 'line',
                zIndex: 20,
                marker: { enabled: false },
                lineWidth: 1
            }
        ]
    };

    const completionRate =
        data.startedCount !== undefined && data.completedCount !== undefined && data.startedCount > 0
            ? data.completedCount / data.startedCount
            : null;

    return (
        <div
            className="admin-widget-container"
            style={{ width: `${Math.min(1600, Math.max(250, data.dates.length * 30 + 150))}px` }}
        >
            <HighchartsReact highcharts={Highcharts} options={chartOptions} ref={reactHighchartsRef} />
            <p className="no-bottom-margin">
                {data.startedCount && (
                    <React.Fragment>
                        <span>{t('admin:StartedFem')} : </span>
                        <strong>{data.startedCount}</strong>
                    </React.Fragment>
                )}
                {data.completedCount && (
                    <React.Fragment>
                        {' '}
                        • <span>{t('admin:CompletedFem')} : </span>
                        <strong>{data.completedCount}</strong>
                        {completionRate ? <span> ({(completionRate * 100).toFixed(1)}%)</span> : ''}
                    </React.Fragment>
                )}
            </p>
        </div>
    );
};

export default StartedAndCompletedInterviewsByDay;
