import { EvolutionApplicationConfiguration } from 'evolution-frontend/lib/config/application.config';
import * as SurveyTypes from './widgets.config';

export type SurveyAppConfig = EvolutionApplicationConfiguration<SurveyTypes.SurveyBase, SurveyTypes.SurveyHousehold, SurveyTypes.SurveyPerson, SurveyTypes.SurveyPlace, SurveyTypes.SurveyVehicle, SurveyTypes.SurveyVisitedPlace, SurveyTypes.SurveyTrip, SurveyTypes.SurveySegment>;
