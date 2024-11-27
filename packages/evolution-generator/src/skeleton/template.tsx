/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// This is a skeletong template for a questionnaire section template. It is used
// to generate the code for a new section. It can be updated as desired.
import React from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { withSurveyContext, WithSurveyContextProps } from 'evolution-frontend/lib/components/hoc/WithSurveyContextHoc';
import { SectionConfig, UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { SectionProps, useSectionTemplate } from 'evolution-frontend/lib/components/hooks/useSectionTemplate';

export const SegmentsSection: React.FC<SectionProps & WithTranslation & WithSurveyContextProps> = (
    props: SectionProps & WithTranslation & WithSurveyContextProps
) => {
    const { preloaded } = useSectionTemplate(props);

    if (!preloaded)
    {
        return <LoadingPage />;
    }
    
    return (
        <section className={`survey-section survey-section-shortname-${props.shortname}`}>
            <div className="survey-section__content">
                Empty content
            </div>
        </section>
    );
};

export default withTranslation()(withSurveyContext(SegmentsSection));
