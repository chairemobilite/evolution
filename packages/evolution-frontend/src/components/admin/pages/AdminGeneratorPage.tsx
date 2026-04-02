/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import * as Status from 'chaire-lib-common/lib/utils/Status';

// OpenPyXL supports Excel 2010+ formats: xlsx/xlsm/xltx/xltm (not legacy .xls).
const EXCEL_ACCEPT =
    '.xlsx,.xlsm,.xltx,.xltm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12,application/vnd.openxmlformats-officedocument.spreadsheetml.template,application/vnd.ms-excel.template.macroEnabled.12';

// Check if the file is an Excel file
// We support Excel 2010+ formats: xlsx/xlsm/xltx/xltm (not legacy .xls).
const isExcelFile = (file: File): boolean => {
    const name = file.name.toLowerCase();
    if (
        name.endsWith('.xlsx') ||
        name.endsWith('.xlsm') ||
        name.endsWith('.xltx') ||
        name.endsWith('.xltm')
    ) {
        return true;
    }
    const mime = file.type;
    return (
        mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mime === 'application/vnd.ms-excel.sheet.macroEnabled.12' ||
        mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.template' ||
        mime === 'application/vnd.ms-excel.template.macroEnabled.12'
    );
};

type GeneratorExcelFileInputProps = {
    file: File | null;
    onFileChange: (file: File | null) => void;
};

const GeneratorExcelFileInput: React.FunctionComponent<GeneratorExcelFileInputProps> = ({ file, onFileChange }) => {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    /**
     * Shared handler for both the hidden `<input type="file">` and drag-and-drop.
     * We only ever keep the first entry: the UI is single-file, and multi-select is not enabled on the input.
     */
    const pickFiles = useCallback(
        (list: FileList | null) => {
            // Empty selection (user cancelled dialog) or nothing in the DataTransfer — nothing to do.
            if (!list?.length) {
                toast.info(t('admin:generator:GeneratorFileSelectionCancelled'));
                return;
            }
            const next = list[0];
            // Reject non-Excel files and keep the currently selected file unchanged.
            if (isExcelFile(next)) {
                onFileChange(next);
                toast.success(t('admin:generator:GeneratorFileSelected', { fileName: next.name }));
                return;
            }
            toast.error(t('admin:generator:GeneratorInvalidFileType'));
        },
        [onFileChange, t]
    );

    /**
     * Fires after the native file dialog closes. `pickFiles` reads `e.target.files` once, then we clear
     * the input value so choosing the *same* path again still emits `change` (browsers dedupe otherwise).
     */
    const onInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            pickFiles(e.target.files);
            e.target.value = '';
        },
        [pickFiles]
    );

    /**
     * Drop target handler: `preventDefault` is required or the browser navigates away / opens the file.
     * We turn off the drag highlight here because the drag operation is finished (success or not).
     */
    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragging(false);
            pickFiles(e.dataTransfer.files);
        },
        [pickFiles]
    );

    /**
     * While the user holds files over the dropzone, we must call `preventDefault` on `dragover` or
     * the drop event will never fire. `dragging` drives the visual “active” state on the zone.
     */
    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(true);
    }, []);

    /**
     * Pointer left the dropzone without a successful drop; remove highlight. (Child elements can cause
     * extra leave/over pairs; a production polish would debounce or check relatedTarget.)
     */
    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
    }, []);

    /** Opens the OS file picker by delegating to the visually hidden but focusable file input. */
    const openPicker = useCallback(() => {
        inputRef.current?.click();
    }, []);

    /**
     * Clears React state and the native input. `stopPropagation` / `preventDefault` keep the click from
     * bubbling to the dropzone (which would immediately reopen the picker after a remove).
     */
    const clearFile = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            onFileChange(null);
            toast.info(t('admin:generator:GeneratorFileCleared'));
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        },
        [onFileChange, t]
    );

    // Hidden file input and dropzone.
    return (
        <div className="admin-generator-excel-file">
            <span className="admin-generator-excel-file__label" id="admin-generator-file-label">
                {t('admin:generator:GeneratorFileLabel')}
            </span>
            <input
                ref={inputRef}
                type="file"
                className="admin-generator-excel-file__native"
                accept={EXCEL_ACCEPT}
                aria-labelledby="admin-generator-file-label"
                onChange={onInputChange}
            />
            <div
                role="button"
                tabIndex={0}
                className={`admin-generator-excel-file__dropzone${dragging ? ' admin-generator-excel-file__dropzone--dragging' : ''}`}
                onClick={openPicker}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openPicker();
                    }
                }}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
            >
                {file ? (
                    <div className="admin-generator-excel-file__selection" onClick={(e) => e.stopPropagation()}>
                        <span className="admin-generator-excel-file__file-name">{file.name}</span>
                        <button type="button" className="admin-generator-excel-file__remove" onClick={clearFile}>
                            {t('admin:generator:GeneratorRemoveFile')}
                        </button>
                    </div>
                ) : (
                    <span className="admin-generator-excel-file__dropzone-text">
                        {t('admin:generator:GeneratorDropzonePrompt')}
                    </span>
                )}
            </div>
            <p className="admin-generator-excel-file__hint">{t('admin:generator:GeneratorFileHint')}</p>
        </div>
    );
};

