import React from 'react';
import { useTranslation } from 'react-i18next';

import { I18nData } from 'evolution-common/lib/services/questionnaire/types';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { translateString } from 'evolution-common/lib/utils/helpers';

type SectionProgressBarProps = {
    title: I18nData;
    interview: UserInterviewAttributes;
    shortname: string;
    sections: { [key: string]: any };
};

// Section Progress Bar Component to show the completion percentage of the survey and the section title
const SectionProgressBar: React.FC<SectionProgressBarProps> = ({ title, interview, shortname, sections }) => {
    const { i18n } = useTranslation();

    // Calculate the completion percentage based on the current section index and total sections.
    // The percentage will be 100% when the last section (completed section) is started.
    const maximumCompletionPercentage: number = interview?.responses?._completionPercentage || 0;
    const currentSectionIndex = Object.keys(sections).findIndex((key) => key === shortname) + 1;
    const totalSections = Object.keys(sections).length;
    const currentCompletionPercentage = Number(((currentSectionIndex / totalSections) * 100).toFixed(0));
    const completionPercentage = Math.max(maximumCompletionPercentage, currentCompletionPercentage);

    return (
        <div className="survey-section__progress-bar">
            {completionPercentage}% completed - {translateString(title, i18n, interview, shortname)} - Section
        </div>
    );
};

export default SectionProgressBar;
