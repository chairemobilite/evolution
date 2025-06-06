import { _booleish, _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

const isSchoolEnrolledTrueValues = [
    'kindergarten',
    'childcare',
    'primarySchool',
    'secondarySchool',
    'schoolAtHome',
    'other'
];

// TODO: Migrate all these useful helpers (or not) to Evolution

export const isStudentFromEnrolled = (person) => {
    const schoolType = person.schoolType;
    return !_isBlank(schoolType) && isSchoolEnrolledTrueValues.includes(schoolType);
};
