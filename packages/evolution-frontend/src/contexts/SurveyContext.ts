/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import * as React from 'react';
import { SurveySections } from '../services/interviews/interview';

// TODO This type is probably WidgetConfig from '../services/widgets'. But it is not complete yet and it's to be confirmed
export type SurveyWidgets = { [key: string]: any };

export type SurveyContextType = {
    sections: SurveySections;
    widgets: SurveyWidgets;
    devMode: boolean;
    dispatch: React.Dispatch<SurveyAction>;
};

type SurveyAction = { type: 'setDevMode'; value: boolean };

export function surveyReducer(state: { devMode: boolean }, action: SurveyAction): { devMode: boolean } {
    switch (action.type) {
    case 'setDevMode':
        console.log('Setting dev mode ', action.value);
        return { devMode: action.value };
    }
}

/**
 * This context contains the survey specific data, to build the questionnaire
 * widgets: widget configurations, sections, questions, etc.
 *
 * This data is fixed during the app initialization, is provided by the survey
 * application itself and does not change
 *
 * FIXME: Widgets and sections cannot change for the app. It can go in the
 * application.config instead of context. This way, it will be available even
 * outside react widgets.
 */
export const SurveyContext = React.createContext<SurveyContextType>({
    sections: {},
    widgets: {},
    devMode: false,
    dispatch: () => {
        /* To be replaced with actual dispatch */
    }
});
