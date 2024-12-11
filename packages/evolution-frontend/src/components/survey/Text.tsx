/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { translateString } from 'evolution-common/lib/utils/helpers';
import { WidgetStatus } from 'evolution-common/lib/services/questionnaire/types';
import { TextWidgetConfig } from 'evolution-common/lib/services/questionnaire/types';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';

type TextProps = {
    widgetConfig: TextWidgetConfig;
    interview: UserInterviewAttributes;
    user: CliUser;
    widgetStatus: WidgetStatus;
    path: string;
};

export const Text: React.FunctionComponent<TextProps & WithTranslation> = ({
    widgetConfig,
    widgetStatus,
    i18n,
    interview,
    path,
    user
}) => {
    if (!widgetStatus.isVisible) {
        return null;
    }

    const content = translateString(widgetConfig.text, i18n, interview, path, user);
    if (_isBlank(content)) {
        return null;
    }

    return (
        <div className="survey-section__text">
            {widgetConfig.containsHtml && <div dangerouslySetInnerHTML={{ __html: content as string }} />}
            {!widgetConfig.containsHtml && (
                <Markdown
                    remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
                    className={
                        (widgetConfig.align || 'left') + ' ' + (widgetConfig.classes ? widgetConfig.classes : '')
                    }
                >
                    {content as string}
                </Markdown>
            )}
        </div>
    );
};

export default withTranslation()(Text);
