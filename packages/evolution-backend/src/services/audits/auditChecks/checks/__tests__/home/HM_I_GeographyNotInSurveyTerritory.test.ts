/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import { homeAuditChecks } from '../../HomeAuditChecks';
import { createContextWithHome } from './testHelper';
import * as auditCheckUtils from '../../../AuditCheckUtils';

// Mock the AuditCheckUtils to provide a controlled survey area
jest.mock('../../../AuditCheckUtils', () => ({
    getSurveyArea: jest.fn()
}));

const mockGetSurveyArea = auditCheckUtils.getSurveyArea as jest.Mock;

describe('HM_I_geographyNotInSurveyTerritory audit check', () => {
    const validUuid = uuidV4();
    const surveyArea: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Polygon',
            coordinates: [
                [
                    [-74.0, 45.0],
                    [-73.0, 45.0],
                    [-73.0, 46.0],
                    [-74.0, 46.0],
                    [-74.0, 45.0]
                ]
            ]
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should pass when home geography is inside the survey area', () => {
        mockGetSurveyArea.mockReturnValue(surveyArea);
        const context = createContextWithHome({
            geography: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point',
                    coordinates: [-73.5, 45.5]
                }
            }
        });

        const result = homeAuditChecks.HM_I_geographyNotInSurveyTerritory(context);

        expect(result).toBeUndefined();
    });

    it('should fail when home geography is outside the survey area', () => {
        mockGetSurveyArea.mockReturnValue(surveyArea);
        const context = createContextWithHome({
            geography: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point',
                    coordinates: [-75.0, 45.5] // Outside
                }
            }
        }, validUuid);

        const result = homeAuditChecks.HM_I_geographyNotInSurveyTerritory(context);

        expect(result).toMatchObject({
            objectType: 'home',
            objectUuid: validUuid,
            errorCode: 'HM_I_geographyNotInSurveyTerritory',
            version: 1,
            level: 'error',
            message: 'Home geography is outside of the survey territory',
            ignore: false
        });
    });

    it('should pass when no survey area is available', () => {
        mockGetSurveyArea.mockReturnValue(undefined);
        const context = createContextWithHome({
            geography: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point',
                    coordinates: [-75.0, 45.5]
                }
            }
        });

        const result = homeAuditChecks.HM_I_geographyNotInSurveyTerritory(context);

        expect(result).toBeUndefined();
    });

    it('should pass if geography is missing (handled by HM_M_Geography)', () => {
        mockGetSurveyArea.mockReturnValue(surveyArea);
        const context = createContextWithHome({ geography: undefined });

        const result = homeAuditChecks.HM_I_geographyNotInSurveyTerritory(context);

        expect(result).toBeUndefined();
    });

    it('should pass if geography is invalid (handled by HM_I_Geography)', () => {
        mockGetSurveyArea.mockReturnValue(surveyArea);
        const context = createContextWithHome({
            geography: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point',
                    coordinates: [-73.5] // Invalid
                } as any
            }
        });

        const result = homeAuditChecks.HM_I_geographyNotInSurveyTerritory(context);

        expect(result).toBeUndefined();
    });
});
