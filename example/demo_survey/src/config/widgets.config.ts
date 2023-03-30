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

export type SurveyPlace = {
    
};

export type SurveyVehicle = {
    
};

export type SurveyVisitedPlace = {
    
};

export type SurveyTrip = {
    
};

export type SurveySegment = {
    
};

export type SurveyWidgetConfig = WidgetConfig<SurveyBase, SurveyHousehold, SurveyPerson, SurveyPlace, SurveyVehicle, SurveyVisitedPlace, SurveyTrip, SurveySegment>;
