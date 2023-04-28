import { UserInterviewAttributes } from "evolution-common/lib/services/interviews/interview";

type CustomSurvey = {
    section1?: {
        q1?: string;
        q2?: number;
    };
    section2?: {
        q1?: string;
    }
}

export const interviewAttributes: UserInterviewAttributes<CustomSurvey, unknown, unknown, unknown> = {
    id: 1,
    uuid: 'arbitrary uuid',
    participant_id: 1,
    is_completed: false,
    responses: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        }
    },
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    },
    is_valid: true
};

test('dummy', () => {
    // Needs at least one test in the file
});