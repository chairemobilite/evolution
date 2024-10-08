/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { withTranslation } from 'react-i18next';
import ReactHighcharts     from 'react-highcharts';

import config       from 'chaire-lib-common/lib/config/shared/project.config';
import adminHelper  from '../../../helpers/admin/admin.helper';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';

class InterviewsByHouseholdSize extends React.Component { 
  constructor(props) {
    super(props);
    this.state = {
      interviewsStatus: {}
    }
    this.updateInterviewsStatusCache = this.updateInterviewsStatusCache.bind(this);
  }

  updateInterviewsStatusCache(updatedAt) {
    return adminHelper.getJson(`/api/admin/data/interviews-status/${updatedAt || 0}`)
    .then(function(interviewsStatus) {
      // TODO This widget could use the same cache data as custom graphs, it is
      // just a group by clause on the data
      this.setState(function(state) {
        return { interviewsStatus: interviewsStatus };
      })
    }.bind(this)).catch(function(error) {
      console.log('InterviewsList | updateInterviewsStatusCache error', error);
    });
  }

  componentDidMount() {

    adminHelper.getCache('interviewsStatus.json').then(function(cacheData) {
      if (cacheData.updatedAt === 0 || _isBlank(cacheData.updatedAt)) // cache is empty
      {
        this.updateInterviewsStatusCache(0);
      }
      else
      {
        this.setState(function(state) {
          return {
            interviewsStatus: cacheData
          };
        })
      }
    }.bind(this)).catch(function(error) {
      console.log(`InterviewsList | Error getting interviewsStatus cache`, error);
    });
    
  }

  render(){

    if (_isBlank(this.state.interviewsStatus))
    {
      return null;
    }

    const householdSizes                = [1,2,3,4,5,'6+'];
    const startedCountByHouseholdSize   = [0,0,0,0,0,0];
    const completedCountByHouseholdSize = [0,0,0,0,0,0];

    for (const interviewUuid in this.state.interviewsStatus.interviews)
    {
      const interviewStatus = this.state.interviewsStatus.interviews[interviewUuid];
      const householdSize = interviewStatus.householdSize;
      if (householdSize !== null && householdSize > 0)
      {
        if (householdSize >= householdSizes.length)
        {
          startedCountByHouseholdSize[householdSizes.length - 1]++;
          interviewStatus.isCompleted ? completedCountByHouseholdSize[householdSizes.length - 1]++: null;
        }
        else
        {
          startedCountByHouseholdSize[householdSize - 1]++;
          interviewStatus.isCompleted ? completedCountByHouseholdSize[householdSize - 1]++ : null;
        }
      }
    }

    const dataMax = Math.max(...startedCountByHouseholdSize);

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
        text: this.props.t('admin:StartedAndCompletedInterviewsPerHouseholdSize')
      },
      subtitle: {
        text: ''
      },
      xAxis: {
        categories: householdSizes,
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
        pointFormat:  `<span style="color: {point.color}">{point.name}</span> <strong>{point.y:.0f}</strong><br />`
      },
      series: [{
        name: this.props.t('admin:StartedFem'),
        color: 'rgba(164, 219, 79, 1)',
        data: startedCountByHouseholdSize,
        type: 'column'
      },
      {
        name: this.props.t('admin:CompletedFem'),
        color: 'rgba(66, 134, 38, 1)',
        data: completedCountByHouseholdSize,
        type: 'column'
      }]
    };

    return (
      <div className="admin-widget-container" style={{width: `${householdSizes.length * 30 + 100}px`}}>
        <ReactHighcharts 

          config   = {chartOptions}
          domProps = {{id: 'highchartStartedAndCompletedInterviewsByHouseholdSize'}}
          callback = {null}
          ref      = "highchart-started-and-completed-interviews-by-household-size"
        >
        </ReactHighcharts>
      </div>
    );

  }
}

export default withTranslation()(InterviewsByHouseholdSize)