/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons/faCheckCircle';
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay';

import surveyHelper from 'evolution-legacy/lib/helpers/survey/survey';

const registrationCompletedWidgets = require('./widgets/registrationCompleted.js');

export const registrationCompletedBeforeStartButton = registrationCompletedWidgets.registrationCompletedBeforeStartButton;
export const registrationCompletedStartButton       = registrationCompletedWidgets.registrationCompletedStartButton;
export const registrationCompletedAfterStartButton  = registrationCompletedWidgets.registrationCompletedAfterStartButton;

const homeWidgets = require('./widgets/home.js');

export const accessCode          = homeWidgets.accessCode;
export const interviewLanguage   = homeWidgets.interviewLanguage;
export const homeIntro           = homeWidgets.homeIntro;
export const householdSize       = homeWidgets.householdSize;
export const householdCarNumber  = homeWidgets.householdCarNumber;
export const homeDwellingType    = homeWidgets.homeDwellingType;
export const homeAddress         = homeWidgets.homeAddress;
export const homeApartmentNumber = homeWidgets.homeApartmentNumber
export const homeCity            = homeWidgets.homeCity;
export const homeRegion          = homeWidgets.homeRegion;
export const homeCountry         = homeWidgets.homeCountry;
export const homePostalCode      = homeWidgets.homePostalCode;
export const homeGeography       = homeWidgets.homeGeography;

const householdMembersWidgets = require('./widgets/householdMembers.js');

export const householdMembers                      = householdMembersWidgets.householdMembers;
export const personAge                             = householdMembersWidgets.personAge;
export const personNickname                        = householdMembersWidgets.personNickname;
export const personGender                          = householdMembersWidgets.personGender;
export const personOccupation                      = householdMembersWidgets.personOccupation;
export const personDrivingLicenseOwner             = householdMembersWidgets.personDrivingLicenseOwner;
export const personTransitPassOwner                = householdMembersWidgets.personTransitPassOwner;
export const personTransitPasses                   = householdMembersWidgets.personTransitPasses;
export const personCarsharingMember                = householdMembersWidgets.personCarsharingMember;
export const personBikesharingMember               = householdMembersWidgets.personBikesharingMember;
export const personHasDisability                   = householdMembersWidgets.personHasDisability;
export const personCellphoneOwner                  = householdMembersWidgets.personCellphoneOwner;
export const personDidTrips                        = householdMembersWidgets.personDidTrips;
export const buttonSaveNextSectionHouseholdMembers = householdMembersWidgets.buttonSaveNextSectionHouseholdMembers;
export const selectPerson                          = householdMembersWidgets.selectPerson;
export const buttonSelectPersonConfirm             = householdMembersWidgets.buttonSelectPersonConfirm;
export const activePersonTitle                     = householdMembersWidgets.activePersonTitle;
export const buttonSwitchPerson                    = householdMembersWidgets.buttonSwitchPerson;

const profileWidgets = require('./widgets/profile.js');

export const personWorkOnTheRoad                 = profileWidgets.personWorkOnTheRoad;
export const personUsualWorkPlaceIsHome          = profileWidgets.personUsualWorkPlaceIsHome;
export const personWorkAtHomeAtLeastOnceAWeek    = profileWidgets.personWorkAtHomeAtLeastOnceAWeek;
export const personWorkAtHomeNumberOfDaysPerWeek = profileWidgets.personWorkAtHomeNumberOfDaysPerWeek;
export const personUsualWorkPlaceName            = profileWidgets.personUsualWorkPlaceName;
export const personUsualWorkPlaceGeography       = profileWidgets.personUsualWorkPlaceGeography;
export const personUsualSchoolPlaceName          = profileWidgets.personUsualSchoolPlaceName;
export const personUsualSchoolPlaceGeography     = profileWidgets.personUsualSchoolPlaceGeography;
export const personNewPerson                     = profileWidgets.personNewPerson;
export const partTwoIntroText                    = profileWidgets.partTwoIntroText;
export const partOneConfirmed                    = profileWidgets.partOneConfirmed;
export const personDidTripsProfile               = profileWidgets.personDidTripsProfile;
export const personDidTripsKnowTrips             = profileWidgets.personDidTripsKnowTrips;

export const groupedPersonWorkOnTheRoad                 = householdMembersWidgets.groupedPersonWorkOnTheRoad;
export const groupedPersonUsualWorkPlaceIsHome          = householdMembersWidgets.groupedPersonUsualWorkPlaceIsHome;
export const groupedPersonUsualWorkPlaceName            = householdMembersWidgets.groupedPersonUsualWorkPlaceName;
export const groupedPersonUsualWorkPlaceGeography       = householdMembersWidgets.groupedPersonUsualWorkPlaceGeography;
export const groupedPersonUsualSchoolPlaceName          = householdMembersWidgets.groupedPersonUsualSchoolPlaceName;
export const groupedPersonUsualSchoolPlaceGeography     = householdMembersWidgets.groupedPersonUsualSchoolPlaceGeography;
export const groupedPersonNoWorkTripReason              = householdMembersWidgets.groupedPersonNoWorkTripReason;
export const groupedPersonNoSchoolTripReason            = householdMembersWidgets.groupedPersonNoSchoolTripReason;
export const groupedPersonWhoAnsweredForThisPerson      = householdMembersWidgets.groupedPersonWhoAnsweredForThisPerson;

const visitedPlacesWidgets = require('./widgets/visitedPlaces.js');

