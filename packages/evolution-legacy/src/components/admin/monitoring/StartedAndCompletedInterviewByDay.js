/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { withTranslation } from 'react-i18next';
import ReactHighcharts     from 'react-highcharts';
import _max                from 'lodash.max';

import config from 'chaire-lib-common/lib/config/shared/project.config';

class StartedAndCompletedInterviewsByDay extends React.Component { 
  constructor(props) {
    super(props);
    this.state = {
      data: {
        started       : [],
        completed     : [],
        dates         : [],
        startedCount  : null,
        completedCount: null
      }
    }
  }

  componentDidMount() {
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
    .then(function(response) {
      if (response.status === 200) {
        response.json().then(function(jsonData) {
          this.setState({data: jsonData});
        }.bind(this)).catch((err) => {
          console.log('Error converting data to json.', err);
        });
      }
    }.bind(this)).catch((err) => {
      console.log('Error fetching data.', err);
    });
  }

  render(){

    if (!(this.state.data.started.length > 0))
    {
      return null;
    }

    // generate cumulative counts arrays:
    const cumulativeStartedData = [];
    this.state.data.started.reduce(function(cumulativeCount, value, i) {
      return cumulativeStartedData[i] = cumulativeCount + value;
    },0);
    const cumulativeCompletedData = [];
    this.state.data.completed.reduce(function(cumulativeCount, value, i) {
      return cumulativeCompletedData[i] = cumulativeCount + value;
    },0);
    const dataMax               = _max(this.state.data.started) || 0;
    const cumulativeDataMax     = _max(cumulativeStartedData) || 0;

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
        text: this.props.t('admin:StartedAndCompletedInterviewsPerDay')
      },
      subtitle: {
        text: ''
      },
      xAxis: {
        categories: this.state.data.dates,
        lineColor: 'transparent',
        minorTickLength: 0,
        tickLength: 0,
        gridLineWidth: 0,
        minorGridLineWidth: 0
      },
      yAxis: [{
        title: {
          text: this.props.t('admin:NumberOfInterviews')
        },
        gridZIndex: 10,
        alignTicks: false,
        gridLineColor: "rgba(255,255,255,0.4)",
        tickInterval: Math.ceil(dataMax/10), // here we need to get the max
        max: dataMax
      },
      {
        title: {
          text: this.props.t('admin:CumulativeNumberOfInterviews')
        },
        alignTicks: false,
        gridLineWidth: 0,
        max: cumulativeDataMax,
        opposite: true
      }],
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
        pointFormat:  '<span style="color: {point.color}">{point.name}</span> <strong>{point.y:.0f}</strong><br />'
      },
      series: [{
        name: this.props.t('admin:StartedFem'),
        color: 'rgba(164, 219, 79, 1)',
        data: this.state.data.started,
        type: 'column'
      },
      {
        name: this.props.t('admin:CompletedFem'),
        color: 'rgba(66, 134, 38, 1)',
        data: this.state.data.completed,
        type: 'column'
      },
      {
        name: this.props.t('admin:StartedFem'),
        color: 'rgba(164, 219, 79, 0.5)',
        data: cumulativeStartedData,
        yAxis: 1,
        type: 'line',
        zIndex: 20,
        marker: { enabled: false },
        lineWidth: 1
      },
      {
        name: this.props.t('admin:CompletedFem'),
        color: 'rgba(66, 134, 38, 0.5)',
        data: cumulativeCompletedData,
        yAxis: 1,
        type: 'line',
        zIndex: 20,
        marker: { enabled: false },
        lineWidth: 1
      }]
    };

    const completionRate = this.state.data.startedCount > 0 ? this.state.data.completedCount / this.state.data.startedCount : null;

    return (
      <div className="admin-widget-container" style={{width: `${Math.max(250, this.state.data.dates.length * 30 + 150)}px`}}>
        <ReactHighcharts 

          config   = {chartOptions}
          domProps = {{id: 'highchartStartedAndCompletedInterviewsByDay'}}
          callback = {null}
          ref      = "highchart-started-and-completed-interviews-by-day"
        >
        </ReactHighcharts>
        <p className="no-bottom-margin">
          { this.state.data.startedCount   && <React.Fragment><span>{this.props.t('admin:StartedFem')  } : </span><strong>{this.state.data.startedCount}</strong></React.Fragment>  }
          { this.state.data.completedCount && <React.Fragment> • <span>{this.props.t('admin:CompletedFem')} : </span><strong>{this.state.data.completedCount}</strong>{ completionRate ? <span> ({(completionRate * 100).toFixed(1)}%)</span> : ''}</React.Fragment>}
        </p>
        
      </div>
    );

  }
}

export default withTranslation()(StartedAndCompletedInterviewsByDay)