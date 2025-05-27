import { TFunction } from 'i18next';
import { booleanPointInPolygon as turfBooleanPointInPolygon } from '@turf/turf';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { _isBlank, _booleish } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import { GroupConfig, InputMapFindPlaceType } from 'evolution-common/lib/services/questionnaire/types';
import * as odSurveyHelpers from 'evolution-common/lib/services/odSurvey/helpers';
import * as conditionals from '../../common/conditionals';
import { householdMembersWidgetsNames } from './widgetsNames';
import inaccessibleZones from '../../geojson/inaccessibleZones.json';
import * as customHelper from '../../common/customHelpers';

// TODO: Migrate most of these widgets in Evolution Frontend, not here.
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
                return 'Please enter the following information:';
            }
            return `Person ${sequence || groupedObject['_sequence']} ${
                groupedObject.nickname ? `• **${groupedObject.nickname}**` : ''
            }`;
        }
    },
    showGroupedObjectDeleteButton: function (interview, path) {
        const countPersons = odSurveyHelpers.countPersons({ interview });
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

export const personUsualWorkPlaceGeography: InputMapFindPlaceType = {
    type: 'question',
    inputType: 'mapFindPlace',
    path: 'usualWorkPlace.geography',
    datatype: 'geojson',
    containsHtml: true,
    height: '32rem',
    refreshGeocodingLabel: (t: TFunction) => t('customLabel:RefreshGeocodingLabel'),
    geocodingQueryString: function (interview, path) {
        return surveyHelperNew.formatGeocodingQueryStringFromMultipleFields([
            surveyHelperNew.getResponse(interview, path, null, '../name')
        ]);
    },
    label: (t: TFunction, interview, path) => {
        const activePerson = odSurveyHelpers.getPerson({ interview, path });
        const countPersons = odSurveyHelpers.countPersons({ interview });
        const nickname = activePerson?.nickname || t('survey:noNickname');
        return t('household:usualWorkPlace.geography', {
            nickname,
            count: countPersons
        });
    },
    icon: {
        url: '/dist/images/activities_icons/workUsual_marker.svg',
        size: [70, 70]
    },
    placesIcon: {
        url: (interview, path) => '/dist/images/activities_icons/default_marker.svg',
        size: [70, 70]
    },
    defaultCenter: function (interview, path) {
        const homeCoordinates: any = surveyHelperNew.getResponse(
            interview,
            'home.geography.geometry.coordinates',
            null
        );
        return homeCoordinates
            ? {
                  lat: homeCoordinates[1],
                  lon: homeCoordinates[0]
              }
            : config.mapDefaultCenter;
    },
    defaultValue: function (interview, path) {
        return undefined;
    },
    updateDefaultValueWhenResponded: true,
    validations: function (value, _customValue, interview, path, _customPath) {
        const geography: any = surveyHelperNew.getResponse(interview, path, null, '../geography');
        return [
            {
                validation: _isBlank(value),
                errorMessage: (t: TFunction) => t('survey:visitedPlace:locationIsRequiredError')
            },
            {
                validation:
                    geography &&
                    geography.properties.lastAction &&
                    (geography.properties.lastAction === 'mapClicked' ||
                        geography.properties.lastAction === 'markerDragged') &&
                    geography.properties.zoom < 14,
                errorMessage: {
                    fr: "Le positionnement du lieu n'est pas assez précis. Utilisez le zoom + pour vous rapprocher davantage, puis précisez la localisation en déplaçant l'icône.",
                    en: 'Location is not precise enough. Please use the + zoom and drag the icon marker to confirm the precise location.'
                }
            },
            {
                validation:
                    geography &&
                    turfBooleanPointInPolygon(
                        geography,
                        inaccessibleZones.features[0] as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
                    ),
                errorMessage: (t: TFunction) => t('survey:visitedPlace:locationIsNotAccessibleError')
            }
        ];
    },
    conditional: conditionals.hasWorkingLocationConditional
};

export const personUsualSchoolPlaceGeography: InputMapFindPlaceType = {
    type: 'question',
    inputType: 'mapFindPlace',
    path: 'usualSchoolPlace.geography',
    datatype: 'geojson',
    containsHtml: true,
    height: '32rem',
    refreshGeocodingLabel: (t: TFunction) => t('customLabel:RefreshGeocodingLabel'),
    geocodingQueryString: function (interview, path) {
        return surveyHelperNew.formatGeocodingQueryStringFromMultipleFields([
            surveyHelperNew.getResponse(interview, path, null, '../name')
        ]);
    },
    label: (t: TFunction, interview, path) => {
        const activePerson = odSurveyHelpers.getPerson({ interview, path });
        const countPersons = odSurveyHelpers.countPersons({ interview });
        const nickname = activePerson?.nickname || t('survey:noNickname');
        return t('household:usualSchoolPlace.geography', {
            nickname,
            count: countPersons
        });
    },
    icon: {
        url: '/dist/images/activities_icons/schoolUsual_marker.svg',
        size: [70, 70]
    },
    placesIcon: {
        url: (interview, path) => '/dist/images/activities_icons/default_marker.svg',
        size: [70, 70]
    },
    defaultCenter: function (interview, path) {
        const homeCoordinates: any = surveyHelperNew.getResponse(
            interview,
            'home.geography.geometry.coordinates',
            null
        );
        return homeCoordinates
            ? {
                  lat: homeCoordinates[1],
                  lon: homeCoordinates[0]
              }
            : config.mapDefaultCenter;
    },
    defaultValue: function (interview, path) {
        return undefined;
    },
    updateDefaultValueWhenResponded: true,
    validations: function (value, _customValue, interview, path, _customPath) {
        const geography: any = surveyHelperNew.getResponse(interview, path, null, '../geography');
        return [
            {
                validation: _isBlank(value),
                errorMessage: (t: TFunction) => t('survey:visitedPlace:locationIsRequiredError')
            },
            {
                validation:
                    geography &&
                    geography.properties.lastAction &&
                    (geography.properties.lastAction === 'mapClicked' ||
                        geography.properties.lastAction === 'markerDragged') &&
                    geography.properties.zoom < 14,
                errorMessage: {
                    fr: "Le positionnement du lieu n'est pas assez précis. Utilisez le zoom + pour vous rapprocher davantage, puis précisez la localisation en déplaçant l'icône.",
                    en: 'Location is not precise enough. Please use the + zoom and drag the icon marker to confirm the precise location.'
                }
            },
            {
                validation:
                    geography &&
                    turfBooleanPointInPolygon(
                        geography,
                        inaccessibleZones.features[0] as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
                    ),
                errorMessage: (t: TFunction) => t('survey:visitedPlace:locationIsNotAccessibleError')
            }
        ];
    },
    conditional: function (interview, path) {
        const person: any = surveyHelperNew.getResponse(interview, path, null, '../../');
        const schoolLocationType = person.schoolLocationType;
        const childrenCase = customHelper.isStudentFromEnrolled(person) && person.schoolType !== 'schoolAtHome';
        return [['onLocation', 'hybrid'].includes(schoolLocationType) || childrenCase, null];
    }
};
