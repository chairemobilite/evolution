import config from 'chaire-lib-common/lib/config/shared/project.config';

type CenterPoint = { lat: number; lon: number };
type GetCenterPointFromRegion = (params: { interview: any; regionPath: string }) => CenterPoint;

export const defaultInvalidGeocodingResultTypes = [
    'political',
    'country',
    'administrative_area_level_1',
    'administrative_area_level_2',
    'administrative_area_level_3',
    'administrative_area_level_4',
    'administrative_area_level_5',
    'administrative_area_level_6',
    'administrative_area_level_7',
    'colloquial_area',
    'locality',
    'sublocality',
    'sublocality_level_1',
    'sublocality_level_2',
    'sublocality_level_3',
    'sublocality_level_4',
    'sublocality_level_5',
    'neighborhood',
    'route'
];

// Return the center point of Quebec
export const getCenterPointFromRegion: GetCenterPointFromRegion = ({ interview, regionPath }) => {
    return config.mapDefaultCenter;
};
