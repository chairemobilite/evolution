/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// Mock the project config directly to avoid loading external files and environment variables
jest.mock('evolution-common/lib/config/project.config', () => ({
    __esModule: true,
    default: {
        surveyAreaGeojsonPath: undefined
    }
}));

// Mock the file manager directly to avoid dependency on chaire-lib-backend config side effects
jest.mock('chaire-lib-backend/lib/utils/filesystem/fileManager', () => ({
    fileManager: {
        fileExists: jest.fn(),
        readFile: jest.fn()
    }
}));

describe('AuditCheckUtils', () => {
    test('should return undefined if surveyAreaGeojsonPath is not set', async () => {
        await jest.isolateModulesAsync(async () => {
            const { getSurveyArea } = await import('../AuditCheckUtils');
            const { fileManager } = await import('chaire-lib-backend/lib/utils/filesystem/fileManager');
            const mockFileManager = fileManager as jest.Mocked<typeof fileManager>;

            const result = getSurveyArea();
            expect(result).toBeUndefined();
            expect(mockFileManager.fileExists).not.toHaveBeenCalled();
        });
    });

    describe('when surveyAreaGeojsonPath is set', () => {
        const testPath = 'example/demo_survey/surveyArea.geojson.example';

        test('should load and return the feature if file exists', async () => {
            await jest.isolateModulesAsync(async () => {
                const { getSurveyArea } = await import('../AuditCheckUtils');
                const projectConfig = (await import('evolution-common/lib/config/project.config')).default;
                const { fileManager } = await import('chaire-lib-backend/lib/utils/filesystem/fileManager');
                const mockFileManager = fileManager as jest.Mocked<typeof fileManager>;

                (projectConfig as any).surveyAreaGeojsonPath = testPath;
                const mockFeature = {
                    type: 'Feature',
                    geometry: { type: 'Polygon', coordinates: [] },
                    properties: { name: 'Test' }
                };
                mockFileManager.fileExists.mockReturnValue(true);
                mockFileManager.readFile.mockReturnValue(JSON.stringify({
                    type: 'FeatureCollection',
                    features: [mockFeature]
                }));

                const result = getSurveyArea();
                expect(result).toEqual(mockFeature);
                expect(mockFileManager.fileExists).toHaveBeenCalledWith(testPath);
            });
        });

        test('should return undefined if file does not exist', async () => {
            await jest.isolateModulesAsync(async () => {
                const { getSurveyArea } = await import('../AuditCheckUtils');
                const projectConfig = (await import('evolution-common/lib/config/project.config')).default;
                const { fileManager } = await import('chaire-lib-backend/lib/utils/filesystem/fileManager');
                const mockFileManager = fileManager as jest.Mocked<typeof fileManager>;

                (projectConfig as any).surveyAreaGeojsonPath = testPath;
                mockFileManager.fileExists.mockReturnValue(false);
                const result = getSurveyArea();
                expect(result).toBeUndefined();
                expect(mockFileManager.fileExists).toHaveBeenCalledWith(testPath);
            });
        });

        test('should return undefined if file contains invalid JSON', async () => {
            await jest.isolateModulesAsync(async () => {
                const { getSurveyArea } = await import('../AuditCheckUtils');
                const projectConfig = (await import('evolution-common/lib/config/project.config')).default;
                const { fileManager } = await import('chaire-lib-backend/lib/utils/filesystem/fileManager');
                const mockFileManager = fileManager as jest.Mocked<typeof fileManager>;

                (projectConfig as any).surveyAreaGeojsonPath = testPath;
                mockFileManager.fileExists.mockReturnValue(true);
                mockFileManager.readFile.mockReturnValue('invalid-json');
                const result = getSurveyArea();
                expect(result).toBeUndefined();
            });
        });

        test('should use cached value on subsequent calls', async () => {
            await jest.isolateModulesAsync(async () => {
                const { getSurveyArea } = await import('../AuditCheckUtils');
                const projectConfig = (await import('evolution-common/lib/config/project.config')).default;
                const { fileManager } = await import('chaire-lib-backend/lib/utils/filesystem/fileManager');
                const mockFileManager = fileManager as jest.Mocked<typeof fileManager>;

                (projectConfig as any).surveyAreaGeojsonPath = testPath;
                mockFileManager.fileExists.mockReturnValue(true);
                mockFileManager.readFile.mockReturnValue(JSON.stringify({
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        geometry: { type: 'Polygon', coordinates: [] },
                        properties: {}
                    }]
                }));

                const result1 = getSurveyArea();
                const result2 = getSurveyArea();
                expect(result1).toBe(result2);
                expect(mockFileManager.readFile).toHaveBeenCalledTimes(1);
            });
        });
    });
});
