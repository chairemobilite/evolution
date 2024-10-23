/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import moment from 'moment';
import appConfig from '../../../config/application.config';
import StartedAndCompletedInterviewsByDay from '../monitoring/StartedAndCompletedInterviewByDay';
import ExportInterviewData from './ExportInterviewData';
// import custom admin monitoring components if available in the project directory:

type CustomMonitoringComponentProps = {
    onUpdate: () => void;
    lastUpdateAt?: number;
};

type CustomMonitoringComponent = React.ComponentType<Partial<CustomMonitoringComponentProps>>;

type MonitoringProps = WithTranslation;

type MonitoringState = {
    lastUpdateAt?: number;
    customMonitoringComponents: CustomMonitoringComponent[];
};

class Monitoring extends React.Component<MonitoringProps, MonitoringState> {
    constructor(props: MonitoringProps) {
        super(props);
        this.state = {
            lastUpdateAt: undefined,
            customMonitoringComponents: []
        };
        this.onUpdate = this.onUpdate.bind(this);
    }

    componentDidMount() {
        const customMonitoringComponents: CustomMonitoringComponent[] = appConfig.getAdminMonitoringComponents() as any;

        this.setState({
            customMonitoringComponents
        });
    }

    onUpdate() {
        this.setState({
            lastUpdateAt: moment().unix()
        });
    }

    render() {
        const customMonitoringComponentsArray = this.state.customMonitoringComponents.map((Component, i) => (
            <Component
                onUpdate={this.onUpdate}
                lastUpdateAt={this.state.lastUpdateAt}
                key={`customMonitoringComponent${i + 1}`}
            />
        ));

        return (
            <div className="survey">
                <div className="admin">
                    <StartedAndCompletedInterviewsByDay
                        onUpdate={this.onUpdate}
                        lastUpdateAt={this.state.lastUpdateAt}
                    />
                    <ExportInterviewData />
                    {customMonitoringComponentsArray}
                </div>
            </div>
        );
    }
}

export default withTranslation()(Monitoring);
