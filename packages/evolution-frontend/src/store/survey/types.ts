/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { UserRuntimeInterviewAttributes, NavigationSection } from 'evolution-common/lib/services/questionnaire/types';
import { NavigationService } from 'evolution-common/lib/services/questionnaire/sections/NavigationService';

export enum SurveyActionTypes {
    SET_INTERVIEW = 'SET_INTERVIEW',
    UPDATE_INTERVIEW = 'UPDATE_INTERVIEW',
    ADD_CONSENT = 'ADD_CONSENT',
    NAVIGATE = 'NAVIGATE',
    INIT_NAVIGATE = 'INIT_NAVIGATE'
}

export type SurveyAction =
    | {
          type: SurveyActionTypes.SET_INTERVIEW;
          interview: UserRuntimeInterviewAttributes | undefined;
          interviewLoaded: boolean;
      }
    | {
          type: SurveyActionTypes.UPDATE_INTERVIEW;
          interview: UserRuntimeInterviewAttributes;
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
      }
    | {
          type: SurveyActionTypes.NAVIGATE;
          targetSection: NavigationSection;
      }
    | {
          type: SurveyActionTypes.INIT_NAVIGATE;
          navigationService: NavigationService;
      };

export type NavigationState = {
    /**
     * The current section path including iteration context
     */
    currentSection: NavigationSection;

    /**
     * Stack of sections previously visited, to enable back navigation
     */
    navigationHistory: NavigationSection[];
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
    readonly navigation?: NavigationState;
    readonly navigationService?: NavigationService;
}
