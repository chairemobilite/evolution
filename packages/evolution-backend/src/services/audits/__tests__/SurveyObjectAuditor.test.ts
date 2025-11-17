/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { SurveyObjectAuditor } from '../SurveyObjectAuditor';
import { SurveyObjectsWithAudits } from 'evolution-common/lib/services/audits/types';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import {
    runInterviewAuditChecks,
    runHouseholdAuditChecks,
    runHomeAuditChecks,
    runVisitedPlaceAuditChecks
} from '../auditChecks';
import { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';

// Mock the audit functions
jest.mock('../auditChecks', () => {
    // Create mock functions inside the factory to avoid hoisting issues
    const mockNormalCheck = jest.fn();
    const mockExtendedCheck = jest.fn();

    return {
        runInterviewAuditChecks: jest.fn().mockResolvedValue([
            {
                objectType: 'interview',
                objectUuid: 'interview-uuid',
                errorCode: 'I_L_InterviewAudited',
                level: 'info',
                message: 'Interview audited',
                version: 1,
                ignore: false
            }
        ]),
        runHouseholdAuditChecks: jest.fn().mockResolvedValue([
            {
                objectType: 'household',
                objectUuid: 'household-uuid',
                errorCode: 'HH_I_Size',
                level: 'error',
                message: 'Invalid household size',
                version: 1,
                ignore: false
            }
        ]),
        runHomeAuditChecks: jest.fn().mockResolvedValue([
            {
                objectType: 'home',
                objectUuid: 'home-uuid',
                errorCode: 'HM_I_Address',
                level: 'warning',
                message: 'Invalid home address',
                version: 1,
                ignore: false
            }
        ]),
        runPersonAuditChecks: jest.fn().mockResolvedValue([]),
        runJourneyAuditChecks: jest.fn().mockResolvedValue([]),
        runVisitedPlaceAuditChecks: jest.fn().mockResolvedValue([
            {
                objectType: 'visitedPlace',
                objectUuid: 'visitedplace-uuid',
                errorCode: 'VP_M_Geography',
                level: 'warning',
                message: 'Missing geography',
                version: 1,
                ignore: false
            }
        ]),
        runTripAuditChecks: jest.fn().mockResolvedValue([]),
        runSegmentAuditChecks: jest.fn().mockResolvedValue([]),
        interviewAuditChecks: { normalCheck: mockNormalCheck },
        householdAuditChecks: { normalCheck: mockNormalCheck },
        homeAuditChecks: { normalCheck: mockNormalCheck },
        personAuditChecks: { normalCheck: mockNormalCheck },
        journeyAuditChecks: { normalCheck: mockNormalCheck },
        visitedPlaceAuditChecks: { normalCheck: mockNormalCheck },
        tripAuditChecks: { normalCheck: mockNormalCheck },
        segmentAuditChecks: { normalCheck: mockNormalCheck },
        interviewExtendedAuditChecks: { extendedCheck: mockExtendedCheck },
        householdExtendedAuditChecks: { extendedCheck: mockExtendedCheck },
        homeExtendedAuditChecks: { extendedCheck: mockExtendedCheck },
        personExtendedAuditChecks: { extendedCheck: mockExtendedCheck },
        journeyExtendedAuditChecks: { extendedCheck: mockExtendedCheck },
        visitedPlaceExtendedAuditChecks: { extendedCheck: mockExtendedCheck },
        tripExtendedAuditChecks: { extendedCheck: mockExtendedCheck },
        segmentExtendedAuditChecks: { extendedCheck: mockExtendedCheck }
    };
});


describe('SurveyObjectAuditor', () => {
    const interviewUuid = uuidV4();
    const householdUuid = uuidV4();
    const personUuid = uuidV4();
    const journeyUuid = uuidV4();
    const visitedPlaceUuid = uuidV4();
    const tripUuid = uuidV4();

    const createMockSurveyObjects = (): SurveyObjectsWithAudits => {
        const mockInterview = { _uuid: interviewUuid, _id: 123 } as unknown as Interview;
        const mockHome = { _uuid: 'home-uuid' } as Home;
        const mockHousehold = { _uuid: householdUuid, size: 2, members: [] } as unknown as Household;

        const mockVisitedPlace = {
            _uuid: visitedPlaceUuid,
            activity: 'work',
            geography: { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.5, 45.5] } }
        } as VisitedPlace;

        const mockTrip = {
            _uuid: tripUuid,
            mode: 'transit',
            segments: []
        } as unknown as Trip;

        const mockJourney = {
            _uuid: journeyUuid,
            visitedPlaces: [mockVisitedPlace],
            trips: [mockTrip]
        } as Journey;

        const mockPerson = {
            _uuid: personUuid,
            age: 30,
            journeys: [mockJourney]
        } as Person;

        mockHousehold.members = [mockPerson];

        return {
            interview: mockInterview as unknown as Interview,
            home: mockHome,
            household: mockHousehold,
            audits: []
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('auditSurveyObjects', () => {
        it('should audit interview when present', async () => {
            const surveyObjects = createMockSurveyObjects();

            const audits = await SurveyObjectAuditor.auditSurveyObjects(surveyObjects);

            expect(runInterviewAuditChecks).toHaveBeenCalledWith(
                {
                    interview: surveyObjects.interview
                },
                expect.any(Object)
            );

            expect(audits).toContainEqual({
                objectType: 'interview',
                objectUuid: 'interview-uuid',
                errorCode: 'I_L_InterviewAudited',
                level: 'info',
                message: 'Interview audited',
                version: 1,
                ignore: false
            });
        });

        it('should audit household when present', async () => {
            const surveyObjects = createMockSurveyObjects();

            const audits = await SurveyObjectAuditor.auditSurveyObjects(surveyObjects);

            expect(runHouseholdAuditChecks).toHaveBeenCalledWith(
                {
                    household: surveyObjects.household,
                    interview: surveyObjects.interview
                },
                expect.any(Object)
            );

            expect(audits).toContainEqual({
                objectType: 'household',
                objectUuid: 'household-uuid',
                errorCode: 'HH_I_Size',
                level: 'error',
                message: 'Invalid household size',
                version: 1,
                ignore: false
            });
        });

        it('should audit home when present', async () => {
            const surveyObjects = createMockSurveyObjects();

            const audits = await SurveyObjectAuditor.auditSurveyObjects(surveyObjects);

            expect(runHomeAuditChecks).toHaveBeenCalledWith(
                {
                    home: surveyObjects.home,
                    household: surveyObjects.household,
                    interview: surveyObjects.interview
                },
                expect.any(Object)
            );

            expect(audits).toContainEqual({
                objectType: 'home',
                objectUuid: 'home-uuid',
                errorCode: 'HM_I_Address',
                level: 'warning',
                message: 'Invalid home address',
                version: 1,
                ignore: false
            });
        });

        it('should audit visited places with full hierarchy context', async () => {
            const surveyObjects = createMockSurveyObjects();

            const audits = await SurveyObjectAuditor.auditSurveyObjects(surveyObjects);

            expect(runVisitedPlaceAuditChecks).toHaveBeenCalledWith(
                {
                    visitedPlace: surveyObjects.household?.members?.[0]?.journeys?.[0]?.visitedPlaces?.[0],
                    person: surveyObjects.household?.members?.[0],
                    journey: surveyObjects.household?.members?.[0]?.journeys?.[0],
                    household: surveyObjects.household,
                    home: surveyObjects.home,
                    interview: surveyObjects.interview
                },
                expect.any(Object)
            );

            expect(audits).toContainEqual({
                objectType: 'visitedPlace',
                objectUuid: 'visitedplace-uuid',
                errorCode: 'VP_M_Geography',
                level: 'warning',
                message: 'Missing geography',
                version: 1,
                ignore: false
            });
        });

        it('should handle missing survey objects gracefully', async () => {
            const surveyObjects: SurveyObjectsWithAudits = {
                audits: [],
                interview: undefined,
                household: undefined,
                home: undefined,
                auditsByObject: {
                    interview: [],
                    household: [],
                    home: [],
                    persons: {},
                    journeys: {},
                    visitedPlaces: {},
                    trips: {},
                    segments: {}
                }
            };

            const audits = await SurveyObjectAuditor.auditSurveyObjects(surveyObjects);

            expect(runInterviewAuditChecks).not.toHaveBeenCalled();
            expect(runHouseholdAuditChecks).not.toHaveBeenCalled();
            expect(runHomeAuditChecks).not.toHaveBeenCalled();
            expect(runVisitedPlaceAuditChecks).not.toHaveBeenCalled();
            expect(audits).toHaveLength(0);
        });

        it('should handle household without members', async () => {
            const surveyObjects = createMockSurveyObjects();
            if (surveyObjects.household?.members) {
                surveyObjects.household.members = [];
            }

            const audits = await SurveyObjectAuditor.auditSurveyObjects(surveyObjects);

            expect(runInterviewAuditChecks).toHaveBeenCalled();
            expect(runHouseholdAuditChecks).toHaveBeenCalled();
            expect(runHomeAuditChecks).toHaveBeenCalled();
            expect(runVisitedPlaceAuditChecks).not.toHaveBeenCalled();

            // Should still have interview, household, and home audits
            expect(audits.length).toBeGreaterThanOrEqual(3);
        });

        it('should handle person without journeys', async () => {
            const surveyObjects = createMockSurveyObjects();
            if (surveyObjects.household?.members?.[0]) {
                surveyObjects.household.members[0].journeys = [];
            }

            const audits = await SurveyObjectAuditor.auditSurveyObjects(surveyObjects);

            expect(runVisitedPlaceAuditChecks).not.toHaveBeenCalled();

            // Should still have interview, household, and home audits
            expect(audits.length).toBeGreaterThanOrEqual(3);
        });

        it('should handle journey without visited places', async () => {
            const surveyObjects = createMockSurveyObjects();
            if (surveyObjects.household?.members?.[0]?.journeys?.[0]) {
                surveyObjects.household.members[0].journeys[0].visitedPlaces = [];
            }

            const audits = await SurveyObjectAuditor.auditSurveyObjects(surveyObjects);

            expect(runVisitedPlaceAuditChecks).not.toHaveBeenCalled();

            // Should still have interview, household, and home audits
            expect(audits.length).toBeGreaterThanOrEqual(3);
        });

        it('should combine all audits from different objects', async () => {
            const surveyObjects = createMockSurveyObjects();

            const audits = await SurveyObjectAuditor.auditSurveyObjects(surveyObjects);

            // Should have audits from interview, household, home, and visited place
            expect(audits.length).toBeGreaterThanOrEqual(4);

            // Check that we have audits from different object types
            const objectTypes = audits.map((audit) => audit.objectType);
            expect(objectTypes).toContain('interview');
            expect(objectTypes).toContain('household');
            expect(objectTypes).toContain('home');
            expect(objectTypes).toContain('visitedPlace');
        });

        describe('Extended Audit Checks Flag', () => {
            it('should pass only normal checks when runExtendedAuditChecks=false by default', async () => {
                const surveyObjects = createMockSurveyObjects();

                await SurveyObjectAuditor.auditSurveyObjects(surveyObjects);

                // Verify that only normal checks are passed (no extended checks)
                const interviewChecks = (runInterviewAuditChecks as jest.Mock).mock.calls[0][1];
                expect(interviewChecks).toHaveProperty('normalCheck');
                expect(interviewChecks).not.toHaveProperty('extendedCheck');

                const householdChecks = (runHouseholdAuditChecks as jest.Mock).mock.calls[0][1];
                expect(householdChecks).toHaveProperty('normalCheck');
                expect(householdChecks).not.toHaveProperty('extendedCheck');

                const homeChecks = (runHomeAuditChecks as jest.Mock).mock.calls[0][1];
                expect(homeChecks).toHaveProperty('normalCheck');
                expect(homeChecks).not.toHaveProperty('extendedCheck');
            });

            it('should pass both normal and extended checks when runExtendedAuditChecks=true', async () => {
                const surveyObjects = createMockSurveyObjects();

                await SurveyObjectAuditor.auditSurveyObjects(surveyObjects, true);

                // Verify that both normal and extended checks are passed
                const interviewChecks = (runInterviewAuditChecks as jest.Mock).mock.calls[0][1];
                expect(interviewChecks).toHaveProperty('normalCheck');
                expect(interviewChecks).toHaveProperty('extendedCheck');

                const householdChecks = (runHouseholdAuditChecks as jest.Mock).mock.calls[0][1];
                expect(householdChecks).toHaveProperty('normalCheck');
                expect(householdChecks).toHaveProperty('extendedCheck');

                const homeChecks = (runHomeAuditChecks as jest.Mock).mock.calls[0][1];
                expect(homeChecks).toHaveProperty('normalCheck');
                expect(homeChecks).toHaveProperty('extendedCheck');

                const visitedPlaceChecks = (runVisitedPlaceAuditChecks as jest.Mock).mock.calls[0][1];
                expect(visitedPlaceChecks).toHaveProperty('normalCheck');
                expect(visitedPlaceChecks).toHaveProperty('extendedCheck');
            });

            it('should pass only normal checks when runExtendedAuditChecks=false explicitly', async () => {
                const surveyObjects = createMockSurveyObjects();

                await SurveyObjectAuditor.auditSurveyObjects(surveyObjects, false);

                // Verify that only normal checks are passed (no extended checks)
                const interviewChecks = (runInterviewAuditChecks as jest.Mock).mock.calls[0][1];
                expect(interviewChecks).toHaveProperty('normalCheck');
                expect(interviewChecks).not.toHaveProperty('extendedCheck');

                const householdChecks = (runHouseholdAuditChecks as jest.Mock).mock.calls[0][1];
                expect(householdChecks).toHaveProperty('normalCheck');
                expect(householdChecks).not.toHaveProperty('extendedCheck');
            });
        });
    });
});
