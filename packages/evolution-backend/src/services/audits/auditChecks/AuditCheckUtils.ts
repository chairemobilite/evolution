/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { fileManager } from 'chaire-lib-backend/lib/utils/filesystem/fileManager';
import projectConfig from 'evolution-common/lib/config/project.config';

let cachedSurveyArea: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | undefined = undefined;
let surveyAreaLoaded = false;

/**
 * Load and cache the survey area GeoJSON file from the survey directory.
 * The survey area file path is specified in the surveyAreaGeojsonPath property of the project configuration.
 * @returns The first feature of the survey area FeatureCollection, or undefined if not found or invalid.
 */
export const getSurveyArea = (): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | undefined => {
    if (surveyAreaLoaded) {
        return cachedSurveyArea;
    }

    const surveyAreaPath = projectConfig.surveyAreaGeojsonPath;
    if (!surveyAreaPath) {
        surveyAreaLoaded = true;
        return undefined;
    }

    if (fileManager.fileExists(surveyAreaPath)) {
        try {
            const geojsonRaw = fileManager.readFile(surveyAreaPath);
            if (geojsonRaw) {
                const geojson = JSON.parse(geojsonRaw) as GeoJSON.FeatureCollection;
                if (geojson.type === 'FeatureCollection' && geojson.features.length > 0) {
                    const firstFeature = geojson.features[0];
                    if (
                        firstFeature.geometry &&
                        (firstFeature.geometry.type === 'Polygon' || firstFeature.geometry.type === 'MultiPolygon')
                    ) {
                        cachedSurveyArea = firstFeature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
                    }
                }
            }
        } catch (error) {
            console.error(`Error loading survey area GeoJSON from ${surveyAreaPath}:`, error);
        }
    } else {
        console.info(`Survey area GeoJSON not found at ${surveyAreaPath}, skipping territorial validation`);
    }

    surveyAreaLoaded = true;
    return cachedSurveyArea;
};
