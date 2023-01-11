/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { withTranslation } from 'react-i18next';
import Markdown            from 'react-markdown';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as surveyHelper from 'evolution-frontend/lib/utils/helpers';

export const Text = ({widgetConfig, widgetStatus, i18n, interview, path, user}) => {

  if(!widgetStatus.isVisible)
  {
    return null;
  }

  const content = surveyHelper.parseString(widgetConfig.text[i18n.language] || widgetConfig.text, interview, path, user);
  if (_isBlank(content))
  {
    return null;
  }

  return (<div className="survey-section__text">
    { widgetConfig.containsHtml && <div 
      dangerouslySetInnerHTML={{__html: content}}
    />}
    {!widgetConfig.containsHtml && <Markdown 
      className = {(widgetConfig.align || 'left') + ' ' + (widgetConfig.classes ? widgetConfig.classes : '')}
      source    = {content} 
    />}
  </div>);
};

export default withTranslation()(Text)