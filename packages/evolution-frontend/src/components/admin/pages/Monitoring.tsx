/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import moment from 'moment';
import appConfig from '../../../config/application.config';
import StartedAndCompletedInterviewsByDay from '../monitoring/StartedAndCompletedInterviewByDay';
import { ProgressionMonitoringCharts } from '../monitoring/ProgressionMonitoringCharts';
import { RespondentBurdensMonitoringCharts } from '../monitoring/RespondentBurdensMonitoringCharts';
import ExportInterviewData from './ExportInterviewData';

type CustomMonitoringComponentProps = {
    onUpdate: () => void;
    lastUpdateAt?: number;
};

type CustomMonitoringComponent = React.ComponentType<Partial<CustomMonitoringComponentProps>>;

const Monitoring: React.FC = () => {
    const [lastUpdateAt, setLastUpdateAt] = React.useState<number | undefined>(undefined);

    // import custom admin monitoring components if available in the project directory:
    const customMonitoringComponents: CustomMonitoringComponent[] = React.useMemo(
        () => appConfig.getAdminMonitoringComponents() as any,
        []
    );

    const onUpdate = () => {
        setLastUpdateAt(moment().unix());
    };
    const customMonitoringComponentsArray = customMonitoringComponents.map((Component, i) => (
        <Component onUpdate={onUpdate} lastUpdateAt={lastUpdateAt} key={`customMonitoringComponent${i + 1}`} />
    ));

    return (
        <div className="survey">
            <div className="monitoring">
                {/* TODO: Fix this layout, it's not working on small screens and when the graphs have too many days */}
                <div className="monitoring-first-row">
                    <StartedAndCompletedInterviewsByDay />
                    <ExportInterviewData />
                </div>
                <ProgressionMonitoringCharts />
                <RespondentBurdensMonitoringCharts />
                {customMonitoringComponentsArray}
            </div>
        </div>
    );
};

export default Monitoring;
