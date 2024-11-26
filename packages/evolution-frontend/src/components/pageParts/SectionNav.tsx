/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight } from '@fortawesome/free-solid-svg-icons/faAngleRight';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { SurveyContext } from '../../contexts/SurveyContext';
import { SectionConfig, UserFrontendInterviewAttributes } from '../../services/interviews/interview';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { devLog, parseBoolean, StartUpdateInterview, translateString } from 'evolution-common/lib/utils/helpers';

type SectionNavProps = {
    activeSection: string;
    sections: { [sectionShortname: string]: SectionConfig };
    onChangeSection: (
        parentSection: string,
        activeSection: string,
        allWidgetsValid: boolean,
        e?: React.FormEvent<HTMLFormElement>
    ) => void;
    interview: UserFrontendInterviewAttributes;
    allWidgetsValid: boolean;
    loadingState: number;
    startUpdateInterview: StartUpdateInterview;
    user: CliUser;
} & WithTranslation;

const SectionNav = function ({
    activeSection,
    sections,
    onChangeSection,
    i18n,
    t,
    interview,
    allWidgetsValid,
    loadingState,
    startUpdateInterview,
    user
}: SectionNavProps) {
    const { devMode, dispatch } = React.useContext(SurveyContext);
    devLog('%c rendering section nav', 'background: rgba(0,255,255,0.1); font-size: 7px;');

    const sectionShortnames = Object.keys(sections);

    const completedStatusBySectionShortname = {};

    const sectionNavLinks: React.ReactNode[] = [];
    let firstSectionShortname: string | null = null;
    // FIXME Extract the sections to navigate and their status to a function, but not now as we may revisit the structure of the survey flow
    for (let i = 0, count = sectionShortnames.length; i < count; i++) {
        const sectionShortname = sectionShortnames[i];
        firstSectionShortname = firstSectionShortname || sectionShortname;
        const sectionConfig = sections[sectionShortname];
        const previousSection: string | null = sectionConfig.previousSection;
        const previousSectionCompleted = previousSection ? !!completedStatusBySectionShortname[previousSection] : true;
        const enabled =
            previousSectionCompleted === false
                ? false
                : parseBoolean(sectionConfig.enableConditional, interview, sectionShortname); // previous section must be completed
        const completed =
            previousSectionCompleted === false
                ? false
                : parseBoolean(sectionConfig.completionConditional, interview, sectionShortname);

        completedStatusBySectionShortname[sectionShortname] = completed;

        const parentSection = sectionConfig.parentSection || sectionShortname;
        const activeSectionConfig = sections[activeSection];
        const activeParentSection = activeSectionConfig.parentSection;
        // Display in the navigation if the section is a top-level one
        if (sectionConfig.parentSection === undefined) {
            // Add a separator before adding the link if it is not the first section
            if (sectionNavLinks.length > 0) {
                sectionNavLinks.push(
                    <FontAwesomeIcon
                        icon={faAngleRight}
                        style={{ marginRight: '0.5rem', marginLeft: '0.5rem' }}
                        key={`sectionNavLinkArrowSeparator__${sectionShortname}`}
                    />
                );
            }
            sectionNavLinks.push(
                <button
                    type="button"
                    key={`sectionNavLink__${sectionShortname}`}
                    className={`nav-button${sectionShortname === activeSection || (activeParentSection && activeParentSection === parentSection) ? ' active-section' : ''}${completed === true ? ' completed-section' : ''}`}
                    onClick={
                        enabled && loadingState === 0
                            ? () => onChangeSection(parentSection, activeSection, allWidgetsValid)
                            : () => {
                                return;
                            }
                    }
                    disabled={!enabled || loadingState > 0}
                >
                    {translateString(sectionConfig.menuName, i18n, interview, sectionShortname)}
                </button>
            );
        }
    }

    return (
        <div className="survey-section-nav">
            {sectionNavLinks}
            {user && user.isAuthorized({ Interviews: ['confirm'] }) && (
                <React.Fragment>
                    {' '}
                    •{' '}
                    <button
                        type="button"
                        className="menu-button _oblique _red"
                        key={'header__nav-devMode'}
                        onClick={() => dispatch({ type: 'setDevMode', value: !devMode })}
                    >
                        {t(devMode ? 'menu:setDevModeOff' : 'menu:setDevModeOn')}
                    </button>
                </React.Fragment>
            )}
        </div>
    );
};

export default withTranslation()(SectionNav);