export const visitedPlacesIntro                    = visitedPlacesWidgets.visitedPlacesIntro;
export const personDeparturePlaceType              = visitedPlacesWidgets.personDeparturePlaceType;
export const visitedPlacesOutro                    = visitedPlacesWidgets.visitedPlacesOutro;
export const personVisitedPlacesTitle              = visitedPlacesWidgets.personVisitedPlacesTitle;
export const personVisitedPlaces                   = visitedPlacesWidgets.personVisitedPlaces;
export const personVisitedPlacesMap                = visitedPlacesWidgets.personVisitedPlacesMap;
export const personLastVisitedPlaceNotHome         = visitedPlacesWidgets.personLastVisitedPlaceNotHome;
export const visitedPlaceName                      = visitedPlacesWidgets.visitedPlaceName;
export const visitedPlaceActivity                  = visitedPlacesWidgets.visitedPlaceActivity;
export const visitedPlaceAlreadyVisited            = visitedPlacesWidgets.visitedPlaceAlreadyVisited;
export const visitedPlaceShortcut                  = visitedPlacesWidgets.visitedPlaceShortcut;
export const visitedPlaceGeography                 = visitedPlacesWidgets.visitedPlaceGeography;
export const visitedPlaceArrivalAndDepartureTime   = visitedPlacesWidgets.visitedPlaceArrivalAndDepartureTime;
export const visitedPlaceArrivalTime               = visitedPlacesWidgets.visitedPlaceArrivalTime;
//export const visitedPlaceIsNotLast                 = visitedPlacesWidgets.visitedPlaceIsNotLast;
export const visitedPlaceDepartureTime             = visitedPlacesWidgets.visitedPlaceDepartureTime;
//export const visitedPlaceWentBackHomeDirectlyAfter = visitedPlacesWidgets.visitedPlaceWentBackHomeDirectlyAfter;
export const visitedPlaceNextPlaceCategory         = visitedPlacesWidgets.visitedPlaceNextPlaceCategory;
export const buttonCancelVisitedPlace              = visitedPlacesWidgets.buttonCancelVisitedPlace;
export const buttonDeleteVisitedPlace              = visitedPlacesWidgets.buttonDeleteVisitedPlace;
export const buttonSaveVisitedPlace                = visitedPlacesWidgets.buttonSaveVisitedPlace;
export const buttonVisitedPlacesConfirmNextSection = visitedPlacesWidgets.buttonVisitedPlacesConfirmNextSection;

const segmentsWidgets = require('./widgets/segments.js');

export const personTrips                   = segmentsWidgets.personTrips;
export const personTripsTitle              = segmentsWidgets.personTripsTitle;
export const personTripsMap                = segmentsWidgets.personTripsMap;
export const segments                      = segmentsWidgets.segments;
export const segmentIntro                  = segmentsWidgets.segmentIntro;
export const segmentMode                   = segmentsWidgets.segmentMode;
export const segmentIsNotLast              = segmentsWidgets.segmentIsNotLast;
export const segmentParkingType            = segmentsWidgets.segmentParkingType;
export const segmentParkingPaymentType     = segmentsWidgets.segmentParkingPaymentType;
export const segmentVehicleOccupancy       = segmentsWidgets.segmentVehicleOccupancy;
export const segmentVehicleType            = segmentsWidgets.segmentVehicleType;
export const segmentDriver                 = segmentsWidgets.segmentDriver;
export const segmentBridgesAndTunnels      = segmentsWidgets.segmentBridgesAndTunnels;
export const segmentHighways               = segmentsWidgets.segmentHighways;
export const segmentUsedBikesharing        = segmentsWidgets.segmentUsedBikesharing;
export const segmentSubwayStationStart     = segmentsWidgets.segmentSubwayStationStart;
export const segmentSubwayStationEnd       = segmentsWidgets.segmentSubwayStationEnd;
export const segmentSubwayTransferStations = segmentsWidgets.segmentSubwayTransferStations;
export const segmentTrainStationStart      = segmentsWidgets.segmentTrainStationStart;
export const segmentTrainStationEnd        = segmentsWidgets.segmentTrainStationEnd;
export const segmentBusLines               = segmentsWidgets.segmentBusLines;
export const tripJunctionGeography         = segmentsWidgets.tripJunctionGeography;
export const introButtonSaveTrip           = segmentsWidgets.introButtonSaveTrip;
export const buttonSaveTrip                = segmentsWidgets.buttonSaveTrip;

const travelBehaviorWidgets = require('./widgets/travelBehavior.js');

export const personNoWorkTripReason         = travelBehaviorWidgets.personNoWorkTripReason;
export const personNoSchoolTripReason       = travelBehaviorWidgets.personNoSchoolTripReason;
export const personWhoAnsweredForThisPerson = travelBehaviorWidgets.personWhoAnsweredForThisPerson;

const endWidgets = require('./widgets/end.js');

export const householdResidentialPhoneType                 = endWidgets.householdResidentialPhoneType;
export const householdWouldLikeToParticipateInOtherSurveys = endWidgets.householdWouldLikeToParticipateInOtherSurveys;
export const householdDidAlsoRespondByPhone                = endWidgets.householdDidAlsoRespondByPhone;
export const householdContactEmail                         = endWidgets.householdContactEmail;
export const householdIncome                               = endWidgets.householdIncome;
export const householdSurveyAppreciation                   = endWidgets.householdSurveyAppreciation;
export const householdDateNextContact                      = endWidgets.householdDateNextContact;
export const householdCommentsOnSurvey                     = endWidgets.householdCommentsOnSurvey;
export const completedText                                 = endWidgets.completedText;

// multi-sections widgets:

export const buttonSaveNextSection = {
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

export const buttonSaveNextSection2 = {
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

export const buttonStartNextSection = {
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

export const buttonContinueNextSection = {
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

export const buttonConfirmNextSection = {
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

export const buttonCompleteInterview = {
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