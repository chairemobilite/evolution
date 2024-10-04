/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import projectConfig, {
    ProjectConfiguration,
    setProjectConfiguration
} from 'chaire-lib-common/lib/config/shared/project.config';

/**
 * Specific configuration for the Evolution project
 */
export type EvolutionProjectConfiguration = {
    /** Used for Google Maps localization. See
     * https://developers.google.com/maps/coverage for possible region codes */
    region: string;
    /** Whether to log database updates. FIXME This should be server-side only
     * */
    logDatabaseUpdates: boolean;
    /** Age for self response. For household surveys, it is the age from which
     * respondents will be invited to complete their own trips. Defaults to 14
     * */
    selfResponseMinimumAge: number;
    /**
     * Age at which a person could possibly own a driving license in the survey
     * area. Defaults to 16
     * */
    drivingLicenseAge: number;
    mapDefaultCenter: {
        lat: number;
        lon: number;
    };

    // TODO Add more project configuration types
};

// Make sure default values are set
setProjectConfiguration<EvolutionProjectConfiguration>(
    Object.assign(
        {
            region: 'CA',
            logDatabaseUpdates: false,
            selfResponseMinimumAge: 14,
            drivingLicenseAge: 16,
            mapDefaultCenter: {
                lat: 45.5,
                lon: -73.6
            }
        },
        projectConfig
    )
);

export default projectConfig as ProjectConfiguration<EvolutionProjectConfiguration>;
