/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InputStringType } from '../../services/widgets';
import { parseString } from '../../utils/helpers';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { FrontendUser } from 'chaire-lib-frontend/lib/services/auth/user';

export interface InputStringProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
    id: string;
    onValueChange?: (e: any) => void;
    value?: string;
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    // TODO There's also a path in widgetConfig, but this one comes from the props of the question. See if it's always the same and use the one from widgetConfig if necessary
    path: string;
    user: FrontendUser;
    inputRef?: React.LegacyRef<HTMLInputElement>;
    size?: 'small' | 'medium' | 'large';
    widgetConfig: InputStringType;
    updateKey: number;
}

const getStateValue = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    props: InputStringProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
) => {
    const value = _isBlank(props.value)
        ? parseString(props.widgetConfig.defaultValue, props.interview, props.path, props.user)
        : props.value;
    return _isBlank(value) ? '' : value;
};

export const InputString = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    props: InputStringProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
) => {
    const [value, setValue] = React.useState(getStateValue(props));
    // Update the value with props when updateKey prop is updated. Not using the
    // `key` to avoid loosing the identity of the component (which causes the
    // focus to get lost)
    React.useEffect(() => {
        setValue(getStateValue(props));
    }, [props.updateKey]);
    return (
        <input
            autoComplete="none"
            type="text"
            className={`apptr__form-input apptr__input-string input-${props.size || 'large'}`}
            name={props.id}
            id={props.id}
            value={value}
            onBlur={props.onValueChange}
            onChange={(e) => setValue(e.target.value)}
            ref={props.inputRef}
            maxLength={props.widgetConfig.maxLength ? props.widgetConfig.maxLength : 255}
        />
    );
};

export default InputString;
