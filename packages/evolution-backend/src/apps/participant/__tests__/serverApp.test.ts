/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import express from 'express';
import request from 'supertest';
import { setupServerApp } from '../serverApp';
import * as surveyStatus from '../../../services/surveyStatus/surveyStatus';
import { fileManager } from 'chaire-lib-backend/lib/utils/filesystem/fileManager';

// Mock the dependencies
jest.mock('chaire-lib-backend/lib/config/server.config', () => ({
    __esModule: true,
    default: {
        projectShortname: 'test-project'
    }
}));

jest.mock('chaire-lib-backend/lib/config/shared/db.config', () => ({
    __esModule: true,
    default: {}
}));

jest.mock('../../../services/auth/participantAuthModel', () => ({
    participantAuthModel: {}
}));

jest.mock('../../../services/auth/auth.config', () => ({
    __esModule: true,
    default: jest.fn().mockReturnValue({
        initialize: jest.fn().mockReturnValue((req, res, next) => next()),
        session: jest.fn().mockReturnValue((req, res, next) => next())
    })
}));

jest.mock('chaire-lib-backend/lib/utils/filesystem/directoryManager', () => ({
    directoryManager: {
        createDirectoryIfNotExistsAbsolute: jest.fn(),
        createDirectoryIfNotExists: jest.fn()
    }
}));

jest.mock('chaire-lib-backend/lib/utils/filesystem/fileManager', () => ({
    fileManager: {
        fileExistsAbsolute: jest.fn().mockReturnValue(true)
    }
}));
const mockFileExistsAbsolute = fileManager.fileExistsAbsolute as jest.MockedFunction<typeof fileManager.fileExistsAbsolute>;

jest.mock('../../../api/auth.routes', () => ({
    __esModule: true,
    default: jest.fn()
}));

jest.mock('../../participant/routes', () => ({
    __esModule: true,
    default: jest.fn()
}));

jest.mock('chaire-lib-backend/lib/api/trRouting.routes', () => ({
    __esModule: true,
    default: jest.fn()
}));

jest.mock('connect-session-knex', () => {
    const MockStore = jest.fn().mockImplementation(() => ({
        on: jest.fn()
    }));
    return jest.fn().mockReturnValue(MockStore);
});

jest.mock('serve-favicon', () => {
    return jest.fn().mockReturnValue((req, res, next) => next());
});

// Mock the survey status module
jest.mock('../../../services/surveyStatus/surveyStatus');

