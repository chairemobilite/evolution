/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons/faQuestionCircle';
import SimpleModal from '../../modal/SimpleModal';

export type ExportHelpButtonProps = {
    /** Name of the export, used as the title of the help */
    exportName: string;
    /** Description of what the export contains, in markdown */
    helpText: string;
};

/**
 * Button with a question mark opening a modal that describes what an export
 * of the admin export page contains.
 *
 * @param {ExportHelpButtonProps} props - The name of the export and its description
 * @returns The button, and the modal when it is open
 */
const ExportHelpButton: React.FunctionComponent<ExportHelpButtonProps> = ({ exportName, helpText }) => {
    const { t } = useTranslation();
    const [helpIsOpen, setHelpIsOpen] = React.useState(false);
    const buttonLabel = t('admin:export:ShowExportHelp', { exportName });

    return (
        <React.Fragment>
            {helpIsOpen && (
                <SimpleModal isOpen={true} closeModal={() => setHelpIsOpen(false)} title={exportName} text={helpText} />
            )}
            <button
                type="button"
                className="button blue small"
                title={buttonLabel}
                aria-label={buttonLabel}
                onClick={() => setHelpIsOpen(true)}
            >
                <FontAwesomeIcon icon={faQuestionCircle} />
            </button>
        </React.Fragment>
    );
};

export default ExportHelpButton;
