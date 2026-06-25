/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan } from '@fortawesome/free-solid-svg-icons/faBan';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';

type InvalidateTripDiaryProps = {
    /** Current validity of the person's trip diary; `false` means invalidated, `undefined`/`true` means valid */
    tripDiaryValid: boolean | undefined;
    personId: string;
    /** Called with the new validity value: `false` when invalidated, `undefined` when cleared */
    onChange: (data: { tripDiaryValid: boolean | undefined; personId: string }) => void;
};

/**
 * Single toggle button used by the reviewer to invalidate a person's whole trip
 * diary. When valid, it shows a red "ban" icon and invalidates the diary on click
 * (`tripDiaryValid = false`); when invalid, it shows a green check icon and clears
 * the flag on click (`tripDiaryValid = undefined`, i.e. valid again).
 * @param props.tripDiaryValid Current validity (`false` = invalid, else valid)
 * @param props.personId The uuid of the person whose trip diary is toggled
 * @param props.onChange Called with the new validity value and the person id
 */
const InvalidateTripDiary: React.FC<InvalidateTripDiaryProps> = ({ tripDiaryValid, personId, onChange }) => {
    const { t } = useTranslation('admin');
    const isInvalid = tripDiaryValid === false;

    const onClick = () => {
        onChange({ tripDiaryValid: isInvalid ? undefined : false, personId });
    };

    return (
        <button
            className={`_member-trip-diary-invalidate ${isInvalid ? '_green' : '_red'}`}
            type="button"
            onClick={onClick}
            title={
                isInvalid
                    ? t('admin:interviewMember:RevalidateTripDiary')
                    : t('admin:interviewMember:InvalidateTripDiary')
            }
        >
            <FontAwesomeIcon icon={isInvalid ? faCheck : faBan} />
        </button>
    );
};

export default InvalidateTripDiary;
