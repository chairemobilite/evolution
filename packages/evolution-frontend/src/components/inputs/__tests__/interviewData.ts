import { UserInterviewAttributes, UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

export const interviewAttributes: UserInterviewAttributes = {
    id: 1,
    uuid: 'arbitrary uuid',
    participant_id: 1,
    is_completed: false,
    response: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        }
    } as any,
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    } as any,
    is_valid: true
};

export const runtimeInterviewAttributes: UserRuntimeInterviewAttributes = {
    ...interviewAttributes,
    widgets: {},
    groups: {},
    visibleWidgets: [],
    allWidgetsValid: true
};

// FIXME These are widgets from the segment section, they will do for a mockup, but see if we need/want anything more specific
export const surveyContext = {
    widgets: {
        segmentMode: {},
        personTrips: {},
        activePersonTitle: {},
        personTripsTitle: {},
        buttonSwitchPerson: {},
        personVisitedPlacesMap: {},
        buttonConfirmNextSection: {}
    }
};