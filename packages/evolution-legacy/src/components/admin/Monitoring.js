/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { withTranslation } from 'react-i18next';
import moment from 'moment';

import appConfig from 'evolution-frontend/lib/config/application.config';
import StartedAndCompletedInterviewsByDay from './monitoring/StartedAndCompletedInterviewByDay';
import ExportInterviewData from 'evolution-frontend/lib/components/admin/ExportInterviewData';
// FIXME Commented 2023-11-07 because of od_mtl_2023, it takes too long. Should it be a default widget? Or rather a widget implemented in evolution that surveys can optionally add?
//import InterviewsByHouseholdSize          from './monitoring/InterviewsByHouseholdSize';
//import config                             from 'chaire-lib-common/lib/config/shared/project.config';

// import custom admin monitoring components if available in the project directory:
// TODO Add an admin component object mapper to replace these try catch
let customMonitoringComponents = appConfig.getAdminMonitoringComponents();

class Monitoring extends React.Component { 
  constructor(props) {
    super(props);
    this.state = {
        lastUpdateAt: null
    }
    this.onUpdate = this.onUpdate.bind(this);
  }

  onUpdate() {
    this.setState({
        lastUpdateAt: moment().unix()
    });
  }

  render(){

    const customMonitoringComponentsArray = customMonitoringComponents.map(function(CustomMonitoringComponent, i) {
        return (<CustomMonitoringComponent onUpdate={this.onUpdate} lastUpdateAt={this.state.lastUpdateAt} key={`customMonitoringComponent${i+1}`}/>);
    }.bind(this));

    return (
      <div className="survey">
        <div className="admin">
          <StartedAndCompletedInterviewsByDay onUpdate={this.onUpdate} lastUpdateAt={this.state.lastUpdateAt} />
          <ExportInterviewData/>
          {customMonitoringComponentsArray}
        </div>
      </div>
    );

  }
  
}

export default withTranslation()(Monitoring)