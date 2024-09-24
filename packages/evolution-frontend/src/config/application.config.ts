import appConfig, {
    ApplicationConfiguration,
    setApplicationConfiguration
} from 'chaire-lib-frontend/lib/config/application.config';
import React from 'react';
import { SurveySections, SurveyWidgets } from '../services/interviews/interview';
import { SurveyObjectsWithAudits } from 'evolution-common/lib/services/audits/types';

export type EvolutionApplicationConfiguration = {
    /**
     * Survey sections
     */
    sections: SurveySections;
    /**
     * Survey widgets
     */
    widgets: SurveyWidgets;
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
    /**
     * This function is provided by surveys to deserialize the survey objects
     * and audits received from the backend.
     *
     * FIXME This is a temporary solution to allow the frontend to deserialize
     * objects and use those objects to get features. When all objects are part
     * of evolution, this won't be necessary, there will rather be an
     * `unserialize` function here instead (or something like that).
     */
    generateMapFeatures?: (attributes: SurveyObjectsWithAudits) => {
        placesCollection: GeoJSON.FeatureCollection<GeoJSON.Point>;
        tripsCollection: GeoJSON.FeatureCollection<GeoJSON.LineString>;
    };
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

export default appConfig as ApplicationConfiguration<EvolutionApplicationConfiguration>;
