/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import Select, { SelectInstance } from 'react-select';
import { distance as turfDistance } from '@turf/turf';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InputSelectFeatureType } from 'evolution-common/lib/services/questionnaire/types';
import { CommonInputProps } from './CommonInputProps';

export type InputSelectFeatureProps = CommonInputProps & {
    value?: string;
    inputRef?: React.RefObject<HTMLInputElement | null>;
    widgetConfig: InputSelectFeatureType;
};

type OptionType = { label: string; value: string };

/**
 * Build the select options from the feature collection, sorted by proximity to
 * the reference geography (closest first). When there is no reference geography,
 * the original collection order is kept.
 * @param widgetConfig - The selectFeature widget configuration
 * @param referenceGeography - The point used to sort features by distance, or null
 * @returns The options to feed to the searchable select, in display order
 */
const useFeatureOptions = (
    widgetConfig: InputSelectFeatureType,
    referenceGeography: GeoJSON.Feature<GeoJSON.Point> | null
): OptionType[] => {
    const referenceGeographyKey = referenceGeography
        ? `${referenceGeography.geometry.type}:${referenceGeography.geometry.coordinates.join(',')}`
        : null;

    // Memoized sorted options, to avoid recalculating distances on every render
    return React.useMemo(() => {
        const features = widgetConfig.featureCollection.features as GeoJSON.Feature<GeoJSON.Point>[];
        const sortedFeatures =
            referenceGeography === null
                ? features
                : // Precompute each distance once, then sort, to avoid recomputing during comparisons
                features
                    .map((feature) => ({ feature, distance: turfDistance(referenceGeography, feature) }))
                    .sort((featureA, featureB) => featureA.distance - featureB.distance)
                    .map(({ feature }) => feature);
        return sortedFeatures.map((feature) => ({
            value: String(feature.id),
            label: feature.properties?.[widgetConfig.labelProperty]
        }));
    }, [widgetConfig, referenceGeographyKey]);
};

export const InputSelectFeature = (props: InputSelectFeatureProps) => {
    const referenceGeography =
        typeof props.widgetConfig.referenceGeography === 'function'
            ? props.widgetConfig.referenceGeography(props.interview, props.path, props.user)
            : null;

    const options = useFeatureOptions(props.widgetConfig, referenceGeography ?? null);

    // react-select returns the selected option (or null when cleared); adapt it to
    // the event-like shape ({ target: { value } }) expected by the survey layer.
    const onChange = (option: OptionType | null) => {
        props.onValueChange({ target: { value: option ? option.value : null } });
    };

    const selectedOption = _isBlank(props.value) ? null : options.find((option) => option.value === props.value);

    // Bridge the react-select instance to props.inputRef so Question.tsx can call
    // focus() on validation error (the instance exposes a focus() method).
    const setSelectRef = (instance: SelectInstance<OptionType> | null) => {
        if (props.inputRef) {
            props.inputRef.current = instance as unknown as HTMLInputElement | null;
        }
    };

    return (
        <div className="survey-question__input-select-container">
            <Select
                ref={setSelectRef}
                inputId={props.id}
                aria-labelledby={`${props.id}_label`}
                options={options}
                value={selectedOption ?? null}
                onChange={onChange}
                isSearchable={true}
                isClearable={true}
                placeholder=""
                name={`survey-question__input-select-feature-${props.path}`}
                className="react-select-container"
                classNamePrefix="react-select"
            />
        </div>
    );
};

export default InputSelectFeature;
