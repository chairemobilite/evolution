/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons/faCheckCircle';
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay';

import surveyHelper from 'evolution-legacy/lib/helpers/survey/survey';
import { getSwitchPersonWidgets } from 'evolution-common/lib/services/sections/common/widgetsSwitchPerson';

const registrationCompletedWidgets = require('./widgets/registrationCompleted.js');

export const registrationCompletedBeforeStartButton: any = registrationCompletedWidgets.registrationCompletedBeforeStartButton;
export const registrationCompletedStartButton: any       = registrationCompletedWidgets.registrationCompletedStartButton;
export const registrationCompletedAfterStartButton: any  = registrationCompletedWidgets.registrationCompletedAfterStartButton;

import * as homeWidgets from './widgets/home';

export const accessCode          = homeWidgets.accessCode;
export const interviewLanguage: any   = homeWidgets.interviewLanguage;
export const homeIntro: any           = homeWidgets.homeIntro;
export const householdSize: any       = homeWidgets.householdSize;
export const householdCarNumber: any  = homeWidgets.householdCarNumber;
export const homeDwellingType: any    = homeWidgets.homeDwellingType;
export const homeAddress: any         = homeWidgets.homeAddress;
export const homeApartmentNumber: any = homeWidgets.homeApartmentNumber
export const homeCity: any            = homeWidgets.homeCity;
export const homeRegion: any          = homeWidgets.homeRegion;
export const homeCountry: any         = homeWidgets.homeCountry;
export const homePostalCode: any     = homeWidgets.homePostalCode;
export const homeGeography: any       = homeWidgets.homeGeography;

import * as householdMembersWidgets from './widgets/householdMembers';

export const householdMembers: any                      = householdMembersWidgets.householdMembers;
export const personAge: any                             = householdMembersWidgets.personAge;
export const personNickname: any                        = householdMembersWidgets.personNickname;
export const personGender: any                          = householdMembersWidgets.personGender;
export const personOccupation: any                      = householdMembersWidgets.personOccupation;
export const personDrivingLicenseOwnership: any         = householdMembersWidgets.personDrivingLicenseOwnership;
export const personTransitPassOwner: any                = householdMembersWidgets.personTransitPassOwner;
export const personTransitPasses: any                   = householdMembersWidgets.personTransitPasses;
export const personCarsharingMember: any                = householdMembersWidgets.personCarsharingMember;
export const personBikesharingMember: any               = householdMembersWidgets.personBikesharingMember;
export const personHasDisability: any                   = householdMembersWidgets.personHasDisability;
export const personCellphoneOwner: any                  = householdMembersWidgets.personCellphoneOwner;
export const personDidTrips: any                        = householdMembersWidgets.personDidTrips;
export const buttonSaveNextSectionHouseholdMembers: any = householdMembersWidgets.buttonSaveNextSectionHouseholdMembers;
export const selectPerson: any                          = householdMembersWidgets.selectPerson;
export const buttonSelectPersonConfirm: any             = householdMembersWidgets.buttonSelectPersonConfirm;
const switchPersonsWidget = getSwitchPersonWidgets();
export const activePersonTitle: any                     = switchPersonsWidget.activePersonTitle;
export const buttonSwitchPerson: any                    = switchPersonsWidget.buttonSwitchPerson;

import * as profileWidgets from './widgets/profile';

export const personWorkOnTheRoad: any                 = profileWidgets.personWorkOnTheRoad;
export const personUsualWorkPlaceIsHome: any          = profileWidgets.personUsualWorkPlaceIsHome;
export const personWorkAtHomeAtLeastOnceAWeek: any    = profileWidgets.personWorkAtHomeAtLeastOnceAWeek;
export const personWorkAtHomeNumberOfDaysPerWeek: any = profileWidgets.personWorkAtHomeNumberOfDaysPerWeek;
export const personUsualWorkPlaceName: any            = profileWidgets.personUsualWorkPlaceName;
export const personUsualWorkPlaceGeography: any       = profileWidgets.personUsualWorkPlaceGeography;
export const personUsualSchoolPlaceName: any          = profileWidgets.personUsualSchoolPlaceName;
export const personUsualSchoolPlaceGeography: any     = profileWidgets.personUsualSchoolPlaceGeography;
export const personNewPerson: any                     = profileWidgets.personNewPerson;
export const partTwoIntroText: any                    = profileWidgets.partTwoIntroText;
export const partOneConfirmed: any                    = profileWidgets.partOneConfirmed;
export const personDidTripsProfile: any               = profileWidgets.personDidTripsProfile;
export const personDidTripsKnowTrips: any             = profileWidgets.personDidTripsKnowTrips;

