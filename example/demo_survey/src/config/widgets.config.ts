import { WidgetConfig } from "evolution-common/lib/services/widgets";

// Types for the various custom responses. Note that for complete type check,
// ALL responses should be typed and no `[key: string]: type` fields otherwise
// type-check will accept everything.
export type SurveyBase = {
    accessCode?: string;
}

export type SurveyHousehold = {
    carNumber?: number;

};

export type SurveyPerson = {
    workOnTheRoad?: boolean;
    nickname: string;
    occupation: string;
};

export type SurveyHome = {
    
};

export type SurveyWidgetConfig = WidgetConfig<SurveyBase, SurveyHousehold, SurveyHome, SurveyPerson>;