/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { parseBoolean, parseString, translateString } from 'evolution-common/lib/utils/helpers';
import ConfirmModal from 'chaire-lib-frontend/lib/components/modal/ConfirmModal';
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { InterviewUpdateCallbacks, UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { GroupConfig } from 'evolution-common/lib/services/questionnaire/types';

type DeleteGroupedObjectButton = InterviewUpdateCallbacks & {
    interview: UserInterviewAttributes;
    user?: CliUser;
    path: string;
    shortname: string;
    widgetConfig: Pick<
        GroupConfig,
        'showGroupedObjectDeleteButton' | 'groupedObjectDeleteButtonLabel' | 'deleteConfirmPopup'
    >;
};

const DeleteGroupedObjectButton: React.FC<DeleteGroupedObjectButton & WithTranslation> = (props) => {
    const [deletePlaceModalOpened, setDeletePlaceModalOpened] = React.useState(false);

    const beforeRemoveGroupedObject = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const hasConfirmPopup = props.widgetConfig.deleteConfirmPopup;
        const confirmPopupConditional = hasConfirmPopup
            ? parseBoolean(props.widgetConfig.deleteConfirmPopup?.conditional, props.interview, props.path, props.user)
            : true;

        if (hasConfirmPopup && confirmPopupConditional === true) {
            setDeletePlaceModalOpened(true);
        } else {
            onRemoveGroupedObject();
        }
    };

    const onRemoveGroupedObject = (e?: React.MouseEvent<unknown>) => {
        if (e) {
            e.preventDefault();
        }
        props.startRemoveGroupedObjects(props.path);
    };

    const widgetConfig = props.widgetConfig;

    const showDeleteButton = parseBoolean(
        props.widgetConfig.showGroupedObjectDeleteButton,
        props.interview,
        props.path,
        props.user,
        false
    );
    const deleteButtonLabel =
        translateString(props.widgetConfig.groupedObjectDeleteButtonLabel, props.i18n, props.interview, props.path) ||
        props.t([`${props.shortname}:deleteThisGroupedObject`, `survey:${props.shortname}:deleteThisGroupedObject`]);

    return showDeleteButton ? (
        <div className="center">
            <button type="button" className="button red small" onClick={beforeRemoveGroupedObject}>
                <FontAwesomeIcon icon={faTrashAlt} className="faIconLeft" />
                {deleteButtonLabel}
            </button>
            {deletePlaceModalOpened &&
                widgetConfig.deleteConfirmPopup &&
                widgetConfig.deleteConfirmPopup.content &&
                widgetConfig.deleteConfirmPopup.content[props.i18n.language] && (
                <div>
                    <ConfirmModal
                        isOpen={true}
                        closeModal={() => setDeletePlaceModalOpened(false)}
                        text={parseString(
                            widgetConfig.deleteConfirmPopup.content[props.i18n.language] ||
                                    widgetConfig.deleteConfirmPopup.content,
                            props.interview,
                            props.path
                        )}
                        title={
                            translateString(
                                widgetConfig.deleteConfirmPopup.title,
                                props.i18n,
                                props.interview,
                                props.path
                            ) || ''
                        }
                        cancelAction={widgetConfig.deleteConfirmPopup.cancelAction}
                        confirmAction={(e) => onRemoveGroupedObject(e)}
                        containsHtml={widgetConfig.deleteConfirmPopup.containsHtml}
                    />
                </div>
            )}
        </div>
    ) : null;
};
export default withTranslation()(DeleteGroupedObjectButton);
