/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { ChoiceType, InputMultiselectType } from 'evolution-common/lib/services/widgets';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';

interface InputMultiselectProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
    id: string;
    onValueChange?: (e: any) => void;
    value: string[];
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    // TODO There's also a path in widgetConfig, but this one comes from the props of the question. See if it's always the same and use the one from widgetConfig if necessary
    path: string;
    user: CliUser;
    inputRef?: React.LegacyRef<HTMLInputElement>;
    widgetConfig: InputMultiselectType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
}

const formatOptionLabel = (data: { color?: string; label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
            style={{
                background: data.color,
                borderRadius: 6,
                height: 6,
                width: 6,
                marginRight: 6
            }}
        />
        {data.label}
    </div>
);

type OptionType = { label: string; color?: string; value: string };

export class InputMultiselect<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> extends React.Component<
    InputMultiselectProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation
> {
    constructor(props) {
        super(props);
        this.onValueChange = this.onValueChange.bind(this);
        this.selectShortcut = this.selectShortcut.bind(this);
        this.customFilter = this.customFilter.bind(this);
    }

    onValueChange = (valuesArray) => {
        if (this.props.onValueChange === undefined) {
            return;
        }
        if (valuesArray) {
            if (this.props.widgetConfig.multiple !== false) {
                if (!Array.isArray(valuesArray)) {
                    valuesArray = [valuesArray];
                }
                this.props.onValueChange({ target: { value: valuesArray.map((option) => option.value) } });
            } else {
                this.props.onValueChange({ target: { value: valuesArray.value } });
            }
        } else {
            this.props.onValueChange({ target: { value: null } });
        }
    };

    selectShortcut = (
        value: ChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
        e: React.MouseEvent
    ) => {
        if (this.props.onValueChange === undefined) {
            return;
        }
        if (e) {
            e.preventDefault();
        }
        if (this.props.widgetConfig.multiple !== false) {
            const valuesArray = _isBlank(this.props.value) ? [] : this.props.value.slice(0); // shallow array clone
            valuesArray.push(value.value);
            this.props.onValueChange({ target: { value: valuesArray } });
        } else {
            this.props.onValueChange({ target: { value: value.value } });
        }
    };

    customFilter = (option: OptionType, searchText: string) => {
        if (option.label.toLowerCase().includes(searchText.toLowerCase())) {
            return true;
        } else {
            return false;
        }
    };

    render() {
        const shortcutButtons: JSX.Element[] = [];
        let hasShortcuts = false;
        const actualValue = _isBlank(this.props.value) ? [] : this.props.value;
        const actualValueToSort: { choice: OptionType; index: number }[] = [];
        const choices =
            typeof this.props.widgetConfig.choices === 'function'
                ? this.props.widgetConfig.choices(this.props.interview, this.props.path)
                : this.props.widgetConfig.choices;
        const selectOptions = choices
            .filter((choice) => {
                return (
                    choice.hidden !== true &&
                    surveyHelper.parseBoolean(
                        choice.conditional,
                        this.props.interview,
                        this.props.path,
                        this.props.user
                    )
                );
            })
            .map((choice) => {
                const label = surveyHelper.translateString(
                    choice.label,
                    this.props.i18n,
                    this.props.interview,
                    this.props.path,
                    this.props.user
                );
                const current = {
                    label: label as string,
                    color: choice.color,
                    value: choice.value
                };
                if (actualValue.indexOf(choice.value) > -1) {
                    actualValueToSort.push({
                        choice: current,
                        index: actualValue.indexOf(choice.value)
                    });
                }
                return current;
            }, this);

        const actualValueWithLabel = actualValueToSort
            .sort((valueObjectA, valueObjectB) => {
                return valueObjectA.index - valueObjectB.index;
            })
            .map((v2s) => v2s.choice);

        if (this.props.widgetConfig.shortcuts) {
            hasShortcuts = true;
            for (let i = 0, count = this.props.widgetConfig.shortcuts.length; i < count; i++) {
                const shortcut = this.props.widgetConfig.shortcuts[i];
                shortcutButtons.push(
                    <button
                        key={'shortcut' + i}
                        type="button"
                        className={`button shortcut-button${shortcut.color ? ` ${shortcut.color}` : 'blue'}`}
                        onClick={(e) => this.selectShortcut(shortcut, e)}
                        tabIndex={-1}
                    >
                        {shortcut.icon && <FontAwesomeIcon icon={shortcut.icon} className="faIconLeft" />}
                        {surveyHelper.translateString(
                            shortcut.label,
                            this.props.i18n,
                            this.props.interview,
                            this.props.path,
                            this.props.user
                        )}
                    </button>
                );
            }
        }

        const customStyles = {
            option: (base, state) => ({
                ...base,
                padding: '0.25rem 0.5rem'
            }),
            menu: (base, state) => ({
                ...base,
                marginTop: '0'
            })
        };

        // TODO: maybe we should jsut extend react select and accept any of its config in our component props
        return (
            <div className="survey-question__input-multiselect-container">
                <Select
                    formatOptionLabel={formatOptionLabel}
                    //disabled={false}
                    isMulti={this.props.widgetConfig.multiple !== false}
                    onChange={this.onValueChange}
                    options={selectOptions}
                    filterOption={this.props.widgetConfig.onlyLabelSearch ? this.customFilter : undefined}
                    isSearchable={true}
                    isClearable={this.props.widgetConfig.isClearable || false}
                    closeMenuOnSelect={
                        this.props.widgetConfig.closeMenuOnSelect || (this.props.widgetConfig.multiple ? false : true)
                    }
                    placeholder=""
                    name={`survey-question__input-multiselect-${this.props.path}`}
                    value={this.props.widgetConfig.multiple !== false ? actualValueWithLabel : actualValueWithLabel[0]}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={customStyles}
                />
                {hasShortcuts && shortcutButtons}
            </div>
        );
    }
}

export default withTranslation()(InputMultiselect) as React.FunctionComponent<
    InputMultiselectProps<any, any, any, any>
>;
