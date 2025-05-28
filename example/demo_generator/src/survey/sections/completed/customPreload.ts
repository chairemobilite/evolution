import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import customPreloadBase from '../../common/customPreloadBase';
import { currentSectionName } from './sectionConfigs';

// Do some actions before the section is loaded
export const customPreload: SectionConfig['preload'] = function (interview, { startUpdateInterview, callback }) {
    const responsesContent = customPreloadBase(interview, currentSectionName);
    
    startUpdateInterview({ sectionShortname: currentSectionName, valuesByPath: responsesContent }, callback);
    return null;
};
