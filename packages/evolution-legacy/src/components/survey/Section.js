/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { withTranslation }      from 'react-i18next';
import React                    from 'react';
import { createBrowserHistory } from 'history';
import _get                     from 'lodash/get';
import _shuffle                 from 'lodash/shuffle';

import sectionTemplate  from './SectionTemplateHOC';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { withSurveyContext } from 'evolution-frontend/lib/components/hoc/WithSurveyContextHoc';
import Text             from 'evolution-frontend/lib/components/survey/Text';
import InfoMap          from 'evolution-frontend/lib/components/survey/InfoMap';
import Button           from 'evolution-frontend/lib/components/survey/Button';
import Question         from 'evolution-frontend/lib/components/survey/Question';
import Group            from './Group';
import LoadingPage      from '../shared/LoadingPage';
import { getPathForSection } from 'evolution-frontend/lib/services/url';

export class Section extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      preloaded: false,
      sortedWidgetShortnames: []
    };

    this.getSortedWidgetShortnames = this.getSortedWidgetShortnames.bind(this);
  }


  componentDidMount() {
    const sortedWidgetShortnames= this.getSortedWidgetShortnames();
    if (typeof this.props.preload === 'function')
    {
      this.props.preload.call(this, this.props.interview, this.props.startUpdateInterview, this.props.startAddGroupedObjects, this.props.startRemoveGroupedObjects, function() {
        this.setState(() => ({
          preloaded: true,
          sortedWidgetShortnames
        }));
      }.bind(this), this.props.user);
    }
    else
    {
      this.setState(() => ({
        preloaded: true,
        sortedWidgetShortnames
      }));
    }
  }

  componentDidUpdate(prevProps) {
    if (!this.props.allWidgetsValid && this.props.submitted && this.props.loadingState === 0)
    {
      const invalidInputs = document.querySelectorAll('.question-invalid input');
      if (invalidInputs.length > 0) {
        // Focus on invalid input if found
        const inputElement = document.getElementById(invalidInputs[0].id);
        if (inputElement) {
          inputElement.focus();
        }
      } else {
        // Otherwise scroll to the position of the first invalid question
        const scrollPosition = _get(document.getElementsByClassName('question-invalid'), '[0].offsetTop', null);
        if (scrollPosition && scrollPosition >= 0)
        {
          window.scrollTo(0,scrollPosition);
        }
      }   
    }
  }

  getSortedWidgetShortnames() {

    let hasRandomOrderWidgets = false;
    let randomGroup = null;
    const randomGroupsIndexes = {};
    const randomGroupsStartIndexes = {};
    const sortedShortnames = [];
    const countWidgets = this.props.widgets.length;
    const unsortedWidgetShortnames = [];

    // shuffle random groups indexes:
    for (let i = 0; i < countWidgets; i++)
    {
      const widgetShortname = this.props.widgets[i];
      const widgetConfig = this.props.surveyContext.widgets[widgetShortname];
      unsortedWidgetShortnames.push(widgetShortname);
      if (widgetConfig === undefined) {
        continue;
      }
      if (widgetConfig.randomOrder === true)
      {
        hasRandomOrderWidgets = true;
        randomGroup = widgetConfig.randomGroup;
        if (!randomGroupsIndexes[randomGroup])
        {
            randomGroupsIndexes[randomGroup] = [];
            randomGroupsStartIndexes[randomGroup] = i;
        }
        randomGroupsIndexes[randomGroup].push(i);
      }
    }
    if (hasRandomOrderWidgets)
    {
        for (const randomGroup in randomGroupsIndexes)
        {
            const randomGroupIndexes = _shuffle(randomGroupsIndexes[randomGroup]);
            for (let j = 0, count = randomGroupIndexes.length; j < count; j++)
            {
                sortedShortnames[randomGroupsStartIndexes[randomGroup] + j] = unsortedWidgetShortnames[randomGroupIndexes[j]];
            }
        }
    }
    for (let i = 0; i < countWidgets; i++)
    {
        if (sortedShortnames[i] === undefined)
        {
            sortedShortnames[i] = unsortedWidgetShortnames[i];
        }
    }
    return sortedShortnames;

  }

  render() {
    if (!this.state.preloaded)
    {
      return <LoadingPage />;
    }
    const history = createBrowserHistory();

    const path = getPathForSection(history.location.pathname, this.props.shortname);
    if (path) {
        history.push(path);
    }

    const widgetsComponentByShortname = {};

    surveyHelper.devLog('%c rendering section ' + this.props.shortname, 'background: rgba(0,0,255,0.1);')
    for (let i = 0, count = this.props.widgets.length; i < count; i++)
    {
      const widgetShortname = this.props.widgets[i];
      surveyHelper.devLog('%c rendering widget ' + widgetShortname, 'background: rgba(0,255,0,0.1);')
      const widgetConfig = this.props.surveyContext.widgets[widgetShortname];
      if (widgetConfig === undefined) {
        console.error(`Widget is undefined: ${widgetShortname}`);
        if (this.props.surveyContext.devMode) {
          widgetsComponentByShortname[widgetShortname] = <div class="apptr__form-container two-columns question-invalid">{`Widget is undefined: ${widgetShortname}`}</div>
        }
        continue;
      }

      const path         = surveyHelper.interpolatePath(this.props.interview, (widgetConfig.path || `${this.props.shortname}.${widgetShortname}`));
      const customPath   = widgetConfig.customPath ? surveyHelper.interpolatePath(this.props.interview, widgetConfig.customPath) : null;
      const widgetStatus = _get(this.props.interview, `widgets.${widgetShortname}`, {});
      const [isServerValid, serverErrorMessage] = this.props.errors && this.props.errors[path] ? [false, this.props.errors[path]]: [true, undefined];
      // Overwrite widget status with server validation data if invalid
      if (!isServerValid) {
        widgetStatus.isValid = false;
        widgetStatus.errorMessage = widgetStatus.errorMessage || serverErrorMessage;
      }

      // check for joined widgets:
      const nextWidgetShortname = this.props.widgets[i + 1];
      const nextWidgetConfig = this.props.surveyContext.widgets[nextWidgetShortname];
      const nextWidgetStatus = nextWidgetShortname ? _get(this.props.interview, `widgets.${nextWidgetShortname}`, {}) : undefined;
      const join = nextWidgetStatus && ((nextWidgetConfig.joinWith === widgetShortname && nextWidgetStatus.isVisible) || (widgetConfig.joinWith === nextWidgetShortname && nextWidgetStatus.isVisible));

      const defaultProps = {
        path                       : path,
        customPath                 : customPath,
        key                        : path,
        shortname                  : widgetShortname,
        loadingState               : this.props.loadingState,
        groupShortname             : null,
        groupedObjectId            : null,
        widgetConfig               : widgetConfig,
        join                       : join,
        widgetStatus               : widgetStatus,
        section                    : this.props.shortname,
        interview                  : this.props.interview,
        user                       : this.props.user,
        openQuestionModal          : this.props.openQuestionModal,
        closeQuestionModal         : this.props.closeQuestionModal,
        openConfirmModal           : this.props.openConfirmModal,
        closeConfirmModal          : this.props.closeConfirmModal,
        confirmModalOpenedShortname: this.props.confirmModalOpenedShortname,
        isInsideModal              : this.props.isInsideModal,
        questionModalPath          : this.props.questionModalPath,
        startUpdateInterview       : this.props.startUpdateInterview,
        startAddGroupedObjects     : this.props.startAddGroupedObjects,
        startRemoveGroupedObjects  : this.props.startRemoveGroupedObjects
      };

      if (typeof widgetConfig.type === 'function') // custom widget component
      {
        const WidgetComponent = widgetConfig.type();
        widgetsComponentByShortname[widgetShortname] = <WidgetComponent {...defaultProps}
          groupConfig                     = {this.props.groups[widgetShortname]}
          parentObjectIds                 = {{}}
        />;
      }
      else
      {
        switch(widgetConfig.type)
        {
          case 'text':              widgetsComponentByShortname[widgetShortname] = <Text            {...defaultProps} />; break;
          case 'infoMap':           widgetsComponentByShortname[widgetShortname] = <InfoMap         {...defaultProps} />; break;
          case 'button':            widgetsComponentByShortname[widgetShortname] = <Button          {...defaultProps} />; break;
          case 'question':          widgetsComponentByShortname[widgetShortname] = <Question        {...defaultProps} />; break;
          case 'group':             widgetsComponentByShortname[widgetShortname] = <Group           {...defaultProps}
            groupConfig                     = {this.props.groups[widgetShortname]}
            groupsConfig                    = {this.props.groups}
            parentObjectIds                 = {{}}
          />; break;
        }
      }
    }

    const sortedWidgetsComponents = [];
    for (let i = 0, count = this.state.sortedWidgetShortnames.length; i < count; i++)
    {
        sortedWidgetsComponents.push(widgetsComponentByShortname[this.state.sortedWidgetShortnames[i]]);
    }

    return (
      <section className = {`survey-section survey-section-shortname-${this.props.shortname}`}>
        <div className="survey-section__content">
          {sortedWidgetsComponents}
        </div>
      </section>
    );
  }
}


export default withTranslation()(sectionTemplate(withSurveyContext(Section)))