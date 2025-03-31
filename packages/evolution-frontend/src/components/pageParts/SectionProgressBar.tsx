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
    const { t, i18n } = useTranslation();

    // Calculate the completion percentage based on the current section index and total sections.
    // The percentage will be 100% when the last section (completed section) is started.
    const maximumCompletionPercentage: number = interview?.responses?._completionPercentage || 0;
    const currentSectionIndex = Object.keys(sections).findIndex((key) => key === shortname) + 1;
    const totalSections = Object.keys(sections).length;
    const currentCompletionPercentage = Number(((currentSectionIndex / totalSections) * 100).toFixed(0));
    const completionPercentage = Math.max(maximumCompletionPercentage, currentCompletionPercentage);

    // Circular progress bar properties
    const radius = 45; // Adjusted radius to fit within 100px diameter
    const strokeWidth = 10; // Adjusted stroke width
    const circumference = 2 * Math.PI * radius; // Circumference of the circle
    const offset = circumference - (completionPercentage / 100) * circumference; // Stroke offset for progress

    return (
        <div className="survey-section__progress-bar">
            {/* Draw a circle with the completion percentage */}
            <svg width="100" height="100" viewBox="0 0 100 100" className="circular-progress">
                <circle className="bg" cx="50" cy="50" r={radius} strokeWidth={strokeWidth} />
                <circle
                    className="fg"
                    cx="50"
                    cy="50"
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
                <text x="50" y="45" textAnchor="middle" className="percentage-text">
                    {completionPercentage}%
                </text>
                <text x="50" y="60" textAnchor="middle" className="completed-text">
                    {t('survey:completed')}
                </text>
            </svg>
            <div className="big-text">{translateString(title, i18n, interview, shortname)} - Section</div>
        </div>
    );
};

export default SectionProgressBar;
