/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { withTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight }    from '@fortawesome/free-solid-svg-icons/faAngleRight';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import { SurveyContext } from 'evolution-frontend/lib/contexts/SurveyContext';

const SectionNav = function({activeSection, sections, sectionsStatus, onChangeSection, i18n, t, interview, allWidgetsValid, loadingState, startUpdateInterview, user}){
  const { devMode, dispatch } = React.useContext(SurveyContext);
  surveyHelperNew.devLog('%c rendering section nav', 'background: rgba(0,255,255,0.1); font-size: 7px;');

  const sectionShortnames = Object.keys(sections).filter(function(sectionShortname) {
    return (sections[sectionShortname] && !sections[sectionShortname].hiddenInNav && !sections[sectionShortname].isAdmin);
  });

  const enabledStatusBySectionShortname   = {};
  const completedStatusBySectionShortname = {};
  
  const sectionNavLinks       = [];
  let   firstSectionShortname = null;
  for (let i = 0, count = sectionShortnames.length; i < count; i++)
  {
    const sectionShortname         = sectionShortnames[i];
          firstSectionShortname    = firstSectionShortname || sectionShortname;
    const sectionConfig            = sections[sectionShortname];
    const previousSection          = sectionConfig.previousSection;
    const previousSectionEnabled   = enabledStatusBySectionShortname[previousSection];
    const previousSectionCompleted = completedStatusBySectionShortname[previousSection];
    let   enabled                  = (previousSectionEnabled   === false) ? false : true;
    let   completed                = (previousSectionCompleted === false) ? false : true;
    if (enabled && typeof sectionConfig.enableConditional === 'function')
    {
      enabled = sectionConfig.enableConditional(interview);
    }
    else if (enabled && !_isBlank(sectionConfig.enableConditional)) // simple boolean conditional
    {
      enabled = sectionConfig.enableConditional;
    }
    if (completed && typeof sectionConfig.completionConditional === 'function')
    {
      completed = sectionConfig.completionConditional(interview);
    }
    else if (completed && !_isBlank(sectionConfig.completionConditional)) // simple boolean conditional
    {
      completed = sectionConfig.completionConditional;
    }
    
    const parentSection       = sectionConfig.parentSection || sectionShortname;
    const activeSectionConfig = sections[activeSection];
    const activeParentSection = activeSectionConfig.parentSection;
    sectionNavLinks.push(
      <button
        type      = "button"
        key       = {`sectionNavLink__${sectionShortname}`}
        className = {`nav-button${sectionShortname === activeSection || (activeParentSection && activeParentSection === parentSection) ? ' active-section' : ''}${completed === true ? ' completed-section' : ''}`}
        onClick   = {(enabled && loadingState === 0 )? () => onChangeSection(parentSection, activeSection, allWidgetsValid) : null}
        disabled  = {!enabled || loadingState > 0}
      >
        {sectionConfig.menuName[i18n.language]}
      </button>
    );
    if (i < count - 1)
    {
      sectionNavLinks.push(
        <FontAwesomeIcon 
          icon  = {faAngleRight}
          style = {{ marginRight: '0.5rem', marginLeft: '0.5rem'}}
          key   = {`sectionNavLinkArrowSeparator__${sectionShortname}`}
        />
      );
    }
  }

  return (
    <div className="survey-section-nav">
      {sectionNavLinks}
      { process.env.APP_NAME === 'survey' && user
      && (user.isAuthorized({ 'Interviews': ['confirm'] }) || user.is_test  === true)
      && (<React.Fragment> • <button
        type      = "button"
        className = "menu-button _oblique _red"
        key       = {`header__nav-reset`}
        onClick   = {() => startUpdateInterview(activeSection, {responses: {}, validations: {}}, null, null, function() {
          startUpdateInterview(null, {'responses._activeSection': firstSectionShortname});
        })}
      >
        {t('menu:resetInterview')}
      </button> • <button
        type      = "button"
        className = "menu-button _oblique _red"
        key       = {`header__nav-devMode`}
        onClick   = {() => dispatch({ type: 'setDevMode', value: !devMode })}
      >
        {t(devMode ? 'menu:setDevModeOff' : 'menu:setDevModeOn')}
      </button></React.Fragment>)}
    </div>
    
  );
};
 


export default withTranslation()(SectionNav)