describe('serverApp index path routing', () => {
    let app: express.Express;
    let sendFileMock: jest.Mock;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        // Set up the test environment
        process.env.NODE_ENV = 'test';
        process.env.EXPRESS_SESSION_SECRET_KEY = 'test-secret-key';

        // Create a new express app for each test
        app = express();

        // Create mock for sendFile
        sendFileMock = jest.fn();

        // Intercept all routes to mock sendFile BEFORE they are registered
        // This middleware must be added before setupServerApp is called
        app.use((req, res, next) => {
            const originalSendFile = res.sendFile.bind(res);
            res.sendFile = jest.fn((path: string, options?: any, callback?: any) => {
                sendFileMock(path);
                // Send mock response based on the file path
                if (path.includes('notFound404')) {
                    return res.status(404).send('404 Not Found');
                } else if (path.includes('index-survey-ended')) {
                    return res.status(200).send('Survey Ended Page');
                } else if (path.includes('index-survey')) {
                    return res.status(200).send('Survey Page');
                } else if (path.includes('incompatible')) {
                    return res.status(200).send('Incompatible Page');
                } else {
                    return res.status(200).send('File Content');
                }
            }) as any;
            next();
        });

        // Setup the server app AFTER adding the sendFile mock middleware
        setupServerApp(app);
    });

    afterEach(() => {
        // Clean up
        delete process.env.EXPRESS_SESSION_SECRET_KEY;
    });

    describe('* handler when survey is not ended', () => {
        beforeEach(() => {
            // Mock isSurveyEnded to return false
            jest.spyOn(surveyStatus, 'isSurveyEnded').mockReturnValue(false);
        });

        test('should return the regular index page for root path', async () => {
            const response = await request(app).get('/');

            expect(response.status).toBe(200);
            expect(response.text).toBe('Survey Page');
            expect(surveyStatus.isSurveyEnded).toHaveBeenCalled();
            expect(sendFileMock).toHaveBeenCalledWith(
                expect.stringContaining('index-survey-test-project_test.html')
            );
        });

        test('should return the regular index page for unmatched routes', async () => {
            const response = await request(app).get('/some/random/path');

            expect(response.status).toBe(200);
            expect(response.text).toBe('Survey Page');
            expect(surveyStatus.isSurveyEnded).toHaveBeenCalled();
            expect(sendFileMock).toHaveBeenCalledWith(
                expect.stringContaining('index-survey-test-project_test.html')
            );
        });

        test('should return 404 for file extensions that do not exist', async () => {
            const response = await request(app).get('/nonexistent.php');

            expect(response.status).toBe(404);
            expect(sendFileMock).toHaveBeenCalledWith(
                expect.stringContaining('notFound404.html')
            );
        });
    });

    describe('* handler when survey has ended', () => {
        beforeEach(() => {
            // Mock isSurveyEnded to return true
            jest.spyOn(surveyStatus, 'isSurveyEnded').mockReturnValue(true);
        });

        test('should return the survey ended index page for root path', async () => {
            const response = await request(app).get('/');

            expect(response.status).toBe(200);
            expect(response.text).toBe('Survey Ended Page');
            expect(surveyStatus.isSurveyEnded).toHaveBeenCalled();
            expect(sendFileMock).toHaveBeenCalledWith(
                expect.stringContaining('index-survey-ended-test-project_test.html')
            );
        });

        test('should return the survey ended index page for unmatched routes', async () => {
            const response = await request(app).get('/some/random/path');

            expect(response.status).toBe(200);
            expect(response.text).toBe('Survey Ended Page');
            expect(surveyStatus.isSurveyEnded).toHaveBeenCalled();
            expect(sendFileMock).toHaveBeenCalledWith(
                expect.stringContaining('index-survey-ended-test-project_test.html')
            );
        });

        test('should return 404 for file extensions that do not exist', async () => {
            const response = await request(app).get('/nonexistent.php');

            expect(response.status).toBe(404);
            expect(sendFileMock).toHaveBeenCalledWith(
                expect.stringContaining('notFound404.html')
            );
        });

        test('should serve regular index if survey ended page does not exist', async () => {
            mockFileExistsAbsolute.mockReturnValueOnce(false);
            // Create a new express app this test to override the previous setup and simulate missing survey ended page
            app = express();

            // Create mock for sendFile
            sendFileMock = jest.fn();

            // Intercept all routes to mock sendFile BEFORE they are registered
            // This middleware must be added before setupServerApp is called
            app.use((req, res, next) => {
                const originalSendFile = res.sendFile.bind(res);
                res.sendFile = jest.fn((path: string, options?: any, callback?: any) => {
                    sendFileMock(path);
                    // Send mock response based on the file path
                    if (path.includes('notFound404')) {
                        return res.status(404).send('404 Not Found');
                    } else if (path.includes('index-survey-ended')) {
                        return res.status(200).send('Survey Ended Page');
                    } else if (path.includes('index-survey')) {
                        return res.status(200).send('Survey Page');
                    } else if (path.includes('incompatible')) {
                        return res.status(200).send('Incompatible Page');
                    } else {
                        return res.status(200).send('File Content');
                    }
                }) as any;
                next();
            });

            setupServerApp(app);

            const response = await request(app).get('/');

            expect(response.status).toBe(200);
            expect(response.text).toBe('Survey Page');
            expect(surveyStatus.isSurveyEnded).toHaveBeenCalled();
            expect(sendFileMock).toHaveBeenCalledWith(
                expect.stringContaining('index-survey-test-project_test.html')
            );
            expect(mockFileExistsAbsolute).toHaveBeenCalledWith(
                expect.stringContaining('index-survey-ended-test-project_test.html')
            );
        });
    });

    describe('* handler with file extension handling', () => {
        beforeEach(() => {
            jest.spyOn(surveyStatus, 'isSurveyEnded').mockReturnValue(false);
        });

        test('should return 404 for .png files that do not exist', async () => {
            const response = await request(app).get('/missing-image.png');
            expect(response.status).toBe(404);
        });

        test('should return 404 for .json files that do not exist', async () => {
            const response = await request(app).get('/missing-data.json');
            expect(response.status).toBe(404);
        });

        test('should not treat query parameters as file extensions', async () => {
            const response = await request(app).get('/path?file=test.js');
            // Should return the index page, not 404
            expect(response.status).toBe(200);
            expect(surveyStatus.isSurveyEnded).toHaveBeenCalled();
        });
    });

    describe('special routes', () => {
        beforeEach(() => {
            jest.spyOn(surveyStatus, 'isSurveyEnded').mockReturnValue(false);
        });

        test('should return status for /ping endpoint', async () => {
            const response = await request(app).get('/ping');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ status: 'online' });
        });

        test('should return incompatible page for /incompatible endpoint', async () => {
            const response = await request(app).get('/incompatible');

            expect(response.status).toBe(200);
            // Note: The actual file content would be checked in integration tests
        });
    });

    describe('custom server setup function', () => {
        test('should call the custom setup function if provided', () => {
            const mockSetupFct = jest.fn();
            const testApp = express();

            setupServerApp(testApp, mockSetupFct);

            expect(mockSetupFct).toHaveBeenCalled();
        });

        test('should handle errors from custom setup function gracefully', () => {
            const mockSetupFct = jest.fn().mockImplementation(() => {
                throw new Error('Setup error');
            });
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const testApp = express();

            expect(() => setupServerApp(testApp, mockSetupFct)).not.toThrow();
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error running project specific server setup function: ',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });

        test('should work without a custom setup function', () => {
            const testApp = express();

            expect(() => setupServerApp(testApp)).not.toThrow();
        });
    });

    test.todo('add tests for missing or existing js/css files handled by other handlers than *');
});
