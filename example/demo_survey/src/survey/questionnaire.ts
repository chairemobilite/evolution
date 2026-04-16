import { SegmentsSectionFactory } from 'evolution-common/lib/services/questionnaire/sections/segments/sectionSegments';
import { VisitedPlacesSectionFactory } from 'evolution-common/lib/services/questionnaire/sections/visitedPlaces/sectionVisitedPlaces';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import surveySections from './sections';
import * as widgetsConfig from './widgets';
import helper, { segmentSectionConfig, visitedPlacesSectionConfig, widgetFactoryOptions } from './helper';
import { getAndValidateSurveySections, SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { addGroupedObjects, getResponse } from 'evolution-common/lib/utils/helpers';

// FIXME For now this file is here and has quite a bit of code. Eventually, the
// questionnaire generation should be done in Evolution directly when we have
// more builtin stuff

const segmentSectionConfigFactory = new SegmentsSectionFactory(segmentSectionConfig, widgetFactoryOptions);
const segmentSectionConfigFromFactory = segmentSectionConfigFactory.getSectionConfig();

// Add the segments section to the exported configuration
const segmentConfig: SectionConfig = {
    ...segmentSectionConfigFromFactory,
    isSectionVisible: function (interview) {
        const person = odSurveyHelper.getPerson({ interview }) as any;
        return person && person.didTripsOnTripsDate === 'yes';
    },
    isSectionCompleted: (interview) => {
        const person = odSurveyHelper.getPerson({ interview });
        return helper.tripsForPersonComplete(person, interview);
    }
};

const visitedPlacesSectionConfigFactory = new VisitedPlacesSectionFactory(
    visitedPlacesSectionConfig,
    widgetFactoryOptions
);
const visitedPlacesSectionConfigFromFactory = visitedPlacesSectionConfigFactory.getSectionConfig();

// Add the visited places section to the exported configuration
const visitedPlacesConfig: SectionConfig = {
    ...visitedPlacesSectionConfigFromFactory,
    isSectionVisible: function (interview, iterationContext) {
        // Override the visibility condition, as the question about doing trips is not asked in the context of the journeyd in this survey
        // FIXME Use the default conditional when the tripsIntro section replaces current approach
        const person = odSurveyHelper.getPerson({
            interview,
            personId: iterationContext[iterationContext.length - 1]
        }) as any;
        return person && person.didTripsOnTripsDate === 'yes';
    },
    onSectionEntry: function (interview, iterationContext) {
        // FIXME Taking previous code, as the departurePlaceType is asked in this survey instead of departurePlaceIsHome and departurePlaceOther.
        const person = odSurveyHelper.getPerson({
            interview,
            personId: iterationContext[iterationContext.length - 1]
        }) as any;

        const tripsUpdatesValueByPath = {};
        const showNewPersonPopup = getResponse(interview, '_showNewPersonPopup', false);

        if (showNewPersonPopup !== false) {
            tripsUpdatesValueByPath['response._showNewPersonPopup'] = false;
        }

        // Journeys should not be empty
        const journeys = odSurveyHelper.getJourneysArray({ person });
        const currentJourney = journeys[0];
        const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey: currentJourney });

        if (visitedPlaces.length === 0) {
            // Add the first visited place
            const { valuesByPath: visitedPlacesValuesByPath, newObjects } = addGroupedObjects(
                interview,
                1,
                1,
                `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`,
                currentJourney.departurePlaceType === 'home' ? [{ activity: 'home' }] : []
            );
            const visitedPlaceUuid = newObjects[0]._uuid;
            // Select the new place as the active visited place, as well as the journey ID
            return Object.assign(tripsUpdatesValueByPath, visitedPlacesValuesByPath, {
                ['response._activeVisitedPlaceId']: visitedPlaceUuid,
                ['response._activeJourneyId']: currentJourney._uuid
            });
        } else {
            // Select the next visited place to edit
            const selectedVisitedPlaceId = helper.selectNextVisitedPlaceId(visitedPlaces);
            return {
                ['response._activeVisitedPlaceId']: selectedVisitedPlaceId,
                ['response._activeJourneyId']: currentJourney._uuid
            };
        }
    }
};

// FIXME Workaround to satisfy the completion percentage calculation that expects sections to be defined in their order of display in the object (see https://github.com/chairemobilite/evolution/issues/1024)
const { travelBehavior, end, completed, ...earlierSections } = surveySections;
const validatedSections = getAndValidateSurveySections({
    ...earlierSections,
    visitedPlaces: visitedPlacesConfig,
    segments: segmentConfig,
    travelBehavior,
    end,
    completed
});

// Widgets defined in the interview will override the ones from the section factory, if any
const allWidgetConfig = Object.assign(
    {},
    segmentSectionConfigFactory.getWidgetConfigs(),
    visitedPlacesSectionConfigFactory.getWidgetConfigs(),
    widgetsConfig
);

export { validatedSections as surveySections, allWidgetConfig as widgetsConfig };