const AdminGeneratorPage: React.FunctionComponent = () => {
    const { t } = useTranslation();
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState<string | null>(null); // Excel validation error message to display to the user

    // Verify the Excel file and show a toast for the outcome.
    const onVerifyClick = useCallback(async () => {
        if (isVerifying) {
            return;
        }
        if (!excelFile) {
            toast.error(t('admin:generator:GeneratorVerifyNoFile'));
            return;
        }
        setVerifyError(null);
        setIsVerifying(true);
        try {
            const formData = new FormData();
            formData.append('generatorFile', excelFile);

            // POST /api/admin/generator/verify — multipart field `generatorFile`, backend saves to temp then runs CLI.
            const response = await fetch('/api/admin/generator/verify', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    Accept: 'application/json'
                },
                body: formData
            });
            const data = (await response.json()) as Status.Status<unknown>;

            // 4xx/5xx: show API error string when present
            if (!response.ok) {
                const serverMessage = Status.isStatusError(data) && typeof data.error === 'string' ? data.error : null;
                setVerifyError(serverMessage ?? t('admin:generator:GeneratorVerifyErrorFallback'));
                toast.error(t('admin:generator:GeneratorVerifyFailedIntegrity'));
                return;
            }
            if (Status.isStatusOk(data)) {
                setVerifyError(null);
                toast.success(t('admin:generator:GeneratorVerifySuccess'));
                return;
            }
            // 200 but not Status.ok
            setVerifyError(t('admin:generator:GeneratorVerifyErrorFallback'));
            toast.error(t('admin:generator:GeneratorVerifyFailedIntegrity'));
        } catch (error) {
            const isNetworkFailure =
                error instanceof Error && (error.message.includes('Failed to fetch') || error.name === 'TypeError');
            const message = isNetworkFailure
                ? t('admin:generator:GeneratorVerifyRequestFailed')
                : t('admin:generator:GeneratorVerifyErrorFallback');
            setVerifyError(message);
            toast.error(t('admin:generator:GeneratorVerifyFailedIntegrity'));
        } finally {
            setIsVerifying(false);
        }
    }, [excelFile, isVerifying, t]);

    return (
        <div className="admin" id="adminGeneratorPage">
            <div className="survey-section__content apptr__form-container">
                <h2>{t('admin:generator:GeneratorTitle')}</h2>
                <p>{t('admin:generator:GeneratorDescription')}</p>
                <GeneratorExcelFileInput
                    file={excelFile}
                    onFileChange={(file) => {
                        setExcelFile(file);
                        setVerifyError(null);
                    }}
                />
                <button type="button" onClick={onVerifyClick} disabled={isVerifying}>
                    {t('admin:generator:GeneratorButton')}
                </button>

                {/* Display the validation error message to the user if it exists */}
                {verifyError && (
                    <div className="admin-generator-verify-error" role="alert" aria-live="polite">
                        <div className="admin-generator-verify-error__header">
                            <strong>{t('admin:generator:GeneratorVerifyErrorTitle')}</strong>
                            <div className="admin-generator-verify-error__actions">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(verifyError);
                                            toast.success(t('admin:generator:GeneratorVerifyErrorCopied'));
                                        } catch {
                                            toast.error(t('admin:generator:GeneratorVerifyErrorCopyFailed'));
                                        }
                                    }}
                                >
                                    {t('admin:generator:GeneratorVerifyErrorCopy')}
                                </button>
                                <button type="button" onClick={() => setVerifyError(null)}>
                                    {t('admin:generator:GeneratorVerifyErrorDismiss')}
                                </button>
                            </div>
                        </div>
                        <pre className="admin-generator-verify-error__content">{verifyError}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminGeneratorPage;
