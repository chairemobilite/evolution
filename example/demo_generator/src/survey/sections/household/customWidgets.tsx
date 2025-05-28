import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import { GroupConfig } from 'evolution-common/lib/services/questionnaire/types';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { householdMembersWidgetsNames } from './widgetsNames';

export const householdMembers: GroupConfig = {
    type: 'group',
    path: 'household.persons',
    title: {
        fr: 'Membres du ménage',
        en: 'Household members'
    },
    name: {
        fr: function (groupedObject: any, sequence, interview) {
            const householdSize = surveyHelperNew.getResponse(interview, 'household.size', 1);
            if (householdSize === 1) {
                return 'Veuillez entrer les informations suivantes:';
            }
            return `Personne ${sequence || groupedObject['_sequence']} ${
                groupedObject.nickname ? `• **${groupedObject.nickname}**` : ''
            }`;
        },
        en: function (groupedObject: any, sequence, interview) {
            const householdSize = surveyHelperNew.getResponse(interview, 'household.size', 1);
            if (householdSize === 1) {
                return 'Please enter the following informations:';
            }
            return `Person ${sequence || groupedObject['_sequence']} ${
                groupedObject.nickname ? `• **${groupedObject.nickname}**` : ''
            }`;
        }
    },
    showGroupedObjectDeleteButton: function (interview, path) {
        const countPersons = odSurveyHelper.countPersons({ interview });
        const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
        const householdSizeNum = householdSize ? Number(householdSize) : undefined;
        return householdSizeNum ? countPersons > householdSizeNum : false;
    },
    showGroupedObjectAddButton: function (interview, path) {
        return true;
    },
    groupedObjectAddButtonLabel: {
        fr: 'Ajouter une personne manquante',
        en: 'Add a missing person'
    },
    addButtonSize: 'small',
    widgets: householdMembersWidgetsNames
};
