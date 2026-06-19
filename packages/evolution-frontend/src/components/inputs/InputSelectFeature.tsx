/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { distance as turfDistance } from '@turf/turf';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InputSelectFeatureType } from 'evolution-common/lib/services/questionnaire/types';
import { CommonInputProps } from './CommonInputProps';

export type InputSelectFeatureProps = CommonInputProps & {
    value?: string;
    inputRef?: React.RefObject<HTMLInputElement | null>;
    widgetConfig: InputSelectFeatureType;
};

export interface FeaturesToChoicesProps {
    widgetConfig: InputSelectFeatureType;
    referenceGeography: GeoJSON.Feature<GeoJSON.Point> | null;
}

const FeaturesToChoices = (props: FeaturesToChoicesProps) => {
    const referenceGeographyKey = props.referenceGeography
        ? `${props.referenceGeography.geometry.type}:${props.referenceGeography.geometry.coordinates.join(',')}`
        : null;

    // Memoized sorted choices, to avoid recalculating distances every time the widget renders
    const sortedChoices = React.useMemo(() => {
        // Sort features by distance to reference geography
        const features = props.widgetConfig.featureCollection.features as GeoJSON.Feature<GeoJSON.Point>[];
        const choiceFeatures =
            props.referenceGeography === null
                ? features
                : features
                    .map(
                        (feature) =>
                              ({
                                  ...feature,
                                  properties: {
                                      ...feature.properties,
                                      distance: turfDistance(props.referenceGeography!, feature)
                                  }
                              }) as GeoJSON.Feature<GeoJSON.Point, { distance: number }>
                    )
                    .sort((featureA, featureB) => featureA.properties.distance - featureB.properties.distance);
        return choiceFeatures.map((choiceFeature: GeoJSON.Feature<GeoJSON.Point, any>) => {
            const choiceId = choiceFeature.id;
            const choiceLabel = choiceFeature.properties[props.widgetConfig.labelProperty];
            return (
                <option key={`input-select-container__${choiceId}`} value={choiceId} className={'input-select-option'}>
                    {choiceLabel}
                </option>
            );
        });
    }, [props.widgetConfig, referenceGeographyKey]);

    return sortedChoices;
};

export const InputSelectFeature = (props: InputSelectFeatureProps) => {
    const referenceGeography =
        typeof props.widgetConfig.referenceGeography === 'function'
            ? props.widgetConfig.referenceGeography(props.interview, props.path, props.user)
            : null;

    return (
        <div className="survey-question__input-select-container">
            <select
                id={props.id}
                onChange={props.onValueChange}
                value={_isBlank(props.value) ? '' : props.value}
                style={{
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%'
                }}
            >
                <option key={'input-select-container__blank'} value="" className={'input-select-option'}></option>

                <FeaturesToChoices widgetConfig={props.widgetConfig} referenceGeography={referenceGeography ?? null} />
            </select>
        </div>
    );
};

export default InputSelectFeature;
