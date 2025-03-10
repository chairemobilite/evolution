/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

export enum SurveyActionTypes {
    SET_INTERVIEW = 'SET_INTERVIEW',
    UPDATE_INTERVIEW = 'UPDATE_INTERVIEW',
    ADD_CONSENT = 'ADD_CONSENT'
}

export type SurveyAction =
    | {
          type: SurveyActionTypes.SET_INTERVIEW;
          // TODO Properly type the interview
          interview: any;
          interviewLoaded: boolean;
      }
    | {
          type: SurveyActionTypes.UPDATE_INTERVIEW;
          // TODO Properly type the interview
          interview: any;
          interviewLoaded: boolean;
          errors: {
              [key: string]: {
                  [key: string]: string;
              };
          };
          submitted: boolean;
      }
    | {
          type: SurveyActionTypes.ADD_CONSENT;
          consented: boolean;
      };

export interface SurveyState {
    readonly interview?: UserRuntimeInterviewAttributes;
    readonly interviewLoaded?: boolean;
    readonly errors?: {
        [key: string]: {
            [key: string]: string;
        };
    };
    readonly submitted?: boolean;
    readonly hasConsent?: boolean;
}
