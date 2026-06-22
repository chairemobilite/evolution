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
import { faFileImport } from '@fortawesome/free-solid-svg-icons/faFileImport';

import InputText from 'chaire-lib-frontend/lib/components/input/InputText';
import InputButton from 'chaire-lib-frontend/lib/components/input/Button';
import FormErrors from 'chaire-lib-frontend/lib/components/pageParts/FormErrors';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InterviewListAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { parseAccessCodesFromCsv } from './parseAccessCodesFromCsv';

/**
 * Filter for the access code column. Access codes can be typed (one or several,
 * separated by commas or new lines) or imported from a CSV file (one code per
 * line). A single code is matched exactly; several codes match any interview
 * having one of them.
 *
 * @param param0 description of the filtered column
 * @returns
 */
export const InterviewByCodeFilter = ({
    t,
    column: { filterValue, setFilter }
}: FilterProps<InterviewListAttributes> & WithTranslation) => {
    // Normalize the active filter value to a string for the textarea. A list
    // filter (op `in`) stores an array of codes, shown comma-separated so it can
    // be re-parsed by applyTypedFilter; a single code is a string.
    const initialValue = !_isBlank(filterValue) && filterValue.value ? filterValue.value : filterValue;
    const [currentValue, setCurrentValue] = React.useState(
        Array.isArray(initialValue) ? initialValue.join(',') : typeof initialValue === 'string' ? initialValue : ''
    );
    // Number of access codes loaded from the last imported CSV file, used to
    // give feedback to the validator. Undefined when no file is loaded.
    const [importedCodeCount, setImportedCodeCount] = React.useState<number | undefined>(undefined);
    // Whether reading the last imported CSV file failed, to give feedback to the validator.
    const [importError, setImportError] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Apply the typed access code(s), separated by commas or new lines. A single
    // code is matched exactly (`eq`), while several codes are matched as a list
    // (`in`). A blank value clears the filter.
    const applyTypedFilter = () => {
        if (_isBlank(currentValue)) {
            setFilter(currentValue);
            return;
        }
        const codes = currentValue
            .split(/[\n,]/)
            .map((code) => code.trim())
            .filter((code) => code.length > 0);
        if (codes.length === 0) {
            // Input contained only delimiters (e.g. ",,," or new lines): clear the filter.
            setFilter(undefined);
            return;
        }
        setFilter(codes.length > 1 ? { value: codes, op: 'in' } : { value: codes[0], op: 'eq' });
    };

    const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // Reset the input so selecting the same file again still triggers a change event.
        event.target.value = '';
        if (!file) {
            return;
        }
        try {
            const codes = parseAccessCodesFromCsv(await file.text());
            setImportError(false);
            setImportedCodeCount(codes.length);
            setCurrentValue('');
            setFilter(codes.length > 0 ? { value: codes, op: 'in' } : undefined);
        } catch {
            // Reading the file can fail (e.g. corrupted or unreadable file): give feedback.
            setImportError(true);
            setImportedCodeCount(undefined);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <label htmlFor={'accessCodeSearchInput'}>{t('admin:interviewByCodeFilter:title')}</label>
            <InputText
                id="accessCodeSearchInput"
                rows={3}
                value={currentValue}
                placeholder={t('admin:interviewByCodeFilter:placeholder')}
                onValueChange={(event) => {
                    setCurrentValue(event.target.value);
                    setImportedCodeCount(undefined);
                    setImportError(false);
                }}
            />
            <InputButton
                onClick={applyTypedFilter}
                icon={faCheckCircle}
                label=""
                size="small"
                title={t('admin:interviewByCodeFilter:button')}
            />
            <input
                type="file"
                accept=".csv,text/csv,text/plain"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileSelected}
            />
            <InputButton
                onClick={() => fileInputRef.current?.click()}
                icon={faFileImport}
                label=""
                size="small"
                title={t('admin:interviewByCodeFilter:importButton')}
            />
            {importedCodeCount !== undefined && (
                <span style={{ marginLeft: '0.5rem' }}>
                    {t('admin:interviewByCodeFilter:importedCount', { count: importedCodeCount })}
                </span>
            )}
            {importError && <FormErrors errors={['admin:interviewByCodeFilter:importError']} />}
        </div>
    );
};

export default withTranslation(['admin', 'main'])(InterviewByCodeFilter);
