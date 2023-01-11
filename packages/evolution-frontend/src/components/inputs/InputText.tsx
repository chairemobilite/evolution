/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InputTextType } from '../../services/widgets';
import { parseString } from '../../utils/helpers';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { FrontendUser } from 'chaire-lib-frontend/lib/services/auth/user';

export interface InputTextProps {
    id: string;
    onValueChange?: (e: any) => void;
    value?: string;
    interview: UserInterviewAttributes;
    // TODO There's also a path in widgetConfig, but this one comes from the props of the question. See if it's always the same and use the one from widgetConfig if necessary
    path: string;
    user: FrontendUser;
    inputRef?: React.LegacyRef<HTMLTextAreaElement>;
    size?: 'small' | 'medium' | 'large';
    widgetConfig: InputTextType;
}

export const InputText: React.FunctionComponent<InputTextProps> = (props: InputTextProps) => (
    <textarea
        autoComplete="off"
        rows={props.widgetConfig.rows || 5}
        className={'apptr__form-input input-text'}
        name={props.widgetConfig.shortname}
        id={props.id}
        defaultValue={
            _isBlank(props.value)
                ? parseString(props.widgetConfig.defaultValue, props.interview, props.path, props.user)
                : props.value
        }
        onBlur={props.onValueChange}
        ref={props.inputRef}
        maxLength={props.widgetConfig.maxLength || 2000}
    />
);

export default InputText;