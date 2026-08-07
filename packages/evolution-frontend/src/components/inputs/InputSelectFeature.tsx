/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { JSX } from 'react';
import Select, { SelectInstance } from 'react-select';
import { distance as turfDistance } from '@turf/turf';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InputSelectFeatureType } from 'evolution-common/lib/services/questionnaire/types';
import { CommonInputProps } from './CommonInputProps';
import { useTranslation } from 'react-i18next';
import { parseBoolean, translateString } from 'evolution-common/lib/utils/helpers';

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
    props: InputSelectFeatureProps,
    referenceGeography: GeoJSON.Feature<GeoJSON.Point> | null
): OptionType[] => {
    const referenceGeographyKey = referenceGeography
        ? `${referenceGeography.geometry.type}:${referenceGeography.geometry.coordinates.join(',')}`
        : null;
    const { i18n } = useTranslation();

    const widgetConfig = props.widgetConfig;
    // Memoized sorted options, to avoid recalculating distances on every render
    const featureOptions = React.useMemo(() => {
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

    // Add additional options to the list, if any
    if (widgetConfig.additionalChoices) {
        const additionalOptions = widgetConfig.additionalChoices
            .filter(
                (choice) =>
                    choice.hidden !== true && parseBoolean(choice.conditional, props.interview, props.path, props.user)
            )
            .map((choice) => ({
                label: translateString(choice.label, i18n, props.interview, props.path, props.user) as string,
                color: choice.color,
                value: choice.value
            }));

        return [...featureOptions, ...additionalOptions];
    }
    return featureOptions;
};

const ShortcutButtons = (
    props: InputSelectFeatureProps & {
        availableOptions: OptionType[];
        onChange: (option: { value: string } | null) => void;
    }
) => {
    const { i18n } = useTranslation();
    const shortcuts = props.widgetConfig.shortcuts;
    if (shortcuts === undefined || shortcuts.length === 0) {
        return null;
    }

    const selectShortcut = (value: string, e: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
        }
        props.onChange({ value });
    };

    const shortcutButtons: JSX.Element[] = [];
    for (let i = 0, count = shortcuts.length; i < count; i++) {
        const shortcut = shortcuts[i];
        // Make sure the corresponding option is available, otherwise don't add the shortcut
        if (props.availableOptions.findIndex((visiblechoice) => visiblechoice.value === shortcut.value) === -1) {
            continue;
        }
        shortcutButtons.push(
            <button
                key={'shortcut' + i}
                type="button"
                className={`button shortcut-button${shortcut.color ? ` ${shortcut.color}` : 'blue'}`}
                onClick={(e) => selectShortcut(shortcut.value, e)}
            >
                {shortcut.icon && <FontAwesomeIcon icon={shortcut.icon} className="faIconLeft" />}
                {translateString(shortcut.label, i18n, props.interview, props.path, props.user)}
            </button>
        );
    }
    return shortcutButtons;
};

export const InputSelectFeature = (props: InputSelectFeatureProps) => {
    const referenceGeography =
        typeof props.widgetConfig.referenceGeography === 'function'
            ? props.widgetConfig.referenceGeography(props.interview, props.path, props.user)
            : null;

    const options = useFeatureOptions(props, referenceGeography ?? null);

    // react-select returns the selected option (or null when cleared); adapt it to
    // the event-like shape ({ target: { value } }) expected by the survey layer.
    const onChange = (option: { value: string } | null) => {
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
            <ShortcutButtons {...props} availableOptions={options} onChange={onChange} />
        </div>
    );
};

export default InputSelectFeature;
