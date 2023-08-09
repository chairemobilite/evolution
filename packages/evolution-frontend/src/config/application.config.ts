import appConfig, {
    ApplicationConfiguration,
    setApplicationConfiguration
} from 'chaire-lib-frontend/lib/config/application.config';
import React from 'react';
import { SurveySections, SurveyWidgets } from '../services/interviews/interview';

export type EvolutionApplicationConfiguration<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    /**
     * Survey sections
     */
    sections: SurveySections;
    /**
     * Survey widgets
     */
    widgets: SurveyWidgets<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    /** Custom project helper functions.
     *
     * TODO Can these be typed? It's hard to do anything about it... Maybe they should not be in the application config but completely handled on the project side */
    projectHelpers: { [helperName: string]: () => any };
    /**
     * Fields that, if present in the original query string to the survey, will
     * be pre-filled in the responses
     */
    allowedUrlFields: string[];

    // TODO The fields below are only for the administrative side of the application. The don't need to exist/be loaded for the main survey app. Add a special admin config when the admin app is separate.
    /** Get a custom admin interview stat widget, or undefined to use the default one */
    getCustomInterviewStat: () => React.Component | undefined;
    /** Get a custom admin interview map widget, or undefined to use the default one */
    getCustomInterviewMap: () => React.Component | undefined;
    /** Get the custom admin monitoring components, can be empty */
    getAdminMonitoringComponents: () => React.Component[];
    /** Get the admin validation functions, or undefined if none
     *
     * TODO Type the validation functions
     */
    getAdminValidations: () => any[] | undefined;
    /** Get the admin parsers, can be empty
     *
     * TODO Type the parsers and describe why it's used
     */
    getParsers: () => any[];
};

setApplicationConfiguration({
    section: {},
    widgets: {},
    projectHelpers: {},
    allowedUrlFields: [],
    getCustomInterviewStat: () => undefined,
    getCustomInterviewMap: () => undefined,
    getAdminValidations: () => undefined,
    getAdminMonitoringComponents: () => [],
    getParsers: () => []
});

export default appConfig as ApplicationConfiguration<
    EvolutionApplicationConfiguration<unknown, unknown, unknown, unknown>
>;
