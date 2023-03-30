/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InputTimeType } from 'evolution-common/lib/services/widgets';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { secondsSinceMidnightToTimeStr } from 'chaire-lib-common/lib/utils/DateTimeUtils';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { WithTranslation, withTranslation } from 'react-i18next';

export interface InputTimeProps<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> {
    id: string;
    onValueChange: (e: any) => void;
    value?: number;
    interview: UserInterviewAttributes<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    // TODO There's also a path in widgetConfig, but this one comes from the props of the question. See if it's always the same and use the one from widgetConfig if necessary
    path: string;
    user: CliUser;
    inputRef?: React.LegacyRef<HTMLTextAreaElement>;
    size?: 'small' | 'medium' | 'large';
    widgetConfig: InputTimeType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    closeQuestionModal?: (path: string) => void;
    questionModalPath?: string;
}

const midnight = 24 * 60 * 60;
const noon = 12 * 60 * 60;
const onehour = 60 * 60;

export class InputTime<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> extends React.Component<
    InputTimeProps<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> & WithTranslation
> {
    constructor(props: InputTimeProps<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> & WithTranslation) {
        super(props);
    }

    private prepareTimes(): JSX.Element[] {
        const widgetConfig = this.props.widgetConfig;
        const suffixTimes =
            surveyHelper.parse(widgetConfig.suffixTimes, this.props.interview, this.props.path, this.props.user) || {}; // should return an object of type: [secondSinceMidnight (string)]: suffix (string)
        const secondStep =
            (surveyHelper.parseInteger(
                widgetConfig.minuteStep,
                this.props.interview,
                this.props.path,
                this.props.user
            ) || 5) * 60;

        const minTime = surveyHelper.parseInteger(
            widgetConfig.minTimeSecondsSinceMidnight,
            this.props.interview,
            this.props.path,
            this.props.user
        );
        const maxTime = surveyHelper.parseInteger(
            widgetConfig.maxTimeSecondsSinceMidnight,
            this.props.interview,
            this.props.path,
            this.props.user
        );

        let minTimeSecondsSinceMidnight = minTime !== undefined ? minTime : 0;
        const maxTimeSecondsSinceMidnight = maxTime !== undefined ? maxTime : 23 * 3600 + 59 * 60 + 59;

        if (minTimeSecondsSinceMidnight % secondStep !== 0) {
            minTimeSecondsSinceMidnight += secondStep - (minTimeSecondsSinceMidnight % secondStep);
        }

        const timeOptions: JSX.Element[] = [];
        for (
            let secondsSinceMidnight = minTimeSecondsSinceMidnight;
            secondsSinceMidnight <= maxTimeSecondsSinceMidnight;
            secondsSinceMidnight += secondStep
        ) {
            const isTheNextDay = secondsSinceMidnight >= midnight; // midnight
            const suffix = suffixTimes[secondsSinceMidnight.toString()] || undefined;
            const has24hours = _isBlank(this.props.t('main:pm'));
            const timeStr = secondsSinceMidnightToTimeStr(secondsSinceMidnight, has24hours);
            const nextDayTimeStr = isTheNextDay
                ? secondsSinceMidnightToTimeStr(secondsSinceMidnight - midnight, has24hours)
                : timeStr;
            if (
                widgetConfig.addHourSeparators &&
                secondsSinceMidnight % onehour === 0 &&
                secondsSinceMidnight !== minTimeSecondsSinceMidnight &&
                secondsSinceMidnight !== maxTimeSecondsSinceMidnight
            ) {
                timeOptions.push(
                    <option
                        key={`input-select-container__${secondsSinceMidnight}_disabled`}
                        value={`disabled_${secondsSinceMidnight}`}
                        disabled={true}
                    ></option>
                );
            }
            timeOptions.push(
                <option key={`input-select-container__${secondsSinceMidnight}`} value={secondsSinceMidnight}>
                    {isTheNextDay
                        ? `${this.props.t('main:theNextDay')} ${nextDayTimeStr}`
                        : secondsSinceMidnight < noon
                            ? `${timeStr} ${this.props.t('main:am')}`
                            : `${timeStr} ${this.props.t('main:pm')}`}
                    {suffix ? suffix : ''}
                </option>
            );
        }
        return timeOptions;
    }

    render() {
        const selectOptions = this.prepareTimes();

        return (
            <div className="survey-question__input-select-container survey-question__input-time-container">
                <select
                    id={this.props.id}
                    onChange={this.props.onValueChange}
                    value={_isBlank(this.props.value) ? '' : this.props.value}
                >
                    <option key={'input-select-container__blank'} value="" className={'input-select-option'}></option>

                    {selectOptions}
                </select>
            </div>
        );
    }
}

export default withTranslation()(InputTime);