export const groupedPersonWorkOnTheRoad: any                 = householdMembersWidgets.groupedPersonWorkOnTheRoad;
export const groupedPersonUsualWorkPlaceIsHome: any          = householdMembersWidgets.groupedPersonUsualWorkPlaceIsHome;
export const groupedPersonUsualWorkPlaceName: any            = householdMembersWidgets.groupedPersonUsualWorkPlaceName;
export const groupedPersonUsualWorkPlaceGeography: any       = householdMembersWidgets.groupedPersonUsualWorkPlaceGeography;
export const groupedPersonUsualSchoolPlaceName: any          = householdMembersWidgets.groupedPersonUsualSchoolPlaceName;
export const groupedPersonUsualSchoolPlaceGeography: any     = householdMembersWidgets.groupedPersonUsualSchoolPlaceGeography;
export const groupedPersonNoWorkTripReason: any              = householdMembersWidgets.groupedPersonNoWorkTripReason;
export const groupedPersonNoSchoolTripReason: any            = householdMembersWidgets.groupedPersonNoSchoolTripReason;
export const groupedPersonWhoAnsweredForThisPerson: any      = householdMembersWidgets.groupedPersonWhoAnsweredForThisPerson;

import * as visitedPlacesWidgets from './widgets/visitedPlaces';

export const visitedPlacesIntro: any                    = visitedPlacesWidgets.visitedPlacesIntro;
export const personDeparturePlaceType: any              = visitedPlacesWidgets.personDeparturePlaceType;
export const visitedPlacesOutro: any                    = visitedPlacesWidgets.visitedPlacesOutro;
export const personVisitedPlacesTitle: any              = visitedPlacesWidgets.personVisitedPlacesTitle;
export const personVisitedPlaces: any                   = visitedPlacesWidgets.personVisitedPlaces;
export const personVisitedPlacesMap: any                = visitedPlacesWidgets.personVisitedPlacesMap;
export const personLastVisitedPlaceNotHome: any         = visitedPlacesWidgets.personLastVisitedPlaceNotHome;
export const visitedPlaceName: any                      = visitedPlacesWidgets.visitedPlaceName;
export const visitedPlaceActivity: any                  = visitedPlacesWidgets.visitedPlaceActivity;
export const visitedPlaceAlreadyVisited: any            = visitedPlacesWidgets.visitedPlaceAlreadyVisited;
export const visitedPlaceShortcut: any                  = visitedPlacesWidgets.visitedPlaceShortcut;
export const visitedPlaceGeography: any                 = visitedPlacesWidgets.visitedPlaceGeography;
export const visitedPlaceArrivalTime: any               = visitedPlacesWidgets.visitedPlaceArrivalTime;
//export const visitedPlaceIsNotLast                 = visitedPlacesWidgets.visitedPlaceIsNotLast;
export const visitedPlaceDepartureTime: any             = visitedPlacesWidgets.visitedPlaceDepartureTime;
//export const visitedPlaceWentBackHomeDirectlyAfter = visitedPlacesWidgets.visitedPlaceWentBackHomeDirectlyAfter;
export const visitedPlaceNextPlaceCategory: any         = visitedPlacesWidgets.visitedPlaceNextPlaceCategory;
export const buttonCancelVisitedPlace: any              = visitedPlacesWidgets.buttonCancelVisitedPlace;
export const buttonDeleteVisitedPlace: any              = visitedPlacesWidgets.buttonDeleteVisitedPlace;
export const buttonSaveVisitedPlace: any                = visitedPlacesWidgets.buttonSaveVisitedPlace;
export const buttonVisitedPlacesConfirmNextSection: any = visitedPlacesWidgets.buttonVisitedPlacesConfirmNextSection;

import * as segmentsWidgets from './widgets/segments';

export const personTrips: any                   = segmentsWidgets.personTrips;
export const personTripsTitle: any              = segmentsWidgets.personTripsTitle;
export const segments: any                      = segmentsWidgets.segments;
export const segmentIntro: any                  = segmentsWidgets.segmentIntro;
export const segmentSameModeAsReverseTrip: any  = segmentsWidgets.segmentSameModeAsReverseTrip;
export const segmentModePre: any                = segmentsWidgets.segmentModePre;
export const segmentMode: any                   = segmentsWidgets.segmentMode;
export const segmentHasNextMode: any            = segmentsWidgets.segmentHasNextMode;
export const segmentParkingType: any            = segmentsWidgets.segmentParkingType;
export const segmentParkingPaymentType: any     = segmentsWidgets.segmentParkingPaymentType;
export const segmentVehicleOccupancy: any       = segmentsWidgets.segmentVehicleOccupancy;
export const segmentVehicleType: any            = segmentsWidgets.segmentVehicleType;
export const segmentDriver: any                 = segmentsWidgets.segmentDriver;
export const segmentBridgesAndTunnels: any      = segmentsWidgets.segmentBridgesAndTunnels;
export const segmentHighways: any               = segmentsWidgets.segmentHighways;
export const segmentUsedBikesharing: any        = segmentsWidgets.segmentUsedBikesharing;
export const segmentSubwayStationStart: any     = segmentsWidgets.segmentSubwayStationStart;
export const segmentSubwayStationEnd: any       = segmentsWidgets.segmentSubwayStationEnd;
export const segmentSubwayTransferStations: any = segmentsWidgets.segmentSubwayTransferStations;
export const segmentTrainStationStart: any      = segmentsWidgets.segmentTrainStationStart;
export const segmentTrainStationEnd: any        = segmentsWidgets.segmentTrainStationEnd;
export const segmentBusLines: any               = segmentsWidgets.segmentBusLines;
export const tripJunctionGeography: any         = segmentsWidgets.tripJunctionGeography;
export const introButtonSaveTrip: any           = segmentsWidgets.introButtonSaveTrip;
export const buttonSaveTrip: any                = segmentsWidgets.buttonSaveTrip;

import * as travelBehaviorWidgets from './widgets/travelBehavior';

export const personNoWorkTripReason: any         = travelBehaviorWidgets.personNoWorkTripReason;
export const personNoSchoolTripReason: any       = travelBehaviorWidgets.personNoSchoolTripReason;
export const personWhoAnsweredForThisPerson: any = travelBehaviorWidgets.personWhoAnsweredForThisPerson;

import * as endWidgets from './widgets/end';

export const householdResidentialPhoneType: any                 = endWidgets.householdResidentialPhoneType;
export const householdWouldLikeToParticipateInOtherSurveys: any = endWidgets.householdWouldLikeToParticipateInOtherSurveys;
export const householdDidAlsoRespondByPhone: any                = endWidgets.householdDidAlsoRespondByPhone;
export const householdContactEmail: any                         = endWidgets.householdContactEmail;
export const householdIncome: any                               = endWidgets.householdIncome;
export const householdSurveyAppreciation: any                   = endWidgets.householdSurveyAppreciation;
export const householdDateNextContact: any                      = endWidgets.householdDateNextContact;
export const householdCommentsOnSurvey: any                     = endWidgets.householdCommentsOnSurvey;
export const completedText: any                                 = endWidgets.completedText;

// multi-sections widgets:

export const buttonSaveNextSection: any = {
  type: "button",
  path: "buttonSaveNextSection",
  color: "green",
  label: {
    fr: "Sauvegarder et continuer",
    en: "Save and continue"
  },
  hideWhenRefreshing: true,
  icon: faCheckCircle,
  align: 'center',
  action: surveyHelper.validateButtonAction
};

export const buttonSaveNextSection2: any = {
  type: "button",
  path: "buttonSaveNextSection2",
  color: "green",
  label: {
    fr: "Sauvegarder et continuer",
    en: "Save and continue"
  },
  hideWhenRefreshing: true,
  icon: faCheckCircle,
  align: 'center',
  action: surveyHelper.validateButtonAction
};

export const buttonStartNextSection: any = {
  type: "button",
  path: "buttonStartNextSection",
  color: "green",
  label: {
    fr: "Débuter",
    en: "Start"
  },
  hideWhenRefreshing: true,
  icon: faPlay,
  align: 'center',
  action: surveyHelper.validateButtonAction
}

export const buttonContinueNextSection: any = {
  type: "button",
  path: "buttonContinueNextSection",
  color: "green",
  label: {
    fr: "Continuer",
    en: "Continue"
  },
  hideWhenRefreshing: true,
  icon: faCheckCircle,
  align: 'center',
  action: surveyHelper.validateButtonAction
};

export const buttonConfirmNextSection: any = {
  type: "button",
  path: "buttonConfirmNextSection",
  color: "green",
  label: {
    fr: "Confirmer et continuer",
    en: "Confirm and continue"
  },
  hideWhenRefreshing: true,
  icon: faCheckCircle,
  align: 'center',
  action: surveyHelper.validateButtonAction
};

export const buttonCompleteInterview: any = {
  type: "button",
  path: "buttonCompleteInterview",
  color: "green",
  label: {
    fr: "Terminer l'entrevue",
    en: "Complete interview"
  },
  hideWhenRefreshing: true,
  icon: faCheckCircle,
  align: 'center',
  action: surveyHelper.validateButtonAction
};