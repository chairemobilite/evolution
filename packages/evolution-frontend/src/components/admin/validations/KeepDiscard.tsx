/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type KeepDiscard = 'Keep' | 'Discard' | undefined;
type KeepDiscardProps = {
    choice: KeepDiscard;
    personId: string;
    onChange?: (data: { choice: string | undefined; personId: string }) => void;
};

const KeepDiscard: React.FC<KeepDiscardProps> = ({ choice, personId, onChange }) => {
    const [currentChoice, setCurrentChoice] = useState<KeepDiscard | undefined>(choice);
    const { t } = useTranslation('admin');

    useEffect(() => {
        setCurrentChoice(choice);
    }, [choice]);

    const onClick = (selectedChoice: KeepDiscard) => {
        const newValue = currentChoice === selectedChoice ? undefined : selectedChoice;
        setCurrentChoice(newValue);
        if (onChange) {
            onChange({ choice: newValue, personId });
        }
    };

    return (
        <div className="_member-survey-keeper">
            <button
                style={currentChoice === 'Keep' ? { background: 'lightgreen' } : {}}
                className="_member-survey-keeper-left"
                type="button"
                onClick={() => onClick('Keep')}
            >
                {t('admin:interviewMember:Keep')}
            </button>

            <button
                style={currentChoice === 'Discard' ? { background: 'lightcoral' } : {}}
                className="_member-survey-keeper-right"
                type="button"
                onClick={() => onClick('Discard')}
            >
                {t(`admin:interviewMember:${'Discard'}`)}
            </button>
        </div>
    );
};

export default KeepDiscard;
