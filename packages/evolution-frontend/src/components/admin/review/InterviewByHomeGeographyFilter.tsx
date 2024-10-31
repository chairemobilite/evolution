/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';
import { FilterProps } from 'react-table';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons/faCheckCircle';

import { InterviewListAttributes } from 'evolution-common/lib/services/interviews/interview';
import InputText from 'chaire-lib-frontend/lib/components/input/InputText';
import InputButton from 'chaire-lib-frontend/lib/components/input/Button';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import FormErrors from 'chaire-lib-frontend/lib/components/pageParts/FormErrors';
import { isFeature, isPolygon, isFeatureCollection } from 'geojson-validation';

/**
 * Textbox input for access code filter
 *
 * @param param0 description of the filtered column
 * @returns
 */
export const InterviewByCodeFilter = ({
    t,
    column: { filterValue, setFilter }
}: FilterProps<InterviewListAttributes> & WithTranslation) => {
    const [currentValue, setCurrentValue] = React.useState(
        !_isBlank(filterValue) && filterValue.value ? filterValue.value : filterValue
    );
    const [hasError, setHasError] = React.useState(false);

    const validateValue = (value: string) => {
        try {
            const geojsonObject = JSON.parse(value);
            const feature = isFeatureCollection(geojsonObject) ? geojsonObject.features[0] : geojsonObject;
            if (isFeature(feature) && isPolygon(feature.geometry)) {
                setCurrentValue(feature);
                setHasError(false);
            } else {
                setHasError(true);
                setCurrentValue(undefined);
            }
        } catch (error) {
            setHasError(true);
            setCurrentValue(undefined);
        }
    };

    // FIXME: Instead of an InputText, the filter should be a map with a polygon drawing tool
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <label htmlFor={'homeGeographySearchInput'}>{t('admin:interviewByHomeGeographyFilter:Title')}</label>
            <InputText
                id="homeGeographySearchInput"
                value={JSON.stringify(currentValue)}
                placeholder={t('admin:interviewByHomeGeographyFilter:Placeholder')}
                onValueChange={(newValue) => validateValue(newValue.target.value)}
            />
            <InputButton
                onClick={() => setFilter(!_isBlank(currentValue) ? { value: currentValue, op: 'eq' } : currentValue)}
                icon={faCheckCircle}
                label=""
                size="small"
                title={t('admin:interviewByHomeGeographyFilter:Button')}
            />
            {hasError && <FormErrors errors={[t(['admin:interviewByHomeGeographyFilter:NotAPolygonFeature'])]} />}
        </div>
    );
};

export default withTranslation(['admin', 'main'])(InterviewByCodeFilter);
