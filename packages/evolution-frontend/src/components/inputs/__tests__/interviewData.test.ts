import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

type CustomSurvey = {
    section1?: {
        q1?: string;
        q2?: number;
    };
    section2?: {
        q1?: string;
    }
}

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

test('dummy', () => {
    // Needs at least one test in the file
});