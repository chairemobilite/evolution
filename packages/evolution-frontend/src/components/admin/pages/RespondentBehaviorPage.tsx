/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';

import { RespondentBehaviorCharts } from '../monitoring/RespondentBehaviorCharts';

const RespondentBehaviorPage: React.FC = () => {
    // FIXME Experimental: This should be part of the monitoring page, not
    // loaded by default, but with loadable. But we keep it "hidden" for now,
    // until we are certain the metrics are correctly calculated and we can
    // trust the data shown.
    return (
        <div className="admin">
            <div className="survey">
                <div className="monitoring">
                    <RespondentBehaviorCharts />
                </div>
            </div>
        </div>
    );
};

export default RespondentBehaviorPage;
