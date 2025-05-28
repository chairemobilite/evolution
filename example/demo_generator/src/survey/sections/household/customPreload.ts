import _isEmpty from 'lodash/isEmpty';
import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import customPreloadBase from '../../common/customPreloadBase';
import { currentSectionName } from './sectionConfigs';

// TODO: Can we move this code to evolution-common or generate it with some function with the Generator?
// TODO: Do we really need to calculate _personsCount like this?
// TODO: It seems to be a workaround for the grouped objects not being able to have a count property.
// TODO: In other words, if we can improve the Group and Section navigation in Evolution, we can eliminate this file completely.
// Do some actions before the section is loaded
export const customPreload: SectionConfig['preload'] = function (
    interview,
    { startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects, callback }
) {
    const responsesContent = customPreloadBase(interview, currentSectionName);

    // TODO: This code only depends on the grouped object path and group count path and section if count is invalid. Move to evolution, to make it generic.
    /** Start of group related code to move to evolution */
    const groupedObjects = getResponse(interview, 'household.persons');
    const groupedObjectIds = groupedObjects ? Object.keys(groupedObjects) : [];
    const householdSize = getResponse(interview, 'household.size', 0) as number;
    const householdSizeIsValid = !isNaN(Number(householdSize)) && householdSize >= 1 && householdSize <= 18;

    const emptyGroupedObjects = groupedObjectIds.filter((groupedObjectId) => {
        const { _uuid, _sequence, ...restOfGroup } = groupedObjects[groupedObjectId];
        return _isEmpty(restOfGroup);
    });

    if (householdSizeIsValid && householdSize) {
        responsesContent['responses.household._personsCount'] = groupedObjectIds.length;
        if (groupedObjectIds.length < householdSize) {
            // auto create objects according to household size:
            startAddGroupedObjects(
                householdSize - groupedObjectIds.length,
                -1,
                'household.persons',
                null,
                (_interview) => {
                    responsesContent['responses.household._personsCount'] = householdSize;
                    startUpdateInterview(
                        { sectionShortname: currentSectionName, valuesByPath: responsesContent },
                        callback
                    );
                }
            );
        } else if (groupedObjectIds.length > householdSize) {
            const pathsToDelete = [];
            // auto remove empty objects according to household size:
            for (let i = 0; i < groupedObjectIds.length; i++) {
                if (emptyGroupedObjects[i]) {
                    pathsToDelete.push(`household.persons.${emptyGroupedObjects[i]}`);
                }
            }
            if (pathsToDelete.length > 0) {
                startRemoveGroupedObjects(pathsToDelete, (_interview) => {
                    responsesContent['responses.household._personsCount'] =
                        groupedObjectIds.length - pathsToDelete.length;
                    startUpdateInterview(
                        { sectionShortname: currentSectionName, valuesByPath: responsesContent },
                        callback
                    );
                });
            } else {
                responsesContent['responses.household._personsCount'] = groupedObjectIds.length;
                startUpdateInterview(
                    { sectionShortname: currentSectionName, valuesByPath: responsesContent },
                    callback
                );
            }
        } else {
            responsesContent['responses.household._personsCount'] = groupedObjectIds.length;
            startUpdateInterview({ sectionShortname: currentSectionName, valuesByPath: responsesContent }, callback);
        }
    } else {
        responsesContent['responses._activeSection'] = 'home';
        responsesContent['responses.household._personsCount'] = undefined;
        startUpdateInterview({ sectionShortname: currentSectionName, valuesByPath: responsesContent }, callback);
    }
    /** End of group related code to move to evolution */
    return null;
};
