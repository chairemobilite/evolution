import { SegmentsSectionFactory } from 'evolution-common/lib/services/questionnaire/sections/segments/sectionSegments';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import surveySections from './sections';
import * as widgetsConfig from './widgets';
import helper, { segmentSectionConfig, widgetFactoryOptions } from './helper';
import { getAndValidateSurveySections, SectionConfig } from 'evolution-common/lib/services/questionnaire/types';

// FIXME For now this file is here and has quite a bit of code. Eventually, the
// questionnaire generation should be done in Evolution directly when we have
// more builtin stuff

const segmentSectionConfigFactory = new SegmentsSectionFactory(segmentSectionConfig, widgetFactoryOptions);
const segmentSectionConfigFromFactory = segmentSectionConfigFactory.getSectionConfig();

// Add the segments section to the exported configuration
const segmentConfig: SectionConfig = {
    ...segmentSectionConfigFromFactory,
    isSectionVisible: function(interview) {
      const person = odSurveyHelper.getPerson({ interview }) as any;
      return person && person.didTripsOnTripsDate === 'yes';
    },
    isSectionCompleted: (interview) => {
        const person = odSurveyHelper.getPerson({ interview });
        return helper.tripsForPersonComplete(person, interview);
    }
};
// FIXME Workaround to satisfy the completion percentage calculation that expects sections to be defined in their order of display in the object (see https://github.com/chairemobilite/evolution/issues/1024)
const { travelBehavior, end, completed, ...earlierSections } = surveySections;
const validatedSections = getAndValidateSurveySections({
    ...earlierSections,
    segments: segmentConfig,
    travelBehavior,
    end,
    completed
});

// Widgets defined in the interview will override the ones from the section factory, if any
const allWidgetConfig = Object.assign({}, segmentSectionConfigFactory.getWidgetConfigs(), widgetsConfig);

export { validatedSections as surveySections, allWidgetConfig as widgetsConfig };