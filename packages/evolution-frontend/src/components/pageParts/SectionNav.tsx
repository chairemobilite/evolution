/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight } from '@fortawesome/free-solid-svg-icons/faAngleRight';

import { SurveyContext } from '../../contexts/SurveyContext';
import { SurveySections, UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { devLog, parseBoolean, translateString } from 'evolution-common/lib/utils/helpers';
import { RootState } from '../../store/configureStore';

type SectionNavProps = {
    activeSection: string;
    sections: SurveySections;
    onChangeSection: (
        parentSection: string,
        activeSection: string,
        allWidgetsValid: boolean,
        e?: React.FormEvent<HTMLFormElement>
    ) => void;
    interview: UserRuntimeInterviewAttributes;
    allWidgetsValid: boolean;
    user: CliUser;
};

const SectionNav = function ({
    activeSection,
    sections,
    onChangeSection,
    interview,
    allWidgetsValid,
    user
}: SectionNavProps) {
    const { devMode, dispatch } = React.useContext(SurveyContext);
    const { i18n, t } = useTranslation();
    const loadingState = useSelector((state: RootState) => state.loadingState.loadingState);
    devLog('%c rendering section nav', 'background: rgba(0,255,255,0.1); font-size: 7px;');

    const sectionShortnames = Object.keys(sections);

    const completedStatusBySectionShortname = {};

    const sectionNavLinks: React.ReactNode[] = [];
    let firstSectionShortname: string | null = null;
    // Determine which section is the active one in the menu for the navigation
    const activeSectionConfig = sections[activeSection];
    const activeMenuSection =
        activeSectionConfig.navMenu.type === 'inNav' ? activeSection : activeSectionConfig.navMenu.parentSection;
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

        // Display in the navigation if the section is a top-level one
        if (sectionConfig.navMenu.type === 'inNav') {
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
                    className={`nav-button${sectionShortname === activeMenuSection ? ' active-section' : ''}${completed === true ? ' completed-section' : ''}`}
                    onClick={
                        enabled && loadingState === 0
                            ? () => onChangeSection(sectionShortname, activeSection, allWidgetsValid)
                            : () => {
                                return;
                            }
                    }
                    disabled={!enabled || loadingState > 0}
                >
                    {translateString(sectionConfig.navMenu.menuName, i18n, interview, sectionShortname)}
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

export default SectionNav;